# Provider Strategy & Credentials Status — Creator Platform SaaS

*Documents the LLM/embedding provider strategy, credential status, and deployment dependencies*

## Provider Classifications

| Provider | Classification | Purpose | Credential Status |
|----------|---------------|---------|-------------------|
| **Gemini (Google)** | PRIMARY | LLM generation (2.5 Flash), embeddings (future) | **BLOCKED FOR LIVE TESTING** — No API key configured |
| **Anthropic (Claude)** | SECONDARY | LLM fallback, complex reasoning | **BLOCKED FOR LIVE TESTING** — No API key configured |
| **Groq (Llama 3.3 70B)** | SECONDARY | LLM fallback, high-speed inference | **BLOCKED FOR LIVE TESTING** — No API key configured |
| **OpenAI** | OPTIONAL / DEFERRED | Alternative LLM, embeddings (text-embedding-3-small) | **DEFERRED** — Not needed for Phase 2 |
| **intfloat/multilingual-e5-small** | PRIMARY (Local) | Embeddings (384d, multilingual) | **AVAILABLE** — Runs locally via sentence-transformers, no API key needed |
| **BAAI/bge-small-en-v1.5** | REJECTED | Embeddings (English-only) | **REJECTED** — Per ADR-002 |
| **all-MiniLM-L6-v2** | REJECTED | Embeddings (lower multilingual quality) | **REJECTED** — Per ADR-002 |
| **Ollama** | LOCAL DEVELOPMENT | Local LLM inference (optional) | **LOCAL DEVELOPMENT** — Optional for offline dev |

## Credential Requirements

### Required for Production (Phase 2+)

| Variable | Provider | Required For | Status |
|----------|----------|--------------|--------|
| `GEMINI_API_KEY` | Google | Primary LLM generation | **MISSING** — Add to `.env` |
| `ANTHROPIC_API_KEY` | Anthropic | Fallback LLM | **MISSING** — Add to `.env` |
| `GROQ_API_KEY` | Groq | Fallback LLM (speed) | **MISSING** — Add to `.env` |

### Not Required for Phase 2 Architecture

| Variable | Reason |
|----------|--------|
| `OPENAI_API_KEY` | Deferred — text-embedding-3-small not selected |
| `YOUTUBE_API_KEY` | Module 19 feature — Phase 5 |
| `INSTAGRAM_APP_ID/SECRET` | Module 11/15 features — Phase 5 |

## Local Development Strategy

### Embeddings (No Credentials Needed)
- `intfloat/multilingual-e5-small` runs locally via `sentence-transformers`
- Downloads model weights on first run (~400MB)
- Runs on CPU, no GPU required
- No API keys or external dependencies

### LLM Development (Mock/Stub Mode)
Since production API keys are **BLOCKED FOR LIVE TESTING**, Phase 2 development can proceed using:

1. **Mock LLM Gateway** — Returns deterministic responses for testing
2. **Local Ollama** (optional) — Run Llama 3.1 locally for realistic behavior
3. **Recording/Playback** — Record real API responses, replay in tests

### Mock Gateway Implementation (Recommended for Phase 2 Start)

```python
# apps/api/app/llm/mock_gateway.py
class MockLLMGateway:
    """Deterministic mock for Phase 2 development without API keys."""
    
    async def generate(self, **kwargs) -> BaseModel:
        # Return valid structured responses based on feature
        if "hook" in kwargs["feature"]:
            return HookGeneratorOutput(hooks=[...])
        elif "voice" in kwargs["feature"]:
            return VoiceAnalysisOutput(...)
        # etc.
```

This allows Phase 2 architecture work (Voice Engine, Memory Engine, Studio pipeline) to proceed **without waiting for production API keys**.

## Production Credential Management

| Environment | Strategy |
|-------------|----------|
| Local Dev | `.env` file (gitignored) |
| CI/CD | GitHub Secrets / GitLab Variables |
| Staging | Platform secrets (Vercel, Render, Fly.io, etc.) |
| Production | Platform secrets + rotation policy |

**Never commit credentials to git.** The `.env.example` documents required variables; actual `.env` is gitignored.

## Provider Fallback Chain (Per ADR-003)

```
Primary:     Gemini 2.5 Flash          (requires GEMINI_API_KEY)
    ↓ fail
Fallback 1:  Anthropic Claude 3.5 Sonnet  (requires ANTHROPIC_API_KEY)
    ↓ fail
Fallback 2:  Groq Llama 3.3 70B        (requires GROQ_API_KEY)
    ↓ fail
Error:       AIProviderError (all exhausted)
```

**Development Note**: Without API keys, the gateway will immediately exhaust fallbacks and return `AIProviderError`. The mock gateway (above) should be used for Phase 2 development.

## Embedding Provider (No Credentials)

| Aspect | Detail |
|--------|--------|
| Model | `intfloat/multilingual-e5-small` |
| Library | `sentence-transformers` (PyTorch) |
| Runtime | Local CPU, no API key |
| Download | ~400MB on first run (cached) |
| Dimensions | 384 |
| Language Support | 100+ including Tamil, Hindi, English |

**No credentials required.** Works fully offline after initial model download.

## Migration Notes for Donor Modules

| Module | Current Provider | Migration Target |
|--------|------------------|------------------|
| 13_Voice_Replicator | Gemini (google-genai) | LLM Gateway → Gemini |
| 19_Creator_Second_Brain | Groq + fastembed BGE | LLM Gateway → Groq/Gemini; Embeddings → multilingual-e5-small |
| 11_Comment_to_Content | Anthropic | LLM Gateway → Anthropic |
| 03_Hook_Generator | Gemini | LLM Gateway → Gemini |
| 05_Reel_Script_Builder | Gemini (LangChain) | LLM Gateway → Gemini |
| 08_Caption_Assistant | Gemini/Anthropic | LLM Gateway → Gemini/Anthropic |
| 09_CTA_Generator | Anthropic | LLM Gateway → Anthropic |

## Summary

| Category | Status |
|----------|--------|
| **Embeddings** | ✅ READY — Local model, no credentials needed |
| **Primary LLM (Gemini)** | ❌ BLOCKED FOR LIVE TESTING — API key needed |
| **Fallback LLM (Anthropic)** | ❌ BLOCKED FOR LIVE TESTING — API key needed |
| **Fallback LLM (Groq)** | ❌ BLOCKED FOR LIVE TESTING — API key needed |
| **Phase 2 Architecture** | ✅ CAN PROCEED — Use mock gateway for development |
| **Production Launch** | ❌ BLOCKED — All three API keys required |

## Action Required

**Human Decision Needed**: Provide production API keys for:
1. `GEMINI_API_KEY` — Google AI Studio
2. `ANTHROPIC_API_KEY` — Anthropic Console
3. `GROQ_API_KEY` — Groq Console

**Phase 2 Development**: Can start immediately using mock gateway. Real provider integration happens when keys are available.