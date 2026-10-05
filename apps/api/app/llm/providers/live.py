"""Live provider adapters (Gemini, Anthropic, Groq).

ADR-006 records that all three credentials are currently **absent**, so these
adapters cannot be exercised against a live endpoint in Phase 2. They are
implemented so the abstraction is real and switching is configuration-only, and
they are written to fail *cleanly and testably* when unconfigured:

* SDKs are imported lazily inside `complete()`, so a missing SDK degrades to a
  structured error instead of breaking application import.
* `is_configured` returns False without a credential, and the gateway refuses to
  route to an unconfigured provider.
* Provider exceptions are caught and normalised to platform errors. No provider
  type ever escapes.

They are marked UNVERIFIED-AGAINST-LIVE-API in docs/PHASE_2_FINAL_REPORT.md.
"""
from __future__ import annotations

import asyncio
import json

from app.core.errors import AIProviderError, AIRateLimitError, AITimeoutError
from app.llm.contracts import ProviderRequest, ProviderResponse
from app.llm.providers.base import ProviderAdapter


def _extract_json(content: str) -> str:
    """Pull a JSON object out of a possibly fenced / chatty response."""
    text = content.strip()
    if text.startswith("```"):
        text = text.split("```")[1] if "```" in text[3:] else text[3:]
        if text.lstrip().lower().startswith("json"):
            text = text.lstrip()[4:]
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        return text[start:end + 1]
    start, end = text.find("["), text.rfind("]")
    if start != -1 and end > start:
        return text[start:end + 1]
    return text


class GeminiProvider(ProviderAdapter):
    name = "gemini"

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def complete(self, request: ProviderRequest) -> ProviderResponse:
        if not self.is_configured:
            raise AIProviderError("Gemini adapter has no API key configured")
        try:
            from google import genai
            from google.genai import types as genai_types
        except ImportError as exc:  # pragma: no cover
            raise AIProviderError(f"google-genai SDK unavailable: {exc}") from exc

        client = genai.Client(api_key=self._api_key)
        config_kwargs = {
            "temperature": request.temperature,
            "response_mime_type": "application/json",
        }
        if request.max_tokens:
            config_kwargs["max_output_tokens"] = request.max_tokens

        parts = [request.user_content]
        if request.system_instructions:
            parts.insert(0, request.system_instructions)

        async def _call():
            return await client.aio.models.generate_content(
                model=request.model,
                contents="\n\n".join(p for p in parts if p),
                config=genai_types.GenerateContentConfig(**config_kwargs),
            )

        try:
            result = await asyncio.wait_for(_call(), timeout=request.timeout_seconds)
        except asyncio.TimeoutError as exc:
            raise AITimeoutError("Gemini request timed out") from exc
        except Exception as exc:
            raise self._normalise(exc) from exc

        text = getattr(result, "text", "") or ""
        usage = getattr(result, "usage_metadata", None)
        return ProviderResponse(
            content=_extract_json(text) if request.response_schema else text,
            input_tokens=getattr(usage, "prompt_token_count", 0) or 0,
            output_tokens=getattr(usage, "candidates_token_count", 0) or 0,
            provider=self.name,
            model=request.model,
        )

    @staticmethod
    def _normalise(exc: Exception) -> Exception:
        text = f"{type(exc).__name__}: {exc}".lower()
        if "429" in text or "rate" in text or "quota" in text:
            return AIRateLimitError("Gemini rate limit exceeded")
        if "timeout" in text or "deadline" in text:
            return AITimeoutError("Gemini request timed out")
        return AIProviderError("Gemini provider error")


class AnthropicProvider(ProviderAdapter):
    name = "anthropic"

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def complete(self, request: ProviderRequest) -> ProviderResponse:
        if not self.is_configured:
            raise AIProviderError("Anthropic adapter has no API key configured")
        try:
            import anthropic
        except ImportError as exc:  # pragma: no cover
            raise AIProviderError(f"anthropic SDK unavailable: {exc}") from exc

        client = anthropic.AsyncAnthropic(api_key=self._api_key)

        async def _call():
            kwargs = {
                "model": request.model,
                "max_tokens": request.max_tokens or 2048,
                "temperature": request.temperature,
                "messages": [{"role": "user", "content": request.user_content}],
            }
            if request.system_instructions:
                kwargs["system"] = request.system_instructions
            return await client.messages.create(**kwargs)

        try:
            result = await asyncio.wait_for(_call(), timeout=request.timeout_seconds)
        except asyncio.TimeoutError as exc:
            raise AITimeoutError("Anthropic request timed out") from exc
        except Exception as exc:
            raise self._normalise(exc) from exc

        text = "".join(
            getattr(block, "text", "") or "" for block in (result.content or [])
        )
        usage = getattr(result, "usage", None)
        return ProviderResponse(
            content=_extract_json(text) if request.response_schema else text,
            input_tokens=getattr(usage, "input_tokens", 0) or 0,
            output_tokens=getattr(usage, "output_tokens", 0) or 0,
            provider=self.name,
            model=request.model,
        )

    @staticmethod
    def _normalise(exc: Exception) -> Exception:
        text = f"{type(exc).__name__}: {exc}".lower()
        if "429" in text or "rate_limit" in text:
            return AIRateLimitError("Anthropic rate limit exceeded")
        if "timeout" in text:
            return AITimeoutError("Anthropic request timed out")
        return AIProviderError("Anthropic provider error")


class GroqProvider(ProviderAdapter):
    name = "groq"

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def complete(self, request: ProviderRequest) -> ProviderResponse:
        if not self.is_configured:
            raise AIProviderError("Groq adapter has no API key configured")
        try:
            from groq import AsyncGroq
        except ImportError as exc:  # pragma: no cover
            raise AIProviderError(f"groq SDK unavailable: {exc}") from exc

        client = AsyncGroq(api_key=self._api_key)
        messages = []
        if request.system_instructions:
            messages.append({"role": "system", "content": request.system_instructions})
        messages.append({"role": "user", "content": request.user_content})

        async def _call():
            return await client.chat.completions.create(
                model=request.model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens or 2048,
                response_format={"type": "json_object"},
            )

        try:
            result = await asyncio.wait_for(_call(), timeout=request.timeout_seconds)
        except asyncio.TimeoutError as exc:
            raise AITimeoutError("Groq request timed out") from exc
        except Exception as exc:
            raise self._normalise(exc) from exc

        choices = getattr(result, "choices", None) or []
        text = getattr(choices[0].message, "content", "") if choices else ""
        usage = getattr(result, "usage", None)
        return ProviderResponse(
            content=_extract_json(text or "") if request.response_schema else (text or ""),
            input_tokens=getattr(usage, "prompt_tokens", 0) or 0,
            output_tokens=getattr(usage, "completion_tokens", 0) or 0,
            provider=self.name,
            model=request.model,
        )

    @staticmethod
    def _normalise(exc: Exception) -> Exception:
        text = f"{type(exc).__name__}: {exc}".lower()
        if "429" in text or "rate_limit" in text:
            return AIRateLimitError("Groq rate limit exceeded")
        if "timeout" in text:
            return AITimeoutError("Groq request timed out")
        return AIProviderError("Groq provider error")