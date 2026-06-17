"""Shared AI provider configuration for provider-safe key and model lookup."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from django.conf import settings


ProviderName = Literal["anthropic", "openai", "gemini", "groq"]


@dataclass(frozen=True)
class ProviderConfig:
    name: ProviderName
    label: str
    default_model: str
    key_property: str
    env_var: str
    openai_base_url: str = ""


PROVIDERS: dict[str, ProviderConfig] = {
    "anthropic": ProviderConfig(
        name="anthropic",
        label="Anthropic Claude",
        default_model="claude-sonnet-4-6",
        key_property="resolved_anthropic_key",
        env_var="ANTHROPIC_API_KEY",
    ),
    "openai": ProviderConfig(
        name="openai",
        label="OpenAI",
        default_model="gpt-4o",
        key_property="resolved_openai_key",
        env_var="OPENAI_API_KEY",
    ),
    "gemini": ProviderConfig(
        name="gemini",
        label="Google Gemini",
        default_model="gemini-2.0-flash",
        key_property="resolved_gemini_key",
        env_var="GEMINI_API_KEY",
    ),
    "groq": ProviderConfig(
        name="groq",
        label="Groq",
        default_model="llama-3.3-70b-versatile",
        key_property="resolved_groq_key",
        env_var="GROQ_API_KEY",
        openai_base_url="https://api.groq.com/openai/v1",
    ),
}


def resolve_provider(business=None) -> ProviderConfig:
    provider = (getattr(business, "llm_provider", "") or "anthropic").lower()
    return PROVIDERS.get(provider, PROVIDERS["anthropic"])


def resolve_model(provider: ProviderConfig, business=None) -> str:
    model = (getattr(business, "llm_model", "") or "").strip()
    return model or provider.default_model


def resolve_api_key(provider: ProviderConfig, business=None) -> str:
    business_key = (getattr(business, provider.key_property, "") or "").strip()
    if business_key:
        return business_key
    return (getattr(settings, provider.env_var, "") or "").strip()


def missing_key_message(provider: ProviderConfig) -> str:
    return f"Missing {provider.label} API key configuration."
