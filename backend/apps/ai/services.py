"""AI service layer.

One pipeline:
  - extract_lead_from_transcript — turns a call transcript into structured lead data.

Uses the business-selected provider with per-business keys first and matching
server env vars as fallbacks.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from .providers import (
    missing_key_message,
    resolve_api_key,
    resolve_model,
    resolve_provider,
)

logger = logging.getLogger(__name__)


CLAUDE_MODEL = "claude-sonnet-4-6"
OPENAI_TEXT_MODEL = "gpt-4o"
GEMINI_MODEL = "gemini-2.0-flash"
GROQ_MODEL = "llama-3.3-70b-versatile"


def _resolve_business():
    """Get the active business — single-tenant for now, first row wins."""
    from apps.core.models import Business
    return Business.objects.first()


# ---------------------------------------------------------------------------
# 1. Transcript → structured lead
# ---------------------------------------------------------------------------

EXTRACTION_PROMPT = """You are the operations assistant for a home-services business.
Read the call transcript and return a strict JSON object with these keys:

  customer_name      string (best guess, "" if unknown)
  customer_email     string ("" if not given)
  address            string ("" if not given)
  project_summary    string, ≤ 280 chars, plain English
  trade              one of: hvac, plumbing, windows, doors, roofing, solar, renovation, other
  urgency            one of: emergency, this_week, this_month, planning
  temperature        one of: hot, warm, cold
  estimated_value    number, USD, your best honest guess based on the work described, or null
  follow_up_actions  array of strings, max 3 items

Return ONLY the JSON object. No prose, no code fences."""


def extract_lead_from_transcript(transcript: str, business=None) -> dict[str, Any]:
    """Run the configured LLM over the transcript and return structured lead data.

    Falls back to an empty, safely annotated stub when configuration or provider
    output is invalid so the rest of the pipeline keeps working in local dev.
    """
    if not transcript.strip():
        return _empty_extract()

    biz = business or _resolve_business()
    provider = resolve_provider(biz)
    model = resolve_model(provider, biz)
    api_key = resolve_api_key(provider, biz)
    kb = (biz.knowledge_base if biz else "") or ""
    system = EXTRACTION_PROMPT
    if kb:
        system += "\n\nBusiness knowledge base:\n" + kb[:4000]

    if not api_key:
        logger.info("%s key missing — returning stub lead extract", provider.label)
        return _empty_extract(missing_key_message(provider))

    try:
        if provider.name == "openai":
            raw = _extract_with_openai(api_key, model, system, transcript)
        elif provider.name == "groq":
            raw = _extract_with_openai(
                api_key, model, system, transcript, base_url=provider.openai_base_url,
            )
        elif provider.name == "gemini":
            raw = _extract_with_gemini(api_key, model, system, transcript)
        else:
            raw = _extract_with_claude(api_key, model, system, transcript)
    except ImportError:
        logger.warning("%s SDK not installed", provider.label)
        return _empty_extract(f"{provider.label} SDK is not installed.")
    except Exception as exc:  # noqa: BLE001
        logger.warning("%s lead extract failed: %s", provider.label, exc.__class__.__name__)
        return _empty_extract(f"{provider.label} lead extraction failed.")

    return _normalize_extract(raw)


def _extract_with_claude(api_key: str, model: str, system: str, transcript: str) -> dict[str, Any]:
    import anthropic  # noqa: WPS433

    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model=model,
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": transcript[:16000]}],
    )
    text = "".join(block.text for block in msg.content if hasattr(block, "text"))
    return _loads_extract_json(text)


def _extract_with_openai(
    api_key: str,
    model: str,
    system: str,
    transcript: str,
    *,
    base_url: str = "",
) -> dict[str, Any]:
    import openai  # noqa: WPS433

    kwargs = {"api_key": api_key}
    if base_url:
        kwargs["base_url"] = base_url
    client = openai.OpenAI(**kwargs)
    resp = client.chat.completions.create(
        model=model,
        max_tokens=1024,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": transcript[:16000]},
        ],
    )
    content = resp.choices[0].message.content or ""
    return _loads_extract_json(content)


def _extract_with_gemini(api_key: str, model: str, system: str, transcript: str) -> dict[str, Any]:
    import google.generativeai as genai  # noqa: WPS433

    genai.configure(api_key=api_key)
    client = genai.GenerativeModel(model_name=model, system_instruction=system)
    response = client.generate_content(
        transcript[:16000],
        generation_config={"response_mime_type": "application/json"},
    )
    return _loads_extract_json(_gemini_text(response))


def _empty_extract(error: str | None = None) -> dict[str, Any]:
    out: dict[str, Any] = {
        "customer_name": "",
        "customer_email": "",
        "address": "",
        "project_summary": "",
        "trade": "other",
        "urgency": "planning",
        "temperature": "warm",
        "estimated_value": None,
        "follow_up_actions": [],
    }
    if error:
        out["extraction_error"] = error
    return out


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _strip_fences(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = t.lstrip("`")
        # drop optional language tag like "json"
        if "\n" in t:
            t = t.split("\n", 1)[1]
        if t.endswith("```"):
            t = t[:-3]
    return t.strip()


def _loads_extract_json(text: str) -> dict[str, Any]:
    data = json.loads(_strip_fences(text or ""))
    if not isinstance(data, dict):
        raise ValueError("provider returned non-object JSON")
    return data


def _gemini_text(response) -> str:
    text = getattr(response, "text", "")
    if text:
        return text
    parts: list[str] = []
    for candidate in getattr(response, "candidates", []) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", []) or []:
            part_text = getattr(part, "text", "")
            if part_text:
                parts.append(part_text)
    return "".join(parts)


def _normalize_extract(raw: dict[str, Any]) -> dict[str, Any]:
    try:
        out = _empty_extract()
        out["customer_name"] = _clean_str(raw.get("customer_name"), max_len=200)
        out["customer_email"] = _clean_str(raw.get("customer_email"), max_len=254)
        out["address"] = _clean_str(raw.get("address"), max_len=255)
        out["project_summary"] = _clean_str(raw.get("project_summary"), max_len=280)
        out["trade"] = _choice(raw.get("trade"), {
            "hvac", "plumbing", "windows", "doors", "roofing", "solar", "renovation", "other",
        }, "other")
        out["urgency"] = _choice(raw.get("urgency"), {
            "emergency", "this_week", "this_month", "planning",
        }, "planning")
        out["temperature"] = _choice(raw.get("temperature"), {"hot", "warm", "cold"}, "warm")
        out["estimated_value"] = _clean_number(raw.get("estimated_value"))
        out["follow_up_actions"] = _clean_actions(raw.get("follow_up_actions"))
        return out
    except Exception:  # noqa: BLE001
        logger.warning("Provider returned malformed lead extract")
        return _empty_extract("Provider returned malformed lead data.")


def _clean_str(value: Any, *, max_len: int) -> str:
    if value is None:
        return ""
    return str(value).strip()[:max_len]


def _choice(value: Any, allowed: set[str], default: str) -> str:
    candidate = _clean_str(value, max_len=64).lower()
    return candidate if candidate in allowed else default


def _clean_number(value: Any) -> float | int | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return value
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def _clean_actions(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [_clean_str(item, max_len=160) for item in value[:3] if _clean_str(item, max_len=160)]

