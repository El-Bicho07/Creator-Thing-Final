# Target Architecture Specification — Creator SaaS Platform (Solo Creator OS)

---

## 1. System Vision & Continuous Loop

The **Creator SaaS Platform** (Solo Creator OS) is a unified, multi-tenant Creator Operating System designed to help creators move through a continuous production loop:

$$\text{Remember} \longrightarrow \text{Decide} \longrightarrow \text{Make} \longrightarrow \text{Distribute} \longrightarrow \text{Learn}$$

```
                          ┌─────────────────────────────┐
                          │         REMEMBER            │
                          │ (Library / Second Brain RAG)│
                          └──────────────┬──────────────┘
                                         │
                                         ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│            LEARN            │   │           DECIDE            │
│ (Coach / Analytics Copilot) │   │ (Today / Creative Producer) │
└──────────────▲──────────────┘   └──────────────┬──────────────┘
               │                                 │
               │                                 ▼
┌──────────────┴──────────────┐   ┌─────────────────────────────┐
│          DISTRIBUTE         │   │            MAKE             │
│ (Multi-platform Formats)    │   │  (Studio 7-Stage Pipeline)  │
└─────────────────────────────┘   └──────────────▲──────────────┘
```

---

## 2. Directory & Component Architecture

```text
Creator Platform SaaS
│
├── apps/
│   ├── web/                     # Next.js 15+ Unified Web Application (React, Tailwind CSS, Lucide icons)
│   │   ├── app/
│   │   │   ├── (auth)/          # Login & Signup routes
│   │   │   ├── start/           # Creator Onboarding & Profile Setup
│   │   │   ├── today/           # Daily Decision & Creative Producer Dashboard
│   │   │   ├── studio/          # Unified 7-Stage Content Production Studio
│   │   │   │   └── [id]/        # Active Content Workflow Session
│   │   │   ├── coach/           # Performance Feedback & Scorecard Coach
│   │   │   ├── growth/          # Audience Comments & Performance Analytics
│   │   │   └── library/         # RAG Second Brain & Voice Profile Manager
│   │   ├── components/          # UI Components & Navigation Shell
│   │   └── lib/                 # API Client & Auth Client (Supabase)
│   │
│   └── api/                     # FastAPI Backend Application (Python 3.10+)
│       ├── main.py              # Application entrypoint & CORS middleware
│       ├── core/                # Configuration, Auth JWT verification, Logging & Errors
│       ├── llm/                 # Centralized AI Gateway (Retry, Limits, Usage, Prompts)
│       ├── memory/              # PostgreSQL + pgvector RAG memory engine
│       ├── voice/               # Centralized Creator Voice & Style Intelligence engine
│       ├── agents/              # Studio & Producer Workflow Orchestrator
│       ├── jobs/                # Async Background Job Tracker
│       └── features/            # API Router Features (start, today, studio, coach, growth, library)
│
├── packages/
│   ├── prompts/                 # Versioned prompt assets (ideas, hooks, captions, CTAs, voice, etc.)
│   └── contracts/               # Shared TypeScript & Pydantic JSON schemas
│
├── infra/
│   ├── docker-compose.yml       # Docker environment (PostgreSQL + pgvector, FastAPI, Next.js)
│   └── db/
│       └── migrations/          # PostgreSQL schema & Row Level Security (RLS) policies
│
├── docs/                        # Architecture, matrix, audits, ADRs, & evaluation rubrics
├── scripts/                     # Operational & test helper scripts
├── modules/                     # READ-ONLY Donor Prototypes (24 modules)
└── _source/                     # Internal source metadata (Ignored)
```

---

## 3. Core Technical Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide Icons, Supabase Auth Client.
- **Backend API:** FastAPI, Pydantic v2, SQLAlchemy 2.0 (Async), `psycopg` / `asyncpg`, spaCy.
- **Database & Vector Engine:** PostgreSQL 16+ with `pgvector` extension & Row Level Security (RLS).
- **Authentication:** Supabase Auth (JWT verified statelessly on API requests).
- **AI Gateway:** Unified provider interface supporting Gemini (`@google/genai`), Anthropic (`claude-3-5-sonnet`), Groq (`llama-3.3-70b`), with retry, backoff, usage tracking, and structured output validation.
- **Embedding Model:** `intfloat/multilingual-e5-base` (**768 dimensions**) via `sentence-transformers` (see ADR-002 §13). Encoding convention: **`query: ` for queries, `passage: ` for stored documents** — mandatory for E5 and applied inside the `EmbeddingService`, never by feature code.

---

## 4. Multi-Tenancy & Data Isolation Model

### 4.1 Identity Source of Truth

**Client-supplied `user_id` is never trusted.** The authenticated identity is derived exclusively from the validated Supabase JWT. Any `user_id` present in a request body, query string, or path is ignored for authorization purposes.

The tenant-isolation boundary is enforced at **PostgreSQL Row Level Security (RLS)**, not in application code. Application-level filtering is defense-in-depth only; RLS is authoritative.

### 4.2 Verified Request Flow

```text
Supabase JWT (Bearer token)
      ↓
FastAPI: get_current_user_id() — verifies RS256 signature via JWKS
      ↓
FastAPI: get_db_with_user() — dependency injects user context
      ↓
PostgreSQL: SET LOCAL request.jwt.claims = <verified JWT payload>
      ↓
PostgreSQL: current_user_id() — reads 'sub' from request.jwt.claims
      ↓
RLS policies: USING (current_user_id() = user_id) WITH CHECK (...)
      ↓
Only rows owned by the authenticated user are visible / writable
```

### 4.3 Connection Role

The API connects to PostgreSQL as the **non-superuser** role `api_user` (created in `infra/db/migrations/000_create_api_user.sql`).

This is deliberate: PostgreSQL **bypasses RLS for superusers and roles with `BYPASSRLS`**. Connecting as `api_user` guarantees that RLS cannot be circumvented by the application connection, regardless of application bugs.

```sql
-- infra/db/migrations/000_create_api_user.sql
CREATE ROLE api_user WITH LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE creator_platform TO api_user;
GRANT USAGE ON SCHEMA public TO api_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO api_user;
```

### 4.4 Schema Ownership

Every creator-owned table includes a `user_id` column referencing `users(id)` (a local authentication-support table, not Supabase's `auth.users`).

```sql
CREATE TABLE voice_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    style_name VARCHAR(100) DEFAULT 'Primary Style',
    pacing_score FLOAT NOT NULL DEFAULT 0.5,
    vocabulary_richness FLOAT NOT NULL DEFAULT 0.5,
    tone_fingerprint JSONB NOT NULL DEFAULT '{}',
    formatting_rules JSONB NOT NULL DEFAULT '[]',
    forbidden_words JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_voice_profiles_isolation ON voice_profiles
    FOR ALL USING (current_user_id() = user_id)
          WITH CHECK (current_user_id() = user_id);
```

### 4.5 Identity Helper Function

```sql
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        nullif(current_setting('request.jwt.claims', true), '')::json->>'sub',
        '00000000-0000-0000-0000-000000000000'
    )::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN '00000000-0000-0000-0000-000000000000'::UUID;
END;
$$ LANGUAGE plpgsql STABLE;
```

If no JWT context is set, the function returns the zero UUID, which matches **no** row — a fail-safe default that returns empty results rather than all rows.

### 4.6 Coverage

All **13** tables carry RLS with both `USING` and `WITH CHECK` clauses:

`users`, `creator_profiles`, `voice_profiles`, `content_assets`, `chunks`, `ideas`, `plan_items`, `performance_records`, `comments`, `comment_insights`, `lessons`, `jobs`, `ai_calls`

### 4.7 Verification Status

**CROSS-USER ISOLATION: TESTED AND VERIFIED**

| Scenario | Result |
|---|---|
| User A reads own `creator_profiles` | PASS |
| User A reads User B's `creator_profiles` | PASS (0 rows) |
| User A updates User B's `creator_profiles` | PASS (0 rows affected) |
| User A deletes User B's `creator_profiles` | PASS (0 rows affected) |
| User A reads User B's `chunks` (embeddings) | PASS (0 rows) |
| User A reads User B's `jobs` | PASS (0 rows) |
| User A reads User B's `ai_calls` | PASS (0 rows) |

Test suite: `apps/api/tests/security/`. Rationale and options: ADR-004.

---

## 5. Centralized AI Gateway Architecture

> **Status: IMPLEMENTED AND VERIFIED (Phase 2)** — see `app/llm/gateway.py` and ADR-003.

All AI calls across all features must execute through `apps/api/app/llm/gateway.py` per ADR-003.

```python
# Actual call shape
result = await llm_gateway.generate(
    user_id=current_user.id,
    feature="studio_hook_generator",
    prompt_name="hooks/hook_generator",
    prompt_version="v1",
    input_data={"topic": "SaaS Marketing", "niche": "Tech Creators"},
    response_model=HookGeneratorOutput
)
```

The contract specifies (14/14 capabilities validated):
- Provider routing (Gemini primary, Anthropic/Groq fallback)
- Model routing and timeout enforcement
- Retry with exponential backoff
- Response caching (24h TTL)
- Structured output validation via Pydantic with one repair attempt
- Prompt versioning from `packages/prompts/`
- Token usage, cost, and latency tracking logged to `ai_calls`
- Per-user and per-feature limits
- Error normalization (no raw provider errors leak to clients)

**Feature code must not import `google-genai`, `anthropic`, `groq`, or `openai` directly.**

---

## 6. Shared Voice & Memory Intelligence Engine

> **Status: IMPLEMENTED AND VERIFIED (Phase 2)**

### Voice Engine (`apps/api/app/voice/`) — ADAPTED from Module 13
Shared platform capability. Uses `EmbeddingService` and `LLMGateway`; owns
neither a vector store, an LLM client, nor an auth path.
1. `engine.py`: deterministic feature extraction (ADAPTED from Module 13
   `text_analyzer.py`), profile aggregation, and voice-match scoring
   (ADAPTED from `style_analyzer.py` / `validation_service.py`).
2. Canonical profile lives in `voice_profiles` under `user_id` + RLS. A creator
   may keep several **named** profiles (e.g. `Primary Style`, `Tamil Explainer`);
   uniqueness is on `(user_id, style_name)` (migration 005).
3. Module 13's hash-vectorizer "embedding service" was **rebuilt away** — it was
   a bag-of-words hash using Python's per-process-salted `hash()`, i.e. not even
   reproducible across restarts.

### Long-Term Memory Engine (`apps/api/app/memory/`) — ADAPTED from Module 19
Platform-wide RAG service.
1. `retrieval.py`: `ingest` / `retrieve` / `summarize_asset` / `update_chunk` /
   `delete_asset` / `stats`, over the shared `content_assets` + `chunks` tables.
2. `chunking.py`: **token-bounded** chunking via the embedding tokenizer, so a
   chunk never silently loses its tail at E5's 512-token limit.
3. `policy.py`: the memory write policy (task §29) plus credential/PII redaction.
4. `reembed.py`: the operational re-embedding tool used for the 384 → 768
   migration. Runs on the RLS-bypassing admin role, offline only.
5. Module 19's `fastembed` BGE space and its `channel_id` isolation were both
   **removed**; `= ANY` scoping is defence in depth, RLS remains authoritative.

### Unified Vector Architecture

```text
Creator Voice Engine ─┐
                      ├─> EmbeddingService ─> multilingual-e5-base (768-d)
Long-Term Memory Engine ┘                              ↓
                                            PostgreSQL + pgvector
                                            chunks.embedding vector(768)
```

There is exactly **one** vector persistence layer and **one** embedding
abstraction. No feature module knows it is using E5-base. Enforced by
`tests/integration/test_architecture_contract.py`.
