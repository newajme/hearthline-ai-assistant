import json
import sys
import types
from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase, override_settings

from apps.ai.services import extract_lead_from_transcript
from apps.core.models import Business


TRANSCRIPT = "Caller Jane needs urgent HVAC repair at 10 Main St."


def payload(**overrides):
    data = {
        "customer_name": "Jane Doe",
        "customer_email": "jane@example.test",
        "address": "10 Main St",
        "project_summary": "Urgent HVAC repair",
        "trade": "hvac",
        "urgency": "emergency",
        "temperature": "hot",
        "estimated_value": 450,
        "follow_up_actions": ["Call back today"],
    }
    data.update(overrides)
    return data


class LeadExtractionProviderTests(TestCase):
    def business(self, provider: str, **keys) -> Business:
        data = {
            "name": f"{provider} Business",
            "slug": f"{provider}-business",
            "llm_provider": provider,
            **keys,
        }
        return Business.objects.create(**data)

    @override_settings(ANTHROPIC_API_KEY="", OPENAI_API_KEY="", GEMINI_API_KEY="", GROQ_API_KEY="")
    def test_claude_extracts_and_normalizes(self):
        seen = {}

        class FakeAnthropicClient:
            def __init__(self, api_key):
                seen["api_key"] = api_key
                self.messages = self

            def create(self, **kwargs):
                seen["model"] = kwargs["model"]
                return SimpleNamespace(
                    content=[SimpleNamespace(text=json.dumps(payload(project_summary="x" * 400)))]
                )

        fake_anthropic = types.ModuleType("anthropic")
        fake_anthropic.Anthropic = FakeAnthropicClient
        biz = self.business("anthropic", anthropic_api_key="claude-secret")

        with patch.dict(sys.modules, {"anthropic": fake_anthropic}):
            result = extract_lead_from_transcript(TRANSCRIPT, business=biz)

        self.assertEqual(seen["api_key"], "claude-secret")
        self.assertEqual(seen["model"], "claude-sonnet-4-6")
        self.assertEqual(result["customer_name"], "Jane Doe")
        self.assertEqual(result["trade"], "hvac")
        self.assertEqual(len(result["project_summary"]), 280)
        self.assertNotIn("extraction_error", result)

    @override_settings(ANTHROPIC_API_KEY="", OPENAI_API_KEY="openai-env-key", GEMINI_API_KEY="", GROQ_API_KEY="")
    def test_openai_uses_matching_env_fallback(self):
        seen = {}

        class FakeOpenAIClient:
            def __init__(self, **kwargs):
                seen["client_kwargs"] = kwargs
                self.chat = SimpleNamespace(completions=self)

            def create(self, **kwargs):
                seen["model"] = kwargs["model"]
                seen["response_format"] = kwargs["response_format"]
                message = SimpleNamespace(content=json.dumps(payload(estimated_value="725.50")))
                return SimpleNamespace(choices=[SimpleNamespace(message=message)])

        fake_openai = types.ModuleType("openai")
        fake_openai.OpenAI = FakeOpenAIClient
        biz = self.business("openai")

        with patch.dict(sys.modules, {"openai": fake_openai}):
            result = extract_lead_from_transcript(TRANSCRIPT, business=biz)

        self.assertEqual(seen["client_kwargs"], {"api_key": "openai-env-key"})
        self.assertEqual(seen["model"], "gpt-4o")
        self.assertEqual(seen["response_format"], {"type": "json_object"})
        self.assertEqual(result["estimated_value"], 725.50)
        self.assertNotIn("extraction_error", result)

    @override_settings(ANTHROPIC_API_KEY="anthropic-only", OPENAI_API_KEY="", GEMINI_API_KEY="", GROQ_API_KEY="")
    def test_gemini_missing_key_does_not_use_other_provider_key(self):
        biz = self.business("gemini")

        result = extract_lead_from_transcript(TRANSCRIPT, business=biz)

        self.assertEqual(result["project_summary"], "")
        self.assertEqual(result["extraction_error"], "Missing Google Gemini API key configuration.")
        self.assertNotIn("anthropic-only", str(result))

    @override_settings(ANTHROPIC_API_KEY="", OPENAI_API_KEY="", GEMINI_API_KEY="gemini-env-key", GROQ_API_KEY="")
    def test_gemini_extracts_with_sdk(self):
        seen = {}

        class FakeGeminiModel:
            def __init__(self, **kwargs):
                seen["model_kwargs"] = kwargs

            def generate_content(self, transcript, generation_config=None):
                seen["transcript"] = transcript
                seen["generation_config"] = generation_config
                return SimpleNamespace(text=json.dumps(payload(trade="unknown", follow_up_actions=["A", "B", "C", "D"])))

        fake_genai = types.ModuleType("google.generativeai")
        fake_genai.configure = lambda **kwargs: seen.update({"configure": kwargs})
        fake_genai.GenerativeModel = FakeGeminiModel
        fake_google = types.ModuleType("google")
        fake_google.generativeai = fake_genai
        biz = self.business("gemini")

        with patch.dict(sys.modules, {"google": fake_google, "google.generativeai": fake_genai}):
            result = extract_lead_from_transcript(TRANSCRIPT, business=biz)

        self.assertEqual(seen["configure"], {"api_key": "gemini-env-key"})
        self.assertEqual(seen["model_kwargs"]["model_name"], "gemini-2.0-flash")
        self.assertEqual(seen["generation_config"], {"response_mime_type": "application/json"})
        self.assertEqual(result["trade"], "other")
        self.assertEqual(result["follow_up_actions"], ["A", "B", "C"])
        self.assertNotIn("extraction_error", result)

    @override_settings(ANTHROPIC_API_KEY="", OPENAI_API_KEY="", GEMINI_API_KEY="", GROQ_API_KEY="")
    def test_groq_extracts_with_openai_compatible_client(self):
        seen = {}

        class FakeOpenAIClient:
            def __init__(self, **kwargs):
                seen["client_kwargs"] = kwargs
                self.chat = SimpleNamespace(completions=self)

            def create(self, **kwargs):
                seen["model"] = kwargs["model"]
                message = SimpleNamespace(content=json.dumps(payload()))
                return SimpleNamespace(choices=[SimpleNamespace(message=message)])

        fake_openai = types.ModuleType("openai")
        fake_openai.OpenAI = FakeOpenAIClient
        biz = self.business("groq", groq_api_key="groq-secret")

        with patch.dict(sys.modules, {"openai": fake_openai}):
            result = extract_lead_from_transcript(TRANSCRIPT, business=biz)

        self.assertEqual(seen["client_kwargs"], {
            "api_key": "groq-secret",
            "base_url": "https://api.groq.com/openai/v1",
        })
        self.assertEqual(seen["model"], "llama-3.3-70b-versatile")
        self.assertEqual(result["customer_name"], "Jane Doe")
        self.assertNotIn("extraction_error", result)

    @override_settings(ANTHROPIC_API_KEY="", OPENAI_API_KEY="", GEMINI_API_KEY="", GROQ_API_KEY="")
    def test_missing_openai_key_returns_sanitized_error(self):
        biz = self.business("openai")

        result = extract_lead_from_transcript(TRANSCRIPT, business=biz)

        self.assertEqual(result["extraction_error"], "Missing OpenAI API key configuration.")
        self.assertNotIn("sk-secret", str(result))

    @override_settings(ANTHROPIC_API_KEY="", OPENAI_API_KEY="", GEMINI_API_KEY="", GROQ_API_KEY="")
    def test_malformed_provider_response_returns_sanitized_error(self):
        secret = "sk-test-secret-that-must-not-leak"

        class FakeOpenAIClient:
            def __init__(self, **kwargs):
                self.chat = SimpleNamespace(completions=self)

            def create(self, **kwargs):
                message = SimpleNamespace(content="not json")
                return SimpleNamespace(choices=[SimpleNamespace(message=message)])

        fake_openai = types.ModuleType("openai")
        fake_openai.OpenAI = FakeOpenAIClient
        biz = self.business("openai", openai_api_key=secret)

        with patch.dict(sys.modules, {"openai": fake_openai}):
            result = extract_lead_from_transcript(TRANSCRIPT, business=biz)

        self.assertEqual(result["customer_name"], "")
        self.assertEqual(result["extraction_error"], "OpenAI lead extraction failed.")
        self.assertNotIn(secret, str(result))
