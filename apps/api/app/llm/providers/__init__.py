"""Provider registry.

Builds adapters from settings. Providers without credentials are still
registered but report `is_configured == False`, and the gateway will refuse to
route to them.
"""
from __future__ import annotations

from app.core.config import settings
from app.llm.providers.base import ProviderAdapter
from app.llm.providers.live import AnthropicProvider, GeminiProvider, GroqProvider
from app.llm.providers.mock import MockLLMProvider, ScriptedLLMProvider

#: provider key -> (adapter class, settings attribute holding its credential)
PROVIDER_REGISTRY: dict[str, tuple[type[ProviderAdapter], str]] = {
    "mock": (MockLLMProvider, ""),
    "gemini": (GeminiProvider, "gemini_api_key"),
    "anthropic": (AnthropicProvider, "anthropic_api_key"),
    "groq": (GroqProvider, "groq_api_key"),
}


def build_provider(name: str) -> ProviderAdapter:
    """Instantiate a provider adapter by key."""
    if name not in PROVIDER_REGISTRY:
        raise KeyError(f"Unknown LLM provider: {name!r}")
    cls, key_attr = PROVIDER_REGISTRY[name]
    api_key = getattr(settings, key_attr, None) if key_attr else None
    return cls(api_key=api_key)


__all__ = [
    "PROVIDER_REGISTRY",
    "build_provider",
    "ProviderAdapter",
    "MockLLMProvider",
    "ScriptedLLMProvider",
    "GeminiProvider",
    "AnthropicProvider",
    "GroqProvider",
]
