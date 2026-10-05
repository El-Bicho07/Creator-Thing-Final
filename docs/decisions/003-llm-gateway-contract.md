# LLM Gateway Contract — Creator Platform SaaS

*Architecture Decision Record: ADR-003*

## Status

**IMPLEMENTED AND VERIFIED — 2026-10-03 (Phase 2)**

Implemented at `apps/api/app/llm/gateway.py`. Every capability below is
exercised by `tests/unit/test_llm_gateway.py` (39 tests) and the end-to-end
chain in `tests/integration/test_end_to_end.py`.

### Capability status against this contract

| Capability | Status | Notes |
|---|---|---|
| Provider routing | IMPLEMENTED | adapter registry; explicit-registry gateways route only among injected providers |
| Model selection | IMPLEMENTED | per-request override, resolved per provider |
| Timeout enforcement | IMPLEMENTED | per-call, default 30 s, never infinite |
| Bounded retry + exponential backoff | IMPLEMENTED | max 3 attempts, 1/2/4 s |
| Provider fallback | IMPLEMENTED | triggered by transport failure **and** schema-invalid output |
| Structured output validation | IMPLEMENTED | Pydantic v2 |
| One repair attempt, then FAILED | IMPLEMENTED | never silently accepts malformed output |
| Error normalisation | IMPLEMENTED | provider SDK types never escape the adapter layer |
| Token / cost / latency tracking | IMPLEMENTED | written to `ai_calls` |
| Prompt versioning | IMPLEMENTED | `packages/prompts/`, strict `{{variable}}` rendering |
| Response caching | IMPLEMENTED | TTL + LRU, in-process |
| Per-user token budget | DEFERRED | enforcement point and schema are ready; UI/rollout deferred |
| Per-feature rate limits | DEFERRED | config key exists; enforcement deferred |

### Deliberate deviations from the contract

1. **No production provider is installed or configured.** ADR-006 records that
   `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` and `GROQ_API_KEY` are all absent.
   The default provider is a deterministic **mock**, so the architecture,
   validation, repair, retry, fallback and accounting paths are all exercised
   and testable. Switching to a live provider is configuration only.
2. **Gemini / Anthropic / Groq adapters are UNVERIFIED against a live API.**
   They are implemented behind the abstraction and are tested only for
   credential-gating and clean failure. Recorded as UNVERIFIED in the Phase 2
   final report.
3. **Usage logging uses a dedicated session**, not the caller's. A savepoint is
   not durable, and committing the caller's session would commit partial feature
   work. See `app/llm/usage.py`.
4. **Prompt-injection posture added** (task §30): retrieved memory is only ever
   passed as *data*; there is deliberately no API for placing it in the system
   channel.

## Context

The Phase 1 audit identified that donor modules (Module 13, Module 19, Module 11, Module 18, etc.) each implement their own direct LLM provider calls:

| Module | Provider | Direct Call Pattern |
|--------|----------|---------------------|
| 13_Voice_Replicator | Gemini (`google-genai`) | `gemini.generate_content()` |
| 19_Creator_Second_Brain | Groq (`groq`), Gemini | `groq.chat.completions.create()` |
| 11_Comment_to_Content | Anthropic (`anthropic`) | `anthropic.messages.create()` |
| 18_AI_Content_Director | Anthropic | Direct SDK calls |
| 03_Hook_Generator | Gemini (`@google/genai`) | Direct SDK calls |
| 08_Caption_Assistant | Gemini / Anthropic | Mixed direct calls |
| 09_CTA_Generator | Anthropic | Direct SDK calls |

This violates the core architectural principle: **All AI calls must route through a centralized gateway.**

## Decision

Implement a centralized `LLMGateway` class at `apps/api/app/llm/gateway.py` that serves as the **single point of egress** for all LLM interactions.

No feature code may directly import or call:
- `google-genai`
- `anthropic`
- `groq`
- `openai`
- Any other provider SDK

## Contract Specification

### Core Interface

```python
# apps/api/app/llm/gateway.py

class LLMGateway:
    """
    Centralized LLM execution gateway.
    
    All feature code must use this gateway for AI generation.
    """
    
    async def generate(
        self,
        *,
        user_id: UUID,
        feature: str,
        prompt_name: str,
        prompt_version: str,
        input_data: dict,
        response_model: type[BaseModel],
        provider: str | None = None,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        timeout_seconds: float = 30.0,
    ) -> BaseModel:
        """
        Execute a structured generation through the gateway.
        
        Args:
            user_id: Authenticated user ID (for usage tracking & limits)
            feature: Feature identifier (e.g., "studio_hook_generator", "voice_analysis")
            prompt_name: Prompt asset name (e.g., "hooks/hook_generator")
            prompt_version: Prompt version (e.g., "v1")
            input_data: Input variables for prompt template
            response_model: Pydantic model for structured output validation
            provider: Override provider (gemini, anthropic, groq) — optional
            model: Override model name — optional
            temperature: Sampling temperature — default 0.7
            max_tokens: Max output tokens — optional
            timeout_seconds: Request timeout — default 30s
            
        Returns:
            Validated response_model instance
            
        Raises:
            AIProviderError: Provider error (5xx, network)
            AIRateLimitError: Rate limit exceeded (429)
            AITimeoutError: Request timeout
            InvalidGenerationError: Structured output validation failed after repair
        """
        ...
```

### Required Capabilities

| Capability | Specification |
|------------|---------------|
| **Provider Routing** | Primary: Gemini 2.5 Flash. Fallback 1: Anthropic Claude 3.5 Sonnet. Fallback 2: Groq Llama 3.3 70B. Configurable via settings. |
| **Model Selection** | Per-feature default models. Overrideable via `provider`/`model` params. |
| **Retry Policy** | Exponential backoff: 1s, 2s, 4s on 429/503/timeout. Max 3 attempts. |
| **Fallback** | On primary provider failure (after retries), try fallback providers in order. |
| **Response Caching** | 24-hour TTL cache keyed by `(feature, prompt_name, prompt_version, hash(input_data))`. Cache hits return instantly. |
| **Token Tracking** | Count input/output tokens per call. Use provider's tokenizer or `tiktoken` approximation. |
| **Cost Accounting** | Estimate cost per call using provider pricing tables. Log to `ai_calls` table. |
| **Latency Tracking** | Measure wall-clock latency per call. Log to `ai_calls` table. |
| **Structured Output** | Validate against `response_model` (Pydantic). On failure: attempt one repair call with stricter instructions. If repair fails, raise `InvalidGenerationError`. |
| **Prompt Versioning** | Load prompt template from `packages/prompts/{feature}/{prompt_name}.{version}.json`. Template engine: Jinja2 or similar. |
| **Usage Limits** | Enforce per-user daily token budget (configurable). Check before call. Return `AIRateLimitError` if exceeded. |
| **Per-Feature Limits** | Optional per-feature rate limits (e.g., max 10 calls/min for "hook_generator"). |
| **AI Call Logging** | Every call logs to `ai_calls` table: user_id, feature, provider, model, prompt_version, input_tokens, output_tokens, estimated_cost, latency_ms, success, error_message. |
| **Error Normalization** | Provider errors → `AIProviderError`/`AIRateLimitError`/`AITimeoutError`. Never leak provider stack traces. |
| **Timeout Enforcement** | Per-call timeout (default 30s). Cancel on exceed. |

### Request Flow

```mermaid
sequenceDiagram
    participant Feature as Feature Code
    participant Gateway as LLMGateway
    participant Cache as Response Cache
    participant Provider as LLM Provider
    participant DB as ai_calls table
    
    Feature->>Gateway: generate(feature, prompt, input, response_model)
    Gateway->>Gateway: Check daily user token limit
    alt Limit exceeded
        Gateway-->>Feature: AIRateLimitError
    else
        Gateway->>Cache: Lookup cache key
        alt Cache hit
            Cache-->>Gateway: Cached response
            Gateway-->>Feature: Validated response
        else
            Gateway->>Gateway: Build prompt from template + input_data
            Gateway->>Provider: Call with retry/fallback
            alt Success
                Provider-->>Gateway: Raw response
                Gateway->>Gateway: Validate against response_model
                alt Valid
                    Gateway->>Cache: Store in cache (24h TTL)
                    Gateway->>DB: Log ai_call (success=true)
                    Gateway-->>Feature: Validated response
                else Validation failed
                    Gateway->>Gateway: Repair attempt (1x)
                    alt Repair succeeds
                        Gateway->>Cache: Store in cache
                        Gateway->>DB: Log ai_call (success=true)
                        Gateway-->>Feature: Repaired response
                    else Repair fails
                        Gateway->>DB: Log ai_call (success=false)
                        Gateway-->>Feature: InvalidGenerationError
                end
            else Provider error (after retries/fallback)
                Gateway->>DB: Log ai_call (success=false, error)
                Gateway-->>Feature: AIProviderError/AIRateLimitError/AITimeoutError
            end
        end
    end
```

### Configuration

```python
# apps/api/app/core/config.py additions

class LLMSettings(BaseSettings):
    # Provider API keys
    gemini_api_key: str | None = None
    anthropic_api_key: str | None = None
    groq_api_key: str | None = None
    openai_api_key: str | None = None
    
    # Default routing
    llm_default_provider: str = "gemini"
    llm_default_model: str = "gemini-2.5-flash"
    
    # Fallback chain
    llm_fallback_providers: list[str] = ["anthropic", "groq"]
    llm_fallback_models: dict[str, str] = {
        "anthropic": "claude-3-5-sonnet-20241022",
        "groq": "llama-3.3-70b-versatile",
    }
    
    # Limits
    llm_daily_token_limit_per_user: int = 1_000_000
    llm_per_feature_rate_limit: dict[str, int] = {}  # feature -> calls/min
    
    # Timeouts
    llm_default_timeout: float = 30.0
    llm_retry_delays: list[float] = [1.0, 2.0, 4.0]
    
    # Cache
    llm_cache_ttl_seconds: int = 86400  # 24 hours
```

### Usage Example

```python
# In a feature router (e.g., apps/api/app/features/studio/router.py)

from app.core.auth import CurrentUser, get_current_user, get_db_with_user
from app.core.llm import get_llm_gateway
from app.schemas.studio import HookGeneratorInput, HookGeneratorOutput

@router.post("/hooks")
async def generate_hooks(
    input_data: HookGeneratorInput,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_with_user),
    gateway = Depends(get_llm_gateway),
):
    result = await gateway.generate(
        user_id=current_user.id,
        feature="studio_hook_generator",
        prompt_name="hooks/hook_generator",
        prompt_version="v1",
        input_data=input_data.model_dump(),
        response_model=HookGeneratorOutput,
    )
    return result
```

### Prohibited Patterns

The following patterns are **forbidden** in feature code:

```python
# FORBIDDEN - Direct provider calls
from google import genai
client = genai.Client(api_key=settings.gemini_api_key)
response = client.models.generate_content(...)

# FORBIDDEN - Direct Anthropic calls
from anthropic import Anthropic
client = Anthropic(api_key=settings.anthropic_api_key)
response = client.messages.create(...)

# FORBIDDEN - Direct Groq calls
from groq import Groq
client = Groq(api_key=settings.groq_api_key)
response = client.chat.completions.create(...)

# FORBIDDEN - Bypassing gateway for structured output
response = await client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt,
    config=genai.GenerateContentConfig(response_mime_type="application/json", response_schema=MySchema),
)
```

### Migration Path for Donor Modules

| Donor Module | Current Pattern | Migration Target |
|--------------|-----------------|------------------|
| 13_Voice_Replicator (`llm_service.py`) | Direct `google-genai` calls | Route through `LLMGateway.generate()` with `feature="voice_analysis"`, `prompt_name="voice/voice_analysis"` |
| 19_Creator_Second_Brain (`ai/llm.py`) | Direct `groq`/`gemini` calls | Route through `LLMGateway.generate()` with appropriate feature names |
| 11_Comment_to_Content | Direct `anthropic` calls | Route through `LLMGateway.generate()` with `feature="comment_analysis"` |
| 03_Hook_Generator | Direct `@google/genai` | Route through `LLMGateway.generate()` with `feature="hook_generator"` |
| 05_Reel_Script_Builder | Direct `google-genai` via LangChain | Route through `LLMGateway.generate()` with `feature="script_generation"` |
| 08_Caption_Assistant | Mixed Gemini/Anthropic | Route through `LLMGateway.generate()` with `feature="caption_generation"` |

## Consequences

### Positive
- Single point of control for all AI costs, limits, and logging
- Consistent error handling and retry behavior
- Structured output validation across all features
- Prompt versioning and caching reduce costs
- Easy provider switching without feature code changes
- Security: API keys never leave gateway module

### Negative
- Additional abstraction layer (minimal latency overhead)
- All feature teams must adopt gateway pattern
- Requires prompt template management in `packages/prompts/`

## Implementation Priority

**BLOCKS PHASE 2** — The Voice Engine and Memory Engine must use the gateway for all LLM calls. Gateway must be implemented before Phase 2 begins.

## Related Decisions

- ADR-004: RLS Implementation (depends on `user_id` from gateway for `ai_calls` logging)
- ADR-002: Embedding Model Selection (embeddings also route through gateway)
- Prompt management in `packages/prompts/`

## Next Steps

1. Implement `apps/api/app/llm/gateway.py` with core `generate()` method
2. Add provider-specific adapters (Gemini, Anthropic, Groq)
3. Implement structured output validation with repair
4. Add response caching layer
5. Implement usage tracking and limits
6. Write integration tests for gateway
7. Migrate one donor module (e.g., Module 13 `llm_service.py`) as proof-of-concept