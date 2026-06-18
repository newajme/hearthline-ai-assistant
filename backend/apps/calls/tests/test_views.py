"""Smoke tests for the Vapi-facing webhook + custom-LLM endpoints."""
from unittest.mock import patch

from django.test import TestCase
from django.test import override_settings
from django.urls import reverse

from apps.core.models import Business


class ChatCompletionsAuthTests(TestCase):
    def setUp(self):
        Business.objects.create(name="Acme HVAC", slug="acme")
        self.url = reverse("vapi-chat-completions")

    def test_rejects_get(self):
        self.assertEqual(self.client.get(self.url).status_code, 405)

    def test_accepts_when_no_secret_configured(self):
        # Dev mode: VAPI_WEBHOOK_SECRET unset → endpoint open.
        with patch("apps.calls.views.handle_conversation_turn") as mock_turn:
            mock_turn.return_value = {"text": "Hi, this is Demi.", "end_call": False}
            res = self.client.post(
                self.url,
                data='{"messages":[{"role":"user","content":"hello"}]}',
                content_type="application/json",
            )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["choices"][0]["message"]["content"], "Hi, this is Demi.")

    def test_rejects_when_secret_configured_and_missing(self):
        with self.settings(VAPI_WEBHOOK_SECRET="topsecret"):
            res = self.client.post(self.url, data="{}", content_type="application/json")
        self.assertEqual(res.status_code, 401)

    def test_accepts_when_bearer_matches(self):
        with self.settings(VAPI_WEBHOOK_SECRET="topsecret"), \
             patch("apps.calls.views.handle_conversation_turn") as mock_turn:
            mock_turn.return_value = {"text": "ok", "end_call": False}
            res = self.client.post(
                self.url,
                data='{"messages":[{"role":"user","content":"hi"}]}',
                content_type="application/json",
                HTTP_AUTHORIZATION="Bearer topsecret",
            )
        self.assertEqual(res.status_code, 200)

    @override_settings(ANTHROPIC_API_KEY="anthropic-env", OPENAI_API_KEY="", GEMINI_API_KEY="", GROQ_API_KEY="")
    def test_selected_provider_without_key_returns_structured_configuration_error(self):
        Business.objects.all().delete()
        Business.objects.create(name="OpenAI Co", slug="openai-co", llm_provider="openai")

        res = self.client.post(
            self.url,
            data='{"messages":[{"role":"user","content":"hello"}]}',
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 409)
        body = res.json()
        self.assertEqual(body["error"]["code"], "ai_provider_unconfigured")
        self.assertEqual(body["error"]["provider"], "openai")
        self.assertEqual(body["error"]["message"], "Connect your AI provider before testing Demi.")
        self.assertNotIn("Demi here", str(body))


class VapiWebhookTests(TestCase):
    def setUp(self):
        self.business = Business.objects.create(name="Acme HVAC", slug="acme")
        self.url = reverse("vapi-webhook")

    def test_end_of_call_report_persists_call(self):
        payload = {
            "message": {
                "type": "end-of-call-report",
                "transcript": "Hi, I need help with my furnace.",
                "summary": "Caller has a furnace issue, lead qualified.",
                "call": {"id": "vapi-call-1", "duration": 42,
                          "customer": {"number": "+15551234567"}},
            },
        }
        res = self.client.post(self.url, data=payload, content_type="application/json")
        self.assertEqual(res.status_code, 200)
        from apps.calls.models import Call
        call = Call.objects.get(provider_call_id="vapi-call-1")
        self.assertEqual(call.status, "completed")
        self.assertEqual(call.from_number, "+15551234567")
        self.assertIn("furnace", call.summary)
