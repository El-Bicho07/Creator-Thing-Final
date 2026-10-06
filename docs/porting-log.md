# Porting Log — Creator SaaS Platform

*Records the provenance of all code ported from donor modules in `modules/` to the unified architecture under `apps/`, `packages/`, `infra/`.*

---

## Porting Convention

Each entry follows this format:
```python
# Ported from: modules/<module_name>/<path>
# Destination: apps/<app>/<path> or packages/<package>/<path>
# Classification: PORT | ADAPT | REBUILD
# Changes: <summary of modifications>
```

---

## Phase 1 — Foundation (Current Phase)

### apps/api/app/core/config.py
- **Ported from:** New implementation (no direct donor equivalent)
- **Destination:** apps/api/app/core/config.py
- **Classification:** REBUILD
- **Changes:** Centralized Pydantic settings for all environment variables, replaces scattered config across modules

### apps/api/app/core/db.py
- **Ported from:** New implementation
- **Destination:** apps/api/app/core/db.py
- **Classification:** REBUILD
- **Changes:** Async SQLAlchemy 2.0 setup with asyncpg, replaces sync DB in modules 13, 19, 18

### apps/api/app/core/auth.py
- **Ported from:** New implementation
- **Destination:** apps/api/app/core/auth.py
- **Classification:** REBUILD
- **Changes:** Supabase JWT verification middleware, replaces ad-hoc auth in modules 11, 18, 18_Guruvelah

### apps/api/app/core/errors.py
- **Ported from:** New implementation
- **Destination:** apps/api/app/core/errors.py
- **Classification:** REBUILD
- **Changes:** Standardized error codes (AI_PROVIDER_ERROR, AI_RATE_LIMIT, etc.), replaces raw provider errors

### apps/api/app/core/logging.py
- **Ported from:** New implementation
- **Destination:** apps/api/app/core/logging.py
- **Classification:** REBUILD

### apps/api/app/main.py
- **Ported from:** New implementation
- **Destination:** apps/api/app/main.py
- **Classification:** REBUILD
- **Changes:** FastAPI app with lifespan, CORS, error handlers, health endpoints

### apps/api/app/core/auth.py (RLS Fix)
- **Ported from:** New implementation (Phase 1 blocker fix)
- **Destination:** apps/api/app/core/auth.py
- **Classification:** REBUILD
- **Changes:** Added `get_db_with_user` dependency that sets `request.jwt.claims` PostgreSQL session variable for RLS enforcement

### infra/db/migrations/000_create_api_user.sql
- **Ported from:** New implementation (Phase 1 blocker fix)
- **Destination:** infra/db/migrations/000_create_api_user.sql
- **Classification:** REBUILD
- **Changes:** Creates non-superuser `api_user` role for API connections, ensuring RLS is enforced (superusers bypass RLS)

### infra/db/migrations/002_core_schema.sql (RLS Fix)
- **Ported from:** modules/13_Voice_Replicator (voice_profiles), modules/19_Creator_Second_Brain (assets, chunks), modules/18_Guruvelah (creator_profiles), modules/11 (comments), modules/21 (plan_items)
- **Destination:** infra/db/migrations/002_core_schema.sql
- **Classification:** ADAPT
- **Changes:** 
  - Moved `current_user_id()` function BEFORE table creation (fixes function-not-found error)
  - Fixed `users` table policy to use `current_user_id()` instead of `auth.uid()`
  - All 13 tables have RLS with `current_user_id()` isolation
  - Added `api_user` grants via migration 000

### apps/api/tests/security/test_rls_policies.py
- **Ported from:** New implementation (Phase 1 blocker fix)
- **Destination:** apps/api/tests/security/test_rls_policies.py
- **Classification:** NEW
- **Changes:** Cross-user isolation tests verifying RLS enforcement on all 13 tables

### docs/decisions/003-llm-gateway-contract.md
- **Ported from:** New implementation (Phase 1 blocker fix)
- **Destination:** docs/decisions/003-llm-gateway-contract.md
- **Classification:** NEW
- **Changes:** LLM Gateway contract specification — centralized AI gateway contract required before Phase 2

### docs/decisions/004-rls-implementation.md
- **Ported from:** New implementation (Phase 1 blocker fix)
- **Destination:** docs/decisions/004-rls-implementation.md
- **Classification:** NEW
- **Changes:** RLS implementation decision document — documents Option B (DB dependency) + Option D (non-superuser role)

### docs/decisions/005-migration-management.md
- **Ported from:** New implementation (Phase 1 blocker fix)
- **Destination:** docs/decisions/005-migration-management.md
- **Classification:** NEW
- **Changes:** Migration management decision — versioned SQL files in infra/db/migrations/

### infra/docker-compose.yml (RLS Fix)
- **Ported from:** modules/13_Voice_Replicator/docker-compose.yml, modules/19_Creator_Second_Brain/docker-compose.yml
- **Destination:** infra/docker-compose.yml
- **Classification:** ADAPT
- **Changes:** Updated API service to connect as `api_user` (non-superuser) instead of `creator` (superuser), ensuring RLS enforcement

### .env.example / .env (RLS Fix)
- **Ported from:** New implementation
- **Destination:** .env.example, .env
- **Classification:** ADAPT
- **Changes:** Updated DATABASE_URL to use `api_user:api_password` instead of `creator:changeme`

### apps/api/app/features/*/router.py
- **Ported from:** New implementation
- **Destination:** apps/api/app/features/{start,today,studio,coach,growth,library}/router.py
- **Classification:** REBUILD
- **Changes:** 6 feature routers with stub endpoints, all using `get_db_with_user` for RLS context
- **Ported from:** New implementation
- **Destination:** apps/api/app/main.py
- **Classification:** REBUILD
- **Changes:** FastAPI app with lifespan, CORS, error handlers, health endpoints

### apps/web/app/layout.tsx + Navigation.tsx
- **Ported from:** modules/18_AI_Content_Director_Guruvelah (navigation patterns)
- **Destination:** apps/web/components/Navigation.tsx, apps/web/app/layout.tsx
- **Classification:** ADAPT
- **Changes:** Extracted navigation shell from Guruvelah, adapted to 6-tab product navigation (Start, Today, Studio, Coach, Growth, Library), removed module-specific routes

### apps/web/app/start/page.tsx
- **Ported from:** modules/18_AI_Content_Director_Guruvelah (onboarding flow)
- **Destination:** apps/web/app/start/page.tsx
- **Classification:** ADAPT
- **Changes:** Simplified to landing page linking to 4-step onboarding wizard

### apps/web/app/today/page.tsx
- **Ported from:** modules/04_Daily_Content_Planner (UI concepts)
- **Destination:** apps/web/app/today/page.tsx
- **Classification:** ADAPT
- **Changes:** Adapted daily planner UI to use Producer recommendations, priority badges, time budget

### apps/web/app/studio/page.tsx
- **Ported from:** modules/18_AI_Content_Director (7-stage pipeline concept)
- **Destination:** apps/web/app/studio/page.tsx
- **Classification:** ADAPT
- **Changes:** Session list view with progress tracking across 7 stages

### apps/web/app/coach/page.tsx
- **Ported from:** modules/21_Autonomous_Content_Pipeline (critic concepts)
- **Destination:** apps/web/app/coach/page.tsx
- **Classification:** ADAPT
- **Changes:** 4-dimension scorecard (Hook, Pacing, Voice Match, Value), lesson extraction UI

### apps/web/app/growth/page.tsx
- **Ported from:** modules/10_Comment_Analyzer, modules/11_Comment_to_Content
- **Destination:** apps/web/app/growth/page.tsx
- **Classification:** ADAPT
- **Changes:** Combined comment themes, sentiment, content opportunities into unified dashboard

### apps/web/app/library/page.tsx
- **Ported from:** modules/19_Creator_Second_Brain (RAG search, knowledge graph), modules/13_Voice_Replicator (voice profile)
- **Destination:** apps/web/app/library/page.tsx
- **Classification:** ADAPT
- **Changes:** 5-tab layout (All Content, Second Brain, Voice Profile, Recycle, Import), semantic search placeholder

### infra/docker-compose.yml
- **Ported from:** modules/13_Voice_Replicator/docker-compose.yml, modules/19_Creator_Second_Brain/docker-compose.yml
- **Destination:** infra/docker-compose.yml
- **Classification:** ADAPT
- **Changes:** Unified single compose file with postgres+pgvector, api, web services

### infra/db/migrations/001_enable_extensions.sql
- **Ported from:** modules/13_Voice_Replicator/backend/alembic/versions/*, modules/19_Creator_Second_Brain/backend/alembic/*
- **Destination:** infra/db/migrations/001_enable_extensions.sql
- **Classification:** ADAPT
- **Changes:** Consolidated extensions (vector, uuid-ossp)

### infra/db/migrations/002_core_schema.sql
- **Ported from:** modules/13_Voice_Replicator (voice_profiles), modules/19_Creator_Second_Brain (assets, chunks), modules/18_Guruvelah (creator_profiles), modules/11 (comments), modules/21 (plan_items)
- **Destination:** infra/db/migrations/002_core_schema.sql
- **Classification:** ADAPT
- **Changes:** Unified schema with all 12 tables, mandatory user_id + RLS on every table, pgvector(384) for chunks

### packages/prompts/start/onboarding.v1.json
- **Ported from:** modules/18_AI_Content_Director_Guruvelah (onboarding prompts)
- **Destination:** packages/prompts/start/onboarding.v1.json
- **Classification:** PORT
- **Changes:** Versioned prompt with explicit input/output schemas

### packages/prompts/today/daily_plan.v1.json
- **Ported from:** modules/04_Daily_Content_Planner, modules/21_Autonomous_Content_Pipeline
- **Destination:** packages/prompts/today/daily_plan.v1.json
- **Classification:** ADAPT
- **Changes:** Producer-focused prompt with creator context, voice, memory, lessons, time budget

### packages/prompts/studio/stage4_script.v1.json
- **Ported from:** modules/05_Reel_Script_Builder, modules/18_AI_Content_Director (script stage)
- **Destination:** packages/prompts/studio/stage4_script.v1.json
- **Classification:** PORT
- **Changes:** Added voice_profile and relevant_examples for voice-enforced generation

### packages/prompts/hooks/hook_generator.v1.json
- **Ported from:** modules/03_Hook_Generator
- **Destination:** packages/prompts/hooks/hook_generator.v1.json
- **Classification:** PORT
- **Changes:** Added voice_profile context, structured output with why_it_works

### packages/contracts/index.ts
- **Ported from:** New implementation (derived from IMPLEMENTATION_PLAN.md database schema)
- **Destination:** packages/contracts/index.ts
- **Classification:** REBUILD
- **Changes:** TypeScript interfaces matching all 12 database tables + API request/response types

---

## Upcoming Porting (Phase 2+)

### Phase 2 — Voice + Memory Engines
- modules/13_Voice_Replicator/backend/app/services/content_analyzer.py → apps/api/app/voice/analyzer.py
- modules/13_Voice_Replicator/backend/app/services/voice_profile.py → apps/api/app/voice/profile.py
- modules/13_Voice_Replicator/backend/app/services/style_validator.py → apps/api/app/voice/validators.py
- modules/19_Creator_Second_Brain/backend/ingest/ → apps/api/app/memory/assets.py
- modules/19_Creator_Second_Brain/backend/ingest/chunker.py → apps/api/app/memory/chunks.py
- modules/19_Creator_Second_Brain/backend/search/ → apps/api/app/memory/retrieval.py
- modules/19_Creator_Second_Brain/backend/ai/embeddings.py → apps/api/app/memory/embeddings.py

### Phase 3 — Studio Pipeline
- modules/01_Content_Idea_Generator → packages/prompts/ideas/
- modules/12_Creator_Research_Assistant → packages/prompts/research/
- modules/03_Hook_Generator → packages/prompts/hooks/
- modules/05_Reel_Script_Builder → packages/prompts/scripts/
- modules/07_Thumbnail_Ideator → packages/prompts/studio/stage5_visuals.v1.json
- modules/08_Caption_Assistant → packages/prompts/captions/
- modules/09_CTA_Generator → packages/prompts/ctas/
- modules/02_Content_Repurposer → packages/prompts/studio/stage7_publishing.v1.json

### Phase 4 — Today / Producer
- modules/04_Daily_Content_Planner → apps/api/app/features/today/planner.py
- modules/21_Autonomous_Content_Pipeline → apps/api/app/features/today/producer.py (state machine)
- NEW → apps/api/app/features/today/producer.py (Creative Producer engine)

### Phase 5 — Growth
- modules/10_Comment_Analyzer → apps/api/app/features/growth/comment_analyzer.py
- modules/11_Comment_to_Content → apps/api/app/features/growth/comment_to_content.py
- NEW → apps/api/app/features/growth/copilot.py (Analytics Copilot)

### Phase 6 — Coach
- modules/21_Autonomous_Content_Pipeline (critic) → apps/api/app/features/coach/scorecard.py
- modules/13_Voice_Replicator (validator) → apps/api/app/features/coach/voice_match.py
- NEW → apps/api/app/features/coach/lesson_extractor.py

### Parked (v2)
- modules/14_Podcast_Assistant
- modules/17_Brand_Pitch_Builder
- modules/20_AI_Screenplay_Workspace
- modules/26_Creator_Collaboration_Finder
---

## Phase 2 — Shared AI Primitives

Classification was determined by reading the donor source, not by directory
name. `modules/` remains read-only and unmodified.

### Legend
| Class | Meaning |
|---|---|
| **PORT** | Move logic essentially unchanged into the platform layer |
| **ADAPT** | Keep the logic, rewrite interfaces to platform contracts (RLS, user scoping, shared services) |
| **REBUILD** | Donor capability is retained in intent but its implementation is unusable/unsafe/incompatible |
| **NEW** | No donor equivalent; built for the platform |
| **PARK** | Deliberately not carried into Phase 2 |

---

### Module 13 — Voice Replicator

| Donor file | Lines | Class | Destination | Rationale |
|---|---:|---|---|---|
| `services/text_analyzer.py` | 199 | **ADAPT** | `app/voice/analyzer.py` | Pure-Python deterministic feature extraction (sentence length, emoji, pronoun, CTA/keyword scoring, hashtag counts). Valuable and dependency-light. Rewritten to be async-free and return a typed schema; spacy made optional. |
| `services/style_analyzer.py` | 175 | **ADAPT** | `app/voice/profile.py` | Aggregates per-post features into a tone/vocabulary/formatting fingerprint. Output shape mapped onto the platform `voice_profiles` columns. |
| `services/validation_service.py` | 147 | **ADAPT** | `app/voice/validators.py` | Voice-match scoring + originality check. Rewired to load the profile from `voice_profiles` (RLS-scoped) instead of a donor `project_id`. |
| `services/embedding_service.py` | 30 | **REBUILD** | `app/ai/embedding/service.py` | **Donor is a deterministic hash vectorizer, not an embedding model.** Two defects: (a) it is a bag-of-words hash, not semantic; (b) it uses Python's built-in `hash()`, which is salted per process, so its output is **not reproducible across restarts**. Replaced entirely by `EmbeddingService` (E5-base, 768-d). |
| `services/llm_service.py` | 92 | **REBUILD** | `app/llm/gateway.py` | Direct `google-genai` calls. Forbidden by ADR-003. All generation now routes through the gateway. |
| `services/prompt_builder.py` | 77 | **PARK** | — | Prompt text becomes versioned assets under `packages/prompts/voice/`; the builder itself is superseded by the gateway's prompt registry. |
| `services/image_analyzer.py` | 105 | **PARK** | — | Visual/image analysis is out of Phase 2 scope (needs vision provider + storage). |
| `services/retrieval_service.py` | 60 | **REBUILD** | `app/voice/retrieval.py` | Donor retrieves over its own hash space. Reimplemented on the unified E5/pgvector path. |
| `models/*.py` (8 tables) | ~270 | **PARK** | — | Donor `projects`/`posts`/`drafts`/`style_profiles`/`embeddings`/`validations` all keyed by donor `project_id`. Platform uses `voice_profiles` + `users`; donor tables are **not** carried over. |
| `alembic/` | — | **PARK** | — | ADR-005 selects versioned SQL; no Alembic. |
| `backend/app/api/routes/*` (6) | — | **PARK** | — | Donor HTTP surface superseded by `/api/voice/*`. |
| `frontend/` | — | **PARK** | — | Full Studio/Library UX deferred to Phase 3 per §33. |

**Voice capabilities retained:** profile creation, style/feature analysis,
writing characteristics, tone scoring, structure, vocabulary patterns,
voice-match validation, profile retrieval, profile updates.

### Module 19 — Creator Second Brain

| Donor file | Lines | Class | Destination | Rationale |
|---|---:|---|---|---|
| `ingest/pipeline.py` | 186 | **ADAPT** | `app/memory/ingest.py` | Ingest → chunk → embed → store orchestration is directly reusable in shape. Rewritten against platform tables, RLS-scoped sessions and `EmbeddingService`; donor's background-job model replaced by the platform `jobs` table. |
| `search/vector.py` | 66 | **ADAPT** | `app/memory/retrieval.py` | pgvector cosine query. Kept the `cosine_distance` + order-by-distance pattern; **isolation predicate changed from donor `channel_id` to RLS on `user_id`**, and provenance columns added to the result. |
| `search/embeddings.py` | 47 | **REBUILD** | `app/ai/embedding/service.py` | **Donor uses `fastembed` BGE** with the BGE instruction prefix `"Represent this sentence for searching relevant passages: "`. That is an incompatible vector space and an incompatible convention. Replaced by E5-base with `query:`/`passage:`. Donor fastembed dependency is **not** adopted. |
| `models.py` | 130 | **PARK** | — | Donor `Channel`/`Video`/`Chunk`/`Stance`/`Job` keyed by `channel_id`. Platform reuses `content_assets`/`chunks`/`jobs` under `user_id` + RLS. |
| `agents/` (12 files) | — | **PARK** | — | Multi-agent supervisor/specialist framework is Phase 3 orchestration scope. |
| `ingest/youtube.py` | 125 | **PARK** | — | Requires `YOUTUBE_API_KEY`; ADR-006 defers external APIs to Phase 5. |
| `ingest/transcripts.py` | 130 | **ADAPT** | `app/memory/chunking.py` | Transcript → snippet/segment logic is reusable as a chunking strategy. |
| `ai/llm.py`, `agents/llm.py` | 97 | **REBUILD** | `app/llm/gateway.py` | Direct `groq`/`gemini` calls, forbidden by ADR-003. |
| `search/graph.py` | 68 | **PARK** | — | Knowledge-graph stance linking is beyond Phase 2 RAG scope. |
| `docker-compose.yml` | — | **PARK** | — | Platform runs one Postgres + one API; donor's own DB/vector store must not exist. |
| `frontend/` | — | **PARK** | — | Phase 3+. |

**Memory capabilities retained:** ingest, chunk, embed, store, retrieve,
rank/filter, summarize, update, delete.

---

### Non-negotiable donor exclusions (verified absent in Phase 2 code)

| Forbidden donor pattern | How excluded |
|---|---|
| Donor authentication | No donor auth code referenced; all identity via `app/core/auth.py` |
| Donor database | No donor ORM models; SQLAlchemy Core against platform schema only |
| Donor vector database | `fastembed`/BGE removed; single `chunks` table in platform `pgvector` |
| Donor embedding service | Hash vectorizer deleted; single `EmbeddingService` |
| Donor LLM abstraction | Direct SDK calls replaced by single `LLMGateway` |
| Donor user isolation | `channel_id` filters replaced by PostgreSQL RLS on `user_id` |
| Donor navigation | Frontend deferred to Phase 3 |

### Platform code that is NEW (no donor equivalent)

| File | Purpose |
|---|---|
| `app/llm/contracts.py` | `LLMRequest`/`LLMResponse` Pydantic contract (ADR-003 §6) |
| `app/llm/providers/base.py` | `ProviderAdapter` abstraction |
| `app/llm/providers/mock.py` | Deterministic provider (no credentials exist — ADR-006) |
| `app/llm/prompts.py` | Versioned prompt loader over `packages/prompts/` |
| `app/llm/usage.py` | `ai_calls` logging, token/cost/latency accounting |
| `app/ai/embedding/base.py` | `EmbeddingService` abstraction (model-agnostic) |
| `app/ai/embedding/e5.py` | E5-base adapter — the only module that knows E5 internals |
| `app/memory/policy.py` | Memory-write policy (§29) |
| `app/memory/schemas.py` | `MemoryQuery`/`MemoryResult` contracts |
| `app/ai/evaluation/` | Platform-wide AI evaluation framework (§36) |

---

## Phase 3 — STUDIO (2026-10-05)

Studio consolidates donor capabilities into **one** creator workspace. Donor
modules remain read-only and are never imported at runtime; their logic is
adapted by reimplementing against platform contracts. Full mapping in
`docs/studio-capability-map.md`.

### Studio donor modules audited

| Module | Audit outcome |
|---|---|
| 01 Content Idea Generator | 10 structured ideas; portable scrubber + clamping |
| 02 Content Repurposer | analyze-then-fan-out; per-platform prompt rules |
| 03 Hook Generator | 10-style taxonomy; deterministic slot realignment; anti-fabrication rule |
| 05 Reel Script Builder | hook/body/CTA script; fragile regex JSON extraction **not ported** |
| 07 Thumbnail Ideator | strategy taxonomy; 3-mode contract (generate/refine/variations) |
| 08 Caption Assistant | caption variants; heuristic ranker; shape coercion |
| 09 CTA Generator | backend `lib/` **absent** (gitignored in donor) — REBUILD from contracts only |
| 12 Creator Research Assistant | parked; its local fallback **fabricates statistics with fake citations** — not ported |
| 18 AI Content Director | 7-stage pipeline, `buildStagePrompt` cross-stage context threading |
| 18 AI Content Director (Guruvelah) | richest orchestrator donor: stages, validators, platform/timing/format/goal/lifecycle domain tables, injection defence, prompt versioning |
| 22 AI Creative Producer | not built in donor; Phase 4 scope |

### Classifications

- **PORT** — hygiene scrubber, schema clamping, slot realignment, heuristic ranker, shape coercion, format taxonomy, fake-provider test harness.
- **ADAPT** — stage orchestration, stage→prompt dispatch, platform config, timing allocation, goals/lifecycle directives, validators + single retry, injection boundary, prompt provenance, and the 01/02/03/05/07/08 content capabilities.
- **REBUILD** — CTA kits, CTA freshness/anti-repetition (donor implementation lost).
- **NEW** — `studio/session.py`, `studio/context.py`, `studio/registry.py`, `studio/orchestrator.py`, `studio/persistence.py`, `studio/safety.py`, Studio API schemas, Studio UI, AI evaluation scenarios.
- **PARK** — model failover and provider fallback (Gateway owns), export-to-Markdown (library/distribution), localStorage state, donor Supabase auth/service-role DB, trend ingestion (Growth), research assistant, Module 22 (Phase 4).

### Rejected donor infrastructure

Donor SDK calls, hardcoded model names, `localStorage` state, per-module Supabase
auth/service-role DB access, inline prompts, and per-module frontends are all
excluded. Studio uses only `LLMGateway`, `EmbeddingService` (indirectly via
Memory), `LongTermMemoryEngine`, `CreatorVoiceEngine`, `JobService`, the
versioned prompt registry, and PostgreSQL RLS.

### Phase 3 infrastructure fix (pre-existing Phase 2 defect)

Starting Phase 3 exposed a latent Phase 2 bug: every prompt asset except
`voice/profile_summary` authored its body under the key `prompt`, while the
loader reads `template`. Those assets loaded with an **empty** template and
rendered to an empty user message — a silent empty prompt rather than an error.

- `app/llm/prompts.py` — alias `prompt` → `template`; added dotted-path
  resolution (`voice_profile.tone_keywords`) with a hard failure on a missing
  variable.
- Assets normalised to declare their variables and to avoid Handlebars syntax,
  which the strict renderer cannot express.
- `tests/unit/test_prompt_loader.py` — 24 tests pinning the loader/asset contract,
  including "no shipped asset loads with an empty template".

Phase 2 baseline was **not** otherwise reworked: 286 → 310 tests, all passing,
with `modules/` unchanged.

---

## Phase 4 — Today & Creative Producer

### Module 04 (Content Calendar / Daily Planner)

Audited for prioritization logic and found to have **none**. The module's
planner engine and its persistence layer are absent from the donor — only the
data shapes and the calendar UI remain. Nothing was ported.

One pattern was worth taking: the **3-slot day shape** (one main action, plus
smaller actions). Adopted as the Producer's day structure, because it forces an
explicit choice about what matters most today rather than presenting a flat list.

### Module 21 (Creative Producer / agent)

Predominantly stubs — prompts, placeholder interfaces, and an agent skeleton with
no ranking, scoring, or evidence resolution behind it. No implementation to port.

Three disciplines were adopted deliberately:

1. **Evidence forcing** — every recommendation must resolve to a real record.
   This is the single most important property in Phase 4; it is why
   `reason_kind` is required and why unresolvable evidence drops a
   recommendation.
2. **Anti-fabrication** — the agent may not invent creator history, numbers, or
   performance. Enforced by requiring resolvable evidence rather than by
   prompting against it.
3. **Bounded-loop discipline** — a run terminates with a decision, not a
   conversation. Reflected in the fixed slot/budget caps in `planner.py`.

### Net result

**Zero lines of donor implementation were ported in Phase 4.** The Producer is
written against platform contracts (`LLMGateway`, `MemoryEngine`, `VoiceEngine`,
`JobService`, `plan_items`) and adds no infrastructure. `modules/` remains
read-only at 1065 tracked files with 0 diff.

Full classification in `docs/producer-donor-adaptation.md`.
