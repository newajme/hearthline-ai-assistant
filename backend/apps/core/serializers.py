from rest_framework import serializers

from .models import Business, Channel, UserProfile


class ChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = ["id", "kind", "address", "is_active", "created_at"]


def _mask(value: str) -> str:
    """Mask a secret for safe transport: show only the trailing 4 chars."""
    v = (value or "").strip()
    if not v:
        return ""
    if len(v) <= 8:
        return "•" * len(v)
    return "•" * (len(v) - 4) + v[-4:]


class _SecretField(serializers.CharField):
    """Char field that round-trips secrets safely.

    On read: masked (e.g. ••••abcd) or "" if unset.
    On write: blank input means "no change"; literal "" string means clear.
    To clear, the client must send the special sentinel "__CLEAR__".
    """

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("allow_blank", True)
        kwargs.setdefault("required", False)
        super().__init__(*args, **kwargs)

    def to_representation(self, value):
        return _mask(value)


class BusinessSerializer(serializers.ModelSerializer):
    channels = ChannelSerializer(many=True, read_only=True)
    has_anthropic_key = serializers.SerializerMethodField()
    has_openai_key = serializers.SerializerMethodField()
    has_gemini_key = serializers.SerializerMethodField()
    has_groq_key = serializers.SerializerMethodField()
    has_vapi_key = serializers.SerializerMethodField()
    has_twilio_creds = serializers.SerializerMethodField()
    has_whatsapp_creds = serializers.SerializerMethodField()
    anthropic_api_key = _SecretField()
    openai_api_key = _SecretField()
    gemini_api_key = _SecretField()
    groq_api_key = _SecretField()
    vapi_api_key = _SecretField()
    vapi_phone_number_id = _SecretField()
    twilio_account_sid = _SecretField()
    twilio_auth_token = _SecretField()
    twilio_from_number = serializers.CharField(required=False, allow_blank=True)
    whatsapp_access_token = _SecretField()
    whatsapp_verify_token = _SecretField()
    whatsapp_phone_number_id = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Business
        fields = [
            "id", "name", "slug", "trade", "timezone", "currency",
            "phone_number", "voice_persona", "knowledge_base",
            "llm_provider",
            "anthropic_api_key", "openai_api_key", "gemini_api_key", "groq_api_key", "vapi_api_key",
            "vapi_phone_number_id", "vapi_assistant_id",
            "twilio_account_sid", "twilio_auth_token",
            "twilio_from_number",
            "whatsapp_access_token", "whatsapp_phone_number_id", "whatsapp_verify_token",
            "has_anthropic_key", "has_openai_key", "has_vapi_key", "has_twilio_creds",
            "has_gemini_key", "has_groq_key", "has_whatsapp_creds",
            "channels", "created_at", "updated_at",
        ]

    # --- "has key" booleans surface presence without leaking the secret ---
    def get_has_anthropic_key(self, obj) -> bool:
        return bool(obj.resolved_anthropic_key)

    def get_has_openai_key(self, obj) -> bool:
        return bool(obj.resolved_openai_key)

    def get_has_gemini_key(self, obj) -> bool:
        return bool(obj.resolved_gemini_key)

    def get_has_groq_key(self, obj) -> bool:
        return bool(obj.resolved_groq_key)

    def get_has_vapi_key(self, obj) -> bool:
        return bool(obj.resolved_vapi_key)

    def get_has_twilio_creds(self, obj) -> bool:
        return bool(obj.resolved_twilio_sid and obj.resolved_twilio_token)

    def get_has_whatsapp_creds(self, obj) -> bool:
        return bool(obj.resolved_whatsapp_token and obj.resolved_whatsapp_phone_id)

    # --- write semantics: blank = leave alone, "__CLEAR__" = wipe, value = set ---
    SECRET_FIELDS = (
        "anthropic_api_key", "openai_api_key", "gemini_api_key", "groq_api_key", "vapi_api_key",
        "vapi_phone_number_id", "twilio_account_sid", "twilio_auth_token",
        "whatsapp_access_token", "whatsapp_verify_token",
    )

    def update(self, instance, validated_data):
        for field in self.SECRET_FIELDS:
            if field not in validated_data:
                continue
            incoming = validated_data.pop(field)
            if incoming == "":
                # treat blank as "no change"
                continue
            if incoming == "__CLEAR__":
                setattr(instance, field, "")
            else:
                setattr(instance, field, incoming)
        return super().update(instance, validated_data)


def _initials(display_name: str, email: str, username: str) -> str:
    src = (display_name or username or email or "U").strip()
    parts = [part for part in src.replace("_", " ").replace(".", " ").split() if part]
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return src[:2].upper()


class UserProfileSerializer(serializers.Serializer):
    display_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    email = serializers.EmailField(read_only=True)
    avatar_url = serializers.URLField(required=False, allow_blank=True, max_length=500)
    initials = serializers.CharField(read_only=True)
    avatar_storage = serializers.CharField(read_only=True)

    def to_representation(self, user):
        profile, _ = UserProfile.objects.get_or_create(user=user)
        display_name = (user.first_name or "").strip()
        return {
            "id": user.id,
            "username": user.username,
            "display_name": display_name,
            "email": user.email,
            "avatar_url": profile.avatar_url,
            "initials": _initials(display_name, user.email, user.username),
            "avatar_storage": "external_url_only",
        }

    def update(self, user, validated_data):
        if "display_name" in validated_data:
            user.first_name = validated_data["display_name"].strip()
            user.save(update_fields=["first_name"])
        if "avatar_url" in validated_data:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.avatar_url = validated_data["avatar_url"].strip()
            profile.save(update_fields=["avatar_url", "updated_at"])
        return user
