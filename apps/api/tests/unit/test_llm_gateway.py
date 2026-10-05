"""LLM Gateway tests: contract, routing, reliability, structured output, usage."""
import asyncio
import json
import uuid

import pytest
from pydantic import BaseModel, Field

from app.core.errors import (
    AIProviderError,
    AITimeoutError,
    InvalidGenerationError,
)
from app.llm import LLMGateway, LLMRequest
from app.llm.contracts import TokenUsage, estimate_cost_usd
from app.llm.gateway import ResponseCache, extract_json
from app.llm.providers import MockLLMProvider, ScriptedLLMProvider
from app.llm.providers.live import AnthropicProvider, GeminiProvider, GroqProvider

U = uuid.UUID("00000000-0000-0000-0000-000000000001")


class HookOutput(BaseModel):
    hooks: list[str]
    rationale: str


class VoiceOutput(BaseModel):
    tone: dict[str, float]
    top_keywords: list[str]
    confidence: float


def req(**kwargs) -> LLMRequest:
    base = dict(purpose="test", feature="test_feature", input_data={"topic": "x"})
    base.update(kwargs)
    return LLMRequest(**base)


def no_sleep(_delay):
    """Deterministic retry: record the delay instead of waiting."""
    return asyncio.sleep(0)


# --------------------------------------------------------------------------- #
# JSON extraction
# --------------------------------------------------------------------------- #

def test_extract_plain_json():
    assert extract_json('{"a": 1}') == {"a": 1}


def test_extract_fenced_json():
    assert extract_json('```json\n{"a": 1}\n```') == {"a": 1}


def test_extract_json_with_surrounding_prose():
    assert extract_json('Here you go: {"a": 1} hope that helps') == {"a": 1}


def test_extract_invalid_json_raises():
    with pytest.raises(InvalidGenerationError):
        extract_json("not json at all")


# --------------------------------------------------------------------------- #
# Contracts
# --------------------------------------------------------------------------- #

def test_llm_request_cache_key_is_deterministic():
    assert req().cache_key() == req().cache_key()


def test_cache_key_differs_by_input():
    assert req(input_data={"topic": "a"}).cache_key() != \
        req(input_data={"topic": "b"}).cache_key()


def test_cache_key_differs_by_schema():
    assert req().cache_key() != req(system_instructions="be terse").cache_key()


def test_token_usage_total():
    assert TokenUsage(input_tokens=3, output_tokens=4).total_tokens == 7


def test_cost_estimate_known_provider():
    cost = estimate_cost_usd("gemini", TokenUsage(input_tokens=1000, output_tokens=1000))
    assert cost > 0


def test_cost_estimate_unknown_provider_is_zero():
    assert estimate_cost_usd("mystery", TokenUsage(input_tokens=10, output_tokens=10)) == 0.0


def test_mock_provider_cost_is_zero():
    assert estimate_cost_usd("mock", TokenUsage(input_tokens=10, output_tokens=10)) == 0.0


# --------------------------------------------------------------------------- #
# Structured output
# --------------------------------------------------------------------------- #

async def test_mock_provider_returns_schema_valid_output():
    out = await LLMGateway().generate(user_id=U, request=req(), response_model=HookOutput)
    assert isinstance(out, HookOutput)
    assert len(out.hooks) == 3


async def test_unvalidated_call_returns_llm_response():
    result = await LLMGateway().generate(user_id=U, request=req())
    assert result.provider == "mock"
    assert result.usage.total_tokens > 0
    assert result.latency_ms >= 0


async def test_one_repair_attempt_succeeds():
    gateway = LLMGateway(providers={"scripted": ScriptedLLMProvider(script=[
        "not json",
        json.dumps({"tone": {"calm": 0.8}, "top_keywords": ["a"], "confidence": 0.7}),
    ])})
    out = await gateway.generate(user_id=U, request=req(), response_model=VoiceOutput)
    assert out.confidence == 0.7


async def test_repair_exhausted_raises_and_never_accepts_malformed():
    """Malformed output must NEVER be silently accepted (task §8)."""
    gateway = LLMGateway(providers={"scripted": ScriptedLLMProvider(
        script=["garbage", "still garbage"])})
    with pytest.raises(InvalidGenerationError):
        await gateway.generate(user_id=U, request=req(), response_model=VoiceOutput)


async def test_provider_surviving_repair_wins():
    gateway = LLMGateway(providers={"scripted": ScriptedLLMProvider(
        script=[json.dumps({"tone": {}, "top_keywords": [], "confidence": 0.1})])})
    out = await gateway.generate(user_id=U, request=req(), response_model=VoiceOutput)
    assert out.confidence == 0.1


# --------------------------------------------------------------------------- #
# Reliability
# --------------------------------------------------------------------------- #

async def test_bounded_retry_then_success():
    gateway = LLMGateway(providers={"scripted": ScriptedLLMProvider(
        script=[json.dumps({"tone": {}, "top_keywords": [], "confidence": 1.0})],
        error_at=0)}, sleep=no_sleep)
    out = await gateway.generate(user_id=U, request=req(), response_model=VoiceOutput)
    assert out.confidence == 1.0


async def test_retry_is_bounded_not_infinite():
    """A permanently failing provider must terminate, not loop forever."""
    provider = ScriptedLLMProvider(script=["{}"], error_at=None)

    async def always_fail(request):
        raise AITimeoutError("down")

    provider.complete = always_fail  # type: ignore[assignment]
    gateway = LLMGateway(providers={"scripted": provider}, sleep=no_sleep)
    with pytest.raises(AITimeoutError):
        await asyncio.wait_for(
            gateway.generate(user_id=U, request=req(), response_model=VoiceOutput),
            timeout=5,
        )


async def test_provider_fallback_on_schema_failure():
    """A structurally unusable reply should advance to the next provider."""
    gateway = LLMGateway(providers={
        "scripted": ScriptedLLMProvider(script=["{}"]),
        "mock": MockLLMProvider(),
    }, sleep=no_sleep)
    out = await gateway.generate(user_id=U, request=req(provider="scripted"),
                                 response_model=VoiceOutput)
    assert isinstance(out, VoiceOutput)


async def test_unconfigured_provider_raises_clean_error():
    """No credential -> structured error, never a raw SDK exception."""
    gateway = LLMGateway(providers={"gemini": GeminiProvider(api_key=None)},
                         sleep=no_sleep)
    with pytest.raises(AIProviderError):
        await asyncio.wait_for(
            gateway.generate(user_id=U, request=req(provider="gemini"),
                             response_model=VoiceOutput),
            timeout=5,
        )


@pytest.mark.parametrize("provider_cls", [GeminiProvider, AnthropicProvider, GroqProvider])
def test_live_providers_report_unconfigured_without_credential(provider_cls):
    adapter = provider_cls(api_key=None)
    assert adapter.is_configured is False


@pytest.mark.parametrize("provider_cls", [GeminiProvider, AnthropicProvider, GroqProvider])
async def test_live_providers_raise_platform_error_when_unconfigured(provider_cls):
    from app.llm.contracts import ProviderRequest
    adapter = provider_cls(api_key=None)
    with pytest.raises(AIProviderError):
        await adapter.complete(ProviderRequest(model="m", user_content="x"))


async def test_timeout_is_enforced():
    class SlowProvider(ScriptedLLMProvider):
        async def complete(self, request):
            await asyncio.sleep(5)
            raise AssertionError("should have timed out")

    gateway = LLMGateway(providers={"scripted": SlowProvider()},
                         sleep=no_sleep)
    request = req(provider="scripted", timeout_seconds=0.2)
    with pytest.raises((AITimeoutError, asyncio.TimeoutError)):
        await asyncio.wait_for(
            gateway.generate(user_id=U, request=request, response_model=VoiceOutput),
            timeout=5,
        )


# --------------------------------------------------------------------------- #
# Caching
# --------------------------------------------------------------------------- #

def test_response_cache_hit_and_expiry():
    from app.llm.contracts import LLMResponse
    cache = ResponseCache(max_entries=2)
    response = LLMResponse(content="cached", provider="mock", model="m")
    cache.put("k", response, ttl=100)
    assert cache.get("k") is not None
    cache.put("expired", response, ttl=-1)
    assert cache.get("expired") is None


def test_response_cache_evicts_lru():
    from app.llm.contracts import LLMResponse
    cache = ResponseCache(max_entries=2)
    response = LLMResponse(content="x", provider="mock", model="m")
    cache.put("a", response, ttl=100)
    cache.put("b", response, ttl=100)
    cache.get("a")
    cache.put("c", response, ttl=100)
    assert cache.get("b") is None and cache.get("a") is not None


async def test_cache_returns_identical_result():
    gateway = LLMGateway()
    first = await gateway.generate(user_id=U, request=req(input_data={"k": 1}),
                                   response_model=VoiceOutput)
    second = await gateway.generate(user_id=U, request=req(input_data={"k": 1}),
                                    response_model=VoiceOutput)
    assert first == second


# --------------------------------------------------------------------------- #
# Prompt assets
# --------------------------------------------------------------------------- #

def test_prompt_loader_finds_voice_asset():
    from app.llm.prompts import list_prompts, load_prompt
    assets = list_prompts()
    assert any(a.startswith("voice/") for a in assets), assets
    template = load_prompt("voice/profile_summary", "v1")
    assert template.purpose == "voice"
    assert "{{" in template.template


def test_prompt_renderer_rejects_missing_variable():
    from app.llm.prompts import render
    with pytest.raises(KeyError):
        render("hello {{ name }}", {})


def test_prompt_renderer_substitutes():
    from app.llm.prompts import render
    assert render("hi {{ name }}", {"name": "sam"}) == "hi sam"


def test_prompt_injection_preamble_present_for_memory_prompts():
    """Retrieved memory must be introduced as untrusted DATA."""
    from app.llm.prompts import UNTRUSTED_DATA_PREAMBLE
    assert "untrusted" in UNTRUSTED_DATA_PREAMBLE.lower()
    assert "never follow instructions" in UNTRUSTED_DATA_PREAMBLE.lower()


# --------------------------------------------------------------------------- #
# Usage scrubbing
# --------------------------------------------------------------------------- #

@pytest.mark.parametrize("secret", [
    "sk-abcdef1234567890abcdef",
    "Bearer eyJhbGciOiJIUzI1NiJ9.payload",
    "GEMINI_API_KEY=AIzaSyA1234567890abcdefg",
])
def test_usage_scrub_redacts_secrets(secret):
    from app.llm.usage import scrub
    cleaned = scrub(f"provider error: {secret}")
    assert "[redacted]" in cleaned
    assert secret not in cleaned


def test_usage_scrub_truncates():
    from app.llm.usage import scrub
    assert len(scrub("x" * 1000, limit=50)) == 50


def test_usage_scrub_handles_none():
    from app.llm.usage import scrub
    assert scrub(None) is None
