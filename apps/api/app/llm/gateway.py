"""Centralized LLM Gateway (ADR-003).

This is the **single point of egress** for every LLM interaction in the platform.
Feature code must not import `google-genai`, `anthropic`, `groq` or `openai`
directly; routing around this module is an architectural violation.

Reliability contract:
  * per-call timeout, never infinite
  * bounded retries with exponential backoff on 429 / 5xx / timeout
  * bounded provider fallback chain
  * structured output validated against a Pydantic model
  * exactly one repair attempt, then FAILED (never silently accepted)
  * every call accounted for in `ai_calls` with tokens, cost and latency

Prompt-injection posture (task §30): `system_instructions` is the trusted
channel. Retrieved memory is only ever passed through `user_content` /
`input_data`, which is untrusted data. There is deliberately no API on this
class for placing retrieved text into the system channel.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import re
import time
import uuid
from collections import OrderedDict
from typing import Any, Callable, Optional

from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.core.errors import (
    AIProviderError,
    AIRateLimitError,
    AITimeoutError,
    AppError,
    InvalidGenerationError,
)
from app.core.logging import get_logger
from app.llm.contracts import (
    LLMRequest,
    LLMResponse,
    ProviderRequest,
    ProviderResponse,
    TokenUsage,
    estimate_cost_usd,
)
from app.llm.prompts import build_prompt
from app.llm.providers import build_provider
from app.llm.providers.base import ProviderAdapter

logger = get_logger(__name__)

_JSON_FENCE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


class ResponseCache:
    """Small in-process TTL cache. Single-process by design."""

    def __init__(self, max_entries: int = 512) -> None:
        self._data: "OrderedDict[str, tuple[float, LLMResponse]]" = OrderedDict()
        self._max = max_entries

    def get(self, key: str) -> Optional[LLMResponse]:
        item = self._data.get(key)
        if not item:
            return None
        expires_at, response = item
        if expires_at < time.time():
            self._data.pop(key, None)
            return None
        self._data.move_to_end(key)
        return response

    def put(self, key: str, response: LLMResponse, ttl: int) -> None:
        self._data[key] = (time.time() + ttl, response)
        self._data.move_to_end(key)
        while len(self._data) > self._max:
            self._data.popitem(last=False)

    def clear(self) -> None:
        self._data.clear()


def extract_json(content: str) -> dict[str, Any]:
    """Parse JSON from a model response, tolerating fences and prose."""
    if content is None:
        raise InvalidGenerationError("Empty response from provider")
    text = content.strip()
    fence = _JSON_FENCE.search(text)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start != -1 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError as exc:
                raise InvalidGenerationError("Response is not valid JSON") from exc
        raise InvalidGenerationError("Response is not valid JSON")


class LLMGateway:
    """Centralized LLM execution gateway."""

    def __init__(
        self,
        providers: Optional[dict[str, ProviderAdapter]] = None,
        cache: Optional[ResponseCache] = None,
        sleep: Callable[[float], Any] = asyncio.sleep,
    ) -> None:
        self._providers: dict[str, ProviderAdapter] = providers or {}
        # An explicitly-constructed gateway routes only among its own registry,
        # so tests can inject scripted providers without touching global settings.
        self._explicit_registry = providers is not None
        self._cache = cache if cache is not None else ResponseCache(settings.llm_cache_max_entries)
        # Injectable so retry/backoff is testable without real waiting.
        self._sleep = sleep

    # -- provider access ---------------------------------------------------

    def register_provider(self, adapter: ProviderAdapter) -> None:
        self._providers[adapter.name] = adapter

    def provider_for(self, name: str) -> ProviderAdapter:
        if name not in self._providers:
            self._providers[name] = build_provider(name)
        return self._providers[name]

    @property
    def providers(self) -> dict[str, ProviderAdapter]:
        return dict(self._providers)

    def describe(self) -> dict:
        out = {}
        for name in self._chain(None):
            adapter = self.provider_for(name)
            out[name] = adapter.describe()
        return out

    # -- routing -----------------------------------------------------------

    def _chain(self, provider: Optional[str]) -> list[str]:
        """Ordered provider chain: requested provider, then the gateway's default,
        then fallbacks. De-duplicated, skipping empties.

        When the gateway was built with an explicit provider registry, that
        registry defines the chain (request first, then registered order) so
        routing never escapes to a globally-configured provider.
        """
        if self._explicit_registry:
            head = [provider] if provider else []
            tail = [name for name in self._providers if name not in head]
            fallback = [f for f in settings.llm_fallback_providers if f not in head + tail]
            return [*head, *tail, *fallback]

        chain: list[str] = []
        for candidate in (provider, settings.llm_default_provider, *settings.llm_fallback_providers):
            if candidate and candidate not in chain:
                chain.append(candidate)
        return chain

    DEFAULT_MODELS: dict[str, str] = {
        "gemini": "gemini-3.8-flash",
        "groq": "openai/gpt-oss-120b",
        "anthropic": "claude-3-5-sonnet-20241022",
        "mock": "mock-deterministic",
    }

    def _model_for(self, provider: str, requested: Optional[str]) -> str:
        """Resolve the model id for a provider.

        A caller-supplied model only applies to the provider it was chosen for.
        When we have already fallen back to a different provider, that provider's
        own default is used -- sending another vendor's model name would fail.
        """
        default_model = self.DEFAULT_MODELS.get(provider, settings.llm_default_model)
        if not requested:
            return default_model
        if self._explicit_registry:
            return requested if provider in self._providers else default_model
        if provider == (settings.llm_default_provider or provider):
            return requested
        return default_model

    # -- public API --------------------------------------------------------


    async def generate(
        self,
        *,
        user_id: uuid.UUID,
        request: LLMRequest,
        response_model: Optional[type[BaseModel]] = None,
        db: Optional[Any] = None,
    ) -> Any:
        """Execute a structured generation.

        Returns a `response_model` instance when `response_model` is supplied,
        otherwise the normalised `LLMResponse`.
        """
        started = time.perf_counter()
        trace_id = uuid.uuid4().hex
        cache_key = request.cache_key() if settings.llm_cache_enabled else ""

        # ---- cache ----
        if cache_key:
            hit = self._cache.get(cache_key)
            if hit is not None and response_model is not None:
                cached = hit.model_copy(deep=True)
                cached.cached = True
                cached.status = cached.status  # keep original status
                cached.trace_id = trace_id
                if cached.validated_output is not None and isinstance(cached.validated_output, BaseModel):
                    return cached.validated_output
                return cached

        # ---- prompt assembly ----
        system, user, _ = build_prompt(
            prompt_name=request.prompt_name,
            prompt_version=request.prompt_version,
            input_data=request.input_data,
            default_purpose=request.purpose,
        )
        if request.system_instructions:
            system = f"{system}\n\n{request.system_instructions}".strip()
        user_content = f"{user}\n\n{request.user_content}".strip() if request.user_content else user

        schema = request.response_schema
        if schema is None and response_model is not None:
            schema = response_model.model_json_schema()

        timeout = request.timeout_seconds or settings.llm_default_timeout

        usage = TokenUsage()
        raw_content = ""
        provider_used, model_used = "", ""
        attempts = 0
        last_error: Optional[str] = None
        status = "provider_error"
        validated: Optional[BaseModel] = None
        repaired = False

        # ------------------------------------------------------------------
        # Provider chain. Each provider gets bounded retries with backoff.
        #
        # A provider counts as FAILED both when the transport call fails AND
        # when it returns output that cannot satisfy the requested schema even
        # after its single repair attempt. In the latter case we fall through
        # to the next provider, because a structurally unusable reply is a
        # provider failure in practice and ADR-003 requires the fallback chain
        # to be tried before the request is declared failed.
        # ------------------------------------------------------------------
        for provider_name in self._chain(request.provider):
            adapter = self.provider_for(provider_name)
            if not adapter.is_configured:
                logger.info("Skipping unconfigured LLM provider %s", provider_name)
                last_error = f"provider {provider_name} not configured"
                continue

            model_name = self._model_for(provider_name, request.model)
            provider_response: Optional[ProviderResponse] = None

            for attempt in range(1, settings.llm_max_attempts + 1):
                attempts += 1
                provider_request = ProviderRequest(
                    model=model_name,
                    system_instructions=system or None,
                    user_content=user_content,
                    temperature=request.temperature,
                    max_tokens=request.max_tokens,
                    response_schema=schema,
                    timeout_seconds=timeout,
                )
                try:
                    result = await asyncio.wait_for(
                        adapter.complete(provider_request), timeout=timeout
                    )
                    if not isinstance(result, ProviderResponse):
                        raise AIProviderError("Adapter returned an unsupported response type")
                    provider_response = result
                except (AITimeoutError, AIRateLimitError, AIProviderError,
                        asyncio.TimeoutError) as exc:
                    last_error = f"{type(exc).__name__}: {exc}"
                    status = self._status_for(exc)
                    logger.warning(
                        "LLM call failed provider=%s attempt=%d/%d: %s",
                        provider_name, attempt, settings.llm_max_attempts, last_error,
                    )
                    if attempt < settings.llm_max_attempts:
                        await self._sleep(self._delay_for(attempt))
                        continue
                    break  # attempts exhausted -> try next provider
                except Exception as exc:  # pragma: no cover - defensive
                    last_error = f"unexpected: {type(exc).__name__}"
                    status = "provider_error"
                    logger.exception("Unexpected provider failure")
                    break

                break  # transport succeeded

            if provider_response is None:
                continue  # this provider failed at the transport layer

            # ---- structured validation with exactly one repair attempt ----
            if response_model is not None:
                validated, repaired_content, was_repaired = await self._validate_or_repair(
                    adapter=adapter,
                    request=request,
                    system=system,
                    user_content=user_content,
                    response_model=response_model,
                    content=provider_response.content,
                    model_name=model_name,
                    timeout=timeout,
                )
                if validated is None:
                    logger.warning(
                        "Provider %s produced schema-invalid output after repair; "
                        "advancing to next provider", provider_name,
                    )
                    usage = TokenUsage(
                        input_tokens=usage.input_tokens + provider_response.input_tokens,
                        output_tokens=usage.output_tokens + provider_response.output_tokens,
                    )
                    last_error = "structured output invalid after one repair attempt"
                    status = "repair_failed"
                    continue  # -> next provider
                raw_content = repaired_content
                repaired = was_repaired
            else:
                raw_content = provider_response.content

            provider_used = provider_response.provider or provider_name
            model_used = provider_response.model or model_name
            usage = TokenUsage(
                input_tokens=usage.input_tokens + provider_response.input_tokens,
                output_tokens=usage.output_tokens + provider_response.output_tokens,
            )
            break  # success -> leave the chain loop

        # ---- exhausted every provider ----
        if not provider_used:
            response = LLMResponse(
                content="",
                provider=request.provider or settings.llm_default_provider,
                model=request.model or settings.llm_default_model,
                usage=usage,
                latency_ms=int((time.perf_counter() - started) * 1000),
                status=status,
                error=last_error or "no configured provider available",
                trace_id=trace_id,
                attempts=attempts,
            )
            await self._record(db, user_id, request, response)
            if response.status == "repair_failed":
                raise InvalidGenerationError(
                    "No provider produced output satisfying the response schema",
                    details={"schema": getattr(response_model, "__name__", None)},
                )
            raise self._to_error(response.status, response.error or "provider unavailable")

        response = LLMResponse(
            content=raw_content,
            structured_output=(validated.model_dump() if validated else None),
            validated_output=validated,
            provider=provider_used,
            model=model_used,
            usage=usage,
            latency_ms=int((time.perf_counter() - started) * 1000),
            estimated_cost_usd=estimate_cost_usd(provider_used, usage),
            status="success",
            trace_id=trace_id,
            attempts=attempts,
            repaired=repaired,
        )

        if cache_key and validated is not None:
            self._cache.put(cache_key, response.model_copy(deep=True),
                            settings.llm_cache_ttl_seconds)

        await self._record(db, user_id, request, response)

        return validated if validated is not None else response

    # -- helpers -----------------------------------------------------------

    @staticmethod
    def _delay_for(attempt: int) -> float:
        delays = settings.llm_retry_delays or [1.0, 2.0, 4.0]
        return float(delays[min(attempt - 1, len(delays) - 1)])

    @staticmethod
    def _status_for(exc: Exception) -> str:
        if isinstance(exc, (AITimeoutError, asyncio.TimeoutError)):
            return "timeout"
        if isinstance(exc, AIRateLimitError):
            return "rate_limited"
        return "provider_error"

    @staticmethod
    def _to_error(status: str, message: str) -> AppError:
        if status == "timeout":
            return AITimeoutError(message)
        if status == "rate_limited":
            return AIRateLimitError(message)
        return AIProviderError(message)

    async def _validate_or_repair(
        self,
        *,
        adapter: ProviderAdapter,
        request: LLMRequest,
        system: str,
        user_content: str,
        response_model: type[BaseModel],
        content: str,
        model_name: str,
        timeout: float,
    ) -> tuple[Optional[BaseModel], str, bool]:
        """Validate, then attempt exactly one repair. Returns (model|None, raw, repaired)."""
        try:
            return response_model(**extract_json(content)), content, False
        except (InvalidGenerationError, ValidationError, TypeError) as first_error:
            logger.info("Structured validation failed; one repair attempt: %s", first_error)

        repair_text = (
            request.repair_instructions
            or "Your previous reply was not valid for the required schema. "
               "Reply with JSON only, matching the schema exactly."
        )
        repair_request = ProviderRequest(
            model=model_name,
            system_instructions=system or None,
            user_content=f"{user_content}\n\n---\n{repair_text}",
            temperature=min(request.temperature, 0.2),
            max_tokens=request.max_tokens,
            response_schema=response_model.model_json_schema(),
            timeout_seconds=timeout,
        )
        try:
            repaired_response = await asyncio.wait_for(
                adapter.complete(repair_request), timeout=timeout
            )
            return (
                response_model(**extract_json(repaired_response.content)),
                repaired_response.content,
                True,
            )
        except Exception as exc:
            logger.warning("Repair attempt failed: %s", exc)
            return None, content, False

    async def _record(self, db, user_id, request: LLMRequest, response: LLMResponse) -> None:
        """Account for the call.

        Usage is written on its own session (see app/llm/usage.py) so it is
        durable and cannot roll back or prematurely commit the caller's work.
        The `db` argument is accepted for call-site symmetry and future
        same-transaction reporting, but is deliberately not used for the write.
        """
        from app.llm.usage import record_usage

        await record_usage(
            user_id=user_id,
            feature=request.feature,
            prompt_version=request.prompt_version or "v1",
            response=response,
        )


# --------------------------------------------------------------------- wiring

_GATEWAY: Optional[LLMGateway] = None


def get_llm_gateway() -> LLMGateway:
    """FastAPI dependency / process-wide singleton."""
    global _GATEWAY
    if _GATEWAY is None:
        _GATEWAY = LLMGateway()
    return _GATEWAY


def set_llm_gateway(gateway: Optional[LLMGateway]) -> None:
    """Test seam for injecting scripted providers."""
    global _GATEWAY
    _GATEWAY = gateway


__all__ = [
    "LLMGateway",
    "get_llm_gateway",
    "set_llm_gateway",
    "ResponseCache",
    "extract_json",
]