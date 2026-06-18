from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse

from apps.core.models import Business
from apps.leads.models import Customer, Lead


@override_settings(ANTHROPIC_API_KEY="", OPENAI_API_KEY="", GEMINI_API_KEY="", GROQ_API_KEY="")
class ManualLeadCreateTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="lead-user", password="secret")
        self.client.force_login(self.user)
        self.business = Business.objects.create(name="Lead Co", slug="lead-co")
        self.url = reverse("lead-list")

    def test_creates_lead_with_customer_fields(self):
        res = self.client.post(
            self.url,
            data={
                "customer_name": "Jordan Miles",
                "customer_phone": "+15550101010",
                "customer_email": "jordan@example.test",
                "project_summary": "Replace leaking water heater",
                "estimated_value": "1800.00",
                "status": "new",
                "idempotency_key": "manual-123",
            },
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 201)
        lead = Lead.objects.get()
        self.assertEqual(lead.business, self.business)
        self.assertEqual(lead.customer.name, "Jordan Miles")
        self.assertEqual(lead.customer.phone, "+15550101010")
        self.assertEqual(lead.project_summary, "Replace leaking water heater")
        self.assertEqual(lead.extracted_fields["manual_idempotency_key"], "manual-123")

    def test_repeated_idempotency_key_returns_existing_lead(self):
        payload = {
            "customer_name": "Sam Rivera",
            "customer_phone": "+15550202020",
            "project_summary": "AC tune up",
            "idempotency_key": "retry-key",
        }

        first = self.client.post(self.url, data=payload, content_type="application/json")
        second = self.client.post(self.url, data=payload, content_type="application/json")

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(Customer.objects.count(), 1)
        self.assertEqual(first.json()["id"], second.json()["id"])

    def test_requires_customer_contact_and_summary(self):
        res = self.client.post(
            self.url,
            data={"customer_name": "", "project_summary": ""},
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 400)
        self.assertEqual(Lead.objects.count(), 0)
