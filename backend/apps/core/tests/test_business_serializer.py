import hashlib

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.core.models import Business
from apps.core.serializers import BusinessSerializer
from apps.core.views import REVEALABLE_FIELDS, RevealKeyView


PROVIDER_KEYS = (
    "anthropic_api_key",
    "openai_api_key",
    "gemini_api_key",
    "groq_api_key",
)


EMPTY_PROVIDER_ENV = {
    "ANTHROPIC_API_KEY": "",
    "OPENAI_API_KEY": "",
    "GEMINI_API_KEY": "",
    "GROQ_API_KEY": "",
}


def _digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


@override_settings(**EMPTY_PROVIDER_ENV)
class BusinessSerializerProviderKeyTests(TestCase):
    def setUp(self):
        self.business = Business.objects.create(
            name="Serializer Test Co",
            slug="serializer-test-co",
            anthropic_api_key="test-anthropic-key-1001",
            openai_api_key="test-openai-key-2002",
            gemini_api_key="test-gemini-key-3003",
            groq_api_key="test-groq-key-4004",
        )

    def test_provider_keys_are_masked_and_presence_flags_are_safe(self):
        data = BusinessSerializer(self.business).data

        for field in PROVIDER_KEYS:
            with self.subTest(field=field):
                raw_value = getattr(self.business, field)
                masked_value = data[field]
                self.assertFalse(masked_value == raw_value)
                self.assertEqual(masked_value[-4:], raw_value[-4:])
                self.assertFalse(raw_value[:-4] in masked_value)

        self.assertTrue(data["has_anthropic_key"])
        self.assertTrue(data["has_openai_key"])
        self.assertTrue(data["has_gemini_key"])
        self.assertTrue(data["has_groq_key"])

    def test_blank_provider_key_input_keeps_existing_values(self):
        before = {field: getattr(self.business, field) for field in PROVIDER_KEYS}
        serializer = BusinessSerializer(
            self.business,
            data={field: "" for field in PROVIDER_KEYS},
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        self.business.refresh_from_db()

        for field in PROVIDER_KEYS:
            with self.subTest(field=field):
                self.assertEqual(
                    _digest(getattr(self.business, field)),
                    _digest(before[field]),
                )

    def test_provider_key_update_sets_all_four_values(self):
        replacement_values = {
            "anthropic_api_key": "replacement-anthropic-key-5005",
            "openai_api_key": "replacement-openai-key-6006",
            "gemini_api_key": "replacement-gemini-key-7007",
            "groq_api_key": "replacement-groq-key-8008",
        }
        serializer = BusinessSerializer(
            self.business,
            data=replacement_values,
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        self.business.refresh_from_db()

        for field, value in replacement_values.items():
            with self.subTest(field=field):
                self.assertEqual(_digest(getattr(self.business, field)), _digest(value))

    def test_clear_sentinel_removes_all_four_provider_keys(self):
        serializer = BusinessSerializer(
            self.business,
            data={field: "__CLEAR__" for field in PROVIDER_KEYS},
            partial=True,
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        self.business.refresh_from_db()
        data = BusinessSerializer(self.business).data

        for field in PROVIDER_KEYS:
            with self.subTest(field=field):
                self.assertEqual(getattr(self.business, field), "")
                self.assertEqual(data[field], "")

        self.assertFalse(data["has_anthropic_key"])
        self.assertFalse(data["has_openai_key"])
        self.assertFalse(data["has_gemini_key"])
        self.assertFalse(data["has_groq_key"])

    def test_all_four_provider_keys_are_secret_fields(self):
        self.assertTrue(set(PROVIDER_KEYS).issubset(BusinessSerializer.SECRET_FIELDS))

    def test_reveal_whitelist_includes_all_four_provider_keys(self):
        self.assertTrue(set(PROVIDER_KEYS).issubset(REVEALABLE_FIELDS))


@override_settings(**EMPTY_PROVIDER_ENV)
class RevealProviderKeyTests(TestCase):
    def setUp(self):
        self.business = Business.objects.create(
            name="Reveal Test Co",
            slug="reveal-test-co",
            gemini_api_key="test-gemini-reveal-9009",
        )
        self.factory = APIRequestFactory()
        self.view = RevealKeyView.as_view()
        user_model = get_user_model()
        self.staff_user = user_model.objects.create_user(
            username="staff-user",
            password="unused",
            is_staff=True,
        )
        self.regular_user = user_model.objects.create_user(
            username="regular-user",
            password="unused",
        )

    def test_reveal_provider_key_is_staff_only(self):
        request = self.factory.post("/", {"field": "gemini_api_key"}, format="json")
        force_authenticate(request, user=self.regular_user)

        response = self.view(request, pk=self.business.pk)

        self.assertEqual(response.status_code, 403)

    def test_staff_can_reveal_whitelisted_provider_key(self):
        request = self.factory.post("/", {"field": "gemini_api_key"}, format="json")
        force_authenticate(request, user=self.staff_user)

        response = self.view(request, pk=self.business.pk)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(_digest(response.data["value"]), _digest(self.business.gemini_api_key))
