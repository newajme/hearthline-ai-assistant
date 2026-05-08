"""Google Gemini tool-calling loop — mirrors openai_loop.py.

Uses the google-generativeai SDK. Tool schemas are translated from Anthropic
format (used internally) to Gemini's function-declaration format on the fly.
"""
from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.0-flash"


def _tools_for_gemini(tools: list[dict]) -> list[dict]:
    """Convert Anthropic-format tool schemas to Gemini function declarations."""
    declarations = []
    for t in tools:
        schema = t.get("input_schema", {"type": "object", "properties": {}})
        # Gemini doesn't accept 'required' inside nested property schemas
        clean_schema = _clean_schema(schema)
        declarations.append({
            "name": t["name"],
            "description": t.get("description", ""),
            "parameters": clean_schema,
        })
    return declarations


def _clean_schema(schema: dict) -> dict:
    """Recursively remove keys Gemini rejects (additionalProperties, $schema, etc.)."""
    allowed = {"type", "description", "properties", "required", "items", "enum"}
    out = {k: v for k, v in schema.items() if k in allowed}
    if "properties" in out:
        out["properties"] = {
            k: _clean_schema(v) for k, v in out["properties"].items()
        }
    if "items" in out:
        out["items"] = _clean_schema(out["items"])
    return out


def run_gemini_loop(
    api_key: str,
    *,
    system_prompt: str,
    tools: list[dict],
    conversation_history: list[dict],
    execute_tool,
) -> dict[str, Any]:
    """Run the Gemini agentic loop. Returns {text, end_call}."""
    try:
        import google.generativeai as genai
    except ImportError:
        logger.error("google-generativeai not installed — run: pip install google-generativeai")
        return {
            "text": "My AI brain isn't connected right now. Please call back in a moment.",
            "end_call": False,
        }

    genai.configure(api_key=api_key)

    tool_declarations = _tools_for_gemini(tools)
    gemini_tools = [{"function_declarations": tool_declarations}]

    # Convert conversation history to Gemini format
    gemini_history = _to_gemini_history(conversation_history)

    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=system_prompt,
        tools=gemini_tools,
    )

    chat = model.start_chat(history=gemini_history[:-1] if gemini_history else [])

    # Send the last user message
    last_user_text = _last_user_text(conversation_history)

    should_end = False
    last_tool: str | None = None

    response = chat.send_message(last_user_text or "Hello")

    # Agentic loop — keep calling tools until the model returns plain text
    for _ in range(10):  # max 10 tool rounds per turn
        part = response.candidates[0].content.parts[0] if response.candidates else None
        if part is None:
            break

        # Check for function call
        if hasattr(part, "function_call") and part.function_call.name:
            fc = part.function_call
            name = fc.name
            try:
                tool_input = dict(fc.args)
            except Exception:
                tool_input = {}

            if name == "end_call":
                logger.info("[END_CALL gemini] reason=%s", tool_input.get("reason", "unknown"))
                should_end = True
                # Send tool result back
                response = chat.send_message({
                    "role": "tool",
                    "parts": [{"function_response": {"name": name, "response": {"ok": True}}}],
                })
                break

            last_tool = name
            logger.info("[TOOL gemini] %s %s", name, json.dumps(tool_input, default=str))
            try:
                result = execute_tool(name, tool_input)
            except Exception as exc:  # noqa: BLE001
                logger.error("[TOOL ERROR gemini] %s: %s", name, exc)
                result = {"error": str(exc)}
            logger.info("[RESULT gemini] %s", json.dumps(result, default=str))

            # Feed result back to model
            import google.generativeai.types as genai_types
            response = chat.send_message(
                genai_types.content_types.to_contents({
                    "parts": [{
                        "function_response": {
                            "name": name,
                            "response": result,
                        }
                    }]
                })
            )
        else:
            # Plain text response — we're done
            break

    # Extract final text
    try:
        text = response.text.strip()
    except Exception:
        text = ""

    if not text and last_tool:
        if last_tool in ("book_appointment", "send_sms"):
            text = "You're all set! Anything else I can help with?"
        else:
            text = "Is there anything else I can help you with?"

    return {"text": text, "end_call": should_end}


def _last_user_text(history: list[dict]) -> str:
    for m in reversed(history):
        if m.get("role") == "user" and isinstance(m.get("content"), str):
            return m["content"]
    return ""


def _to_gemini_history(history: list[dict]) -> list[dict]:
    """Convert Claude-format history to Gemini Content objects."""
    out = []
    for m in history:
        role = m.get("role")
        content = m.get("content")
        if isinstance(content, str) and content.strip():
            gemini_role = "user" if role == "user" else "model"
            out.append({"role": gemini_role, "parts": [{"text": content}]})
    return out
