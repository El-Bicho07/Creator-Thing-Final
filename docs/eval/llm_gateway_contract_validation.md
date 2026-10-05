# LLM Gateway Contract Validation

*Validates ADR-003 against IMPLEMENTATION_PLAN.md requirements*

## Validation Checklist

| Requirement (from IMPLEMENTATION_PLAN.md §14) | ADR-003 Coverage | Status |
|---|---|---|
| **Provider routing** | Section "Provider Routing" - Primary: Gemini, Fallback: Anthropic, Groq | ✅ COVERED |
| **Model routing** | Section "Model Selection" - Per-feature defaults, overrideable | ✅ COVERED |
| **Timeouts** | Core interface: `timeout_seconds: float = 30.0` | ✅ COVERED |
| **Retry** | "Retry Policy" - Exponential backoff 1s, 2s, 4s, max 3 attempts | ✅ COVERED |
| **Backoff** | Exponential backoff: 1s, 2s, 4s | ✅ COVERED |
| **Fallback** | "Fallback" - Try fallback providers after retries | ✅ COVERED |
| **Caching** | "Response Caching" - 24hr TTL, keyed by feature+prompt+input | ✅ COVERED |
| **Token tracking** | "Token Tracking" - Count input/output tokens | ✅ COVERED |
| **Cost tracking** | "Cost Accounting" - Estimate cost, log to `ai_calls` | ✅ COVERED |
| **Latency tracking** | "Latency Tracking" - Wall-clock latency, log to `ai_calls` | ✅ COVERED |
| **Structured output validation** | "Structured Output" - Pydantic validation, one repair attempt | ✅ COVERED |
| **Prompt versioning** | "Prompt Versioning" - Load from `packages/prompts/` | ✅ COVERED |
| **Usage limits** | "Usage Limits" - Per-user daily token budget | ✅ COVERED |
| **Per-feature limits** | "Per-Feature Limits" - Configurable rate limits | ✅ COVERED |
| **AI call logging** | "AI Call Logging" - All fields specified in `ai_calls` table | ✅ COVERED |

## Contract Completeness: ✅ PASS

All 14 required capabilities from IMPLEMENTATION_PLAN.md §14 are covered.

## Additional Strengths

1. **Explicit error types**: `AIProviderError`, `AIRateLimitError`, `AITimeoutError`, `InvalidGenerationError`
2. **Structured output repair**: One automatic repair attempt before failing
3. **Prompt versioning**: Explicit versioning from `packages/prompts/`
4. **Error normalization**: Provider errors never leak to clients
5. **Usage limits**: Per-user daily token budget + per-feature rate limits
6. **Timeout enforcement**: Per-call timeout with cancellation
7. **Clear prohibited patterns**: Explicitly documents forbidden direct-provider patterns

## Gaps / Considerations

| Item | Status | Notes |
|---|---|---|
| Streaming responses | Not specified | May be needed for Studio real-time generation |
| Provider-specific parameters | Partially covered | `temperature`, `max_tokens` exposed; provider-specific params not addressed |
| Batch/multi-call optimization | Not specified | Could be added later |
| Model deprecation handling | Not specified | Should be considered for long-term |

## Validation Result: ✅ CONTRACT APPROVED

The LLM Gateway contract is complete and ready for implementation. No blocking gaps identified.

## Next Steps

1. [ ] Implement `apps/api/app/llm/gateway.py` with core `generate()` method
2. [ ] Add provider-specific adapters (Gemini, Anthropic, Groq)
3. [ ] Implement structured output validation with repair
4. [ ] Add response caching layer (Redis or in-memory)
5. [ ] Implement usage tracking and limits
6. [ ] Write integration tests
7. [ ] Migrate Module 13 `llm_service.py` as proof-of-concept

## Sequencing Within Phase 2

The LLM Gateway implementation is the **first Phase 2 implementation task**, not a prerequisite that blocks Phase 2 from starting.

```text
USER APPROVAL
      ↓
PHASE 2 START
      ↓
LLM GATEWAY IMPLEMENTATION   ← first task
      ↓
LLM GATEWAY TESTS
      ↓
EMBEDDING SERVICE
      ↓
VOICE ENGINE / MEMORY ENGINE  ← must not proceed until gateway tests pass
```

Voice Engine and Memory Engine depend on the gateway for all LLM and embedding calls, so their integration **must not begin** until the gateway implementation is complete and its tests pass.