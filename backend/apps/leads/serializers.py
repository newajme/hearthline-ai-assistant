from rest_framework import serializers

from apps.core.models import Business

from .models import Conversation, Customer, Lead, Message


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ["id", "business", "name", "phone", "email", "address", "notes", "created_at"]


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "conversation", "direction", "role", "body", "media_url", "created_at"]


class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = ["id", "lead", "channel", "started_at", "last_activity_at", "messages"]


class LeadSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    conversations = ConversationSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=200)
    customer_phone = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=32)
    customer_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    idempotency_key = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=80)

    class Meta:
        model = Lead
        fields = [
            "id", "business", "customer", "source_channel",
            "project_summary", "status", "temperature",
            "estimated_value", "extracted_fields",
            "customer_name", "customer_phone", "customer_email", "idempotency_key",
            "conversations", "created_at", "updated_at",
        ]
        read_only_fields = ["business", "customer", "extracted_fields", "conversations", "created_at", "updated_at"]

    def validate(self, attrs):
        if self.instance is not None:
            return attrs
        name = (attrs.get("customer_name") or "").strip()
        phone = (attrs.get("customer_phone") or "").strip()
        email = (attrs.get("customer_email") or "").strip()
        summary = (attrs.get("project_summary") or "").strip()
        if not (name or phone or email):
            raise serializers.ValidationError("Add a customer name, phone, or email.")
        if not summary:
            raise serializers.ValidationError("Project summary is required.")
        return attrs

    def create(self, validated_data):
        customer_name = validated_data.pop("customer_name", "").strip()
        customer_phone = validated_data.pop("customer_phone", "").strip()
        customer_email = validated_data.pop("customer_email", "").strip()
        idempotency_key = validated_data.pop("idempotency_key", "").strip()

        business = Business.objects.order_by("id").first()
        if business is None:
            raise serializers.ValidationError("Create a business profile before adding leads.")

        if idempotency_key:
            existing = Lead.objects.filter(
                business=business,
                extracted_fields__manual_idempotency_key=idempotency_key,
            ).select_related("customer", "business").first()
            if existing is not None:
                return existing

        customer = None
        if customer_phone:
            customer = Customer.objects.filter(business=business, phone=customer_phone).order_by("id").first()
        if customer is None and customer_email:
            customer = Customer.objects.filter(business=business, email__iexact=customer_email).order_by("id").first()
        if customer is None:
            customer = Customer.objects.create(
                business=business,
                name=customer_name,
                phone=customer_phone,
                email=customer_email,
            )
        else:
            changed = []
            if customer_name and not customer.name:
                customer.name = customer_name
                changed.append("name")
            if customer_phone and not customer.phone:
                customer.phone = customer_phone
                changed.append("phone")
            if customer_email and not customer.email:
                customer.email = customer_email
                changed.append("email")
            if changed:
                customer.save(update_fields=changed)

        extracted_fields = {"manual_entry": True}
        if idempotency_key:
            extracted_fields["manual_idempotency_key"] = idempotency_key
        return Lead.objects.create(
            business=business,
            customer=customer,
            extracted_fields=extracted_fields,
            **validated_data,
        )
