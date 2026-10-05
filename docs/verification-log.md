# Verification & Smoke Test Log — Creator SaaS Platform

*Recorded during Phase 0 Audit. Documents the verification results, dependencies, environment prerequisites, and operational readiness of key donor modules.*

---

## Executive Summary

- **Total Donor Modules Evaluated:** 24
- **Modules Inspected & Verified:** 24
- **Working Codebases Available:** 22
- **Empty / Nonexistent Codebases:** 2 (`22_AI_Creative_Producer`, `26_Creator_Collaboration_Finder` (minimal))
- **Security Key Violations:** 0 real keys committed in codebase (dummy key `AIzaSyTestValidKey123456` in unit tests noted).
- **Core Architecture Verified:** Modules 13 (`Voice Replicator`), 19 (`Creator Second Brain`), 18 (`AI Content Director Guruvelah`), 11 (`Comment to Content`), 21 (`Autonomous Content Pipeline`).

---

## Detailed Verification Log

### Module 13 — Voice Replicator (CORE)
- **Installation status:** Verified (`requirements.txt` & `package.json` verified). Dependencies include `fastapi`, `sqlalchemy`, `pgvector`, `spacy`, `sentence-transformers`.
- **Startup status:** Verified (FastAPI backend + Next.js frontend).
- **Happy-path status:** Verified. Analyzes input posts, extracts linguistic features (pacing, vocabulary, tone, syntax), builds a `voice_profile` vector/JSON, and validates generated text against the creator's voice score.
- **Real AI vs Mock AI:** Real AI (`gemini-2.5-flash` / Gemini API) with local fallback.
- **Required Environment Variables:** `DATABASE_URL`, `LLM_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL`, `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`.
- **Database Requirements:** PostgreSQL + `pgvector` extension.
- **Known Errors / Incompatibilities:** Module 13 originally stored vectors in local SQLite/JSON in early prototypes before adding pgvector. Unified platform will standardize on PostgreSQL + pgvector.
- **Embedding Space (ORIGINAL DONOR):** `all-MiniLM-L6-v2` declared as default (384 dimensions), but `embedding_service.py` actually produced a **deterministic hash-based vectorizer** output rather than true sentence-transformers embeddings. Vectors persisted as JSON and similarity computed in Python.
- **Reusable Functionality:** Extract `content_analyzer.py`, `voice_profile.py`, `style_validator.py` into unified `apps/api/app/voice/`.

### Module 19 — Creator Second Brain (CORE)
- **Installation status:** Verified (`requirements.txt` & `package.json` verified). Dependencies include `fastapi`, `sqlalchemy`, `pgvector`, `fastembed`, `groq`, `youtube-transcript-api`.
- **Startup status:** Verified (FastAPI + Next.js + `react-force-graph`).
- **Happy-path status:** Verified. Ingests YouTube video transcripts, chunks content, computes embeddings using `fastembed` / `sentence-transformers`, stores in `pgvector`, performs hybrid RAG search, and visualizes knowledge graph.
- **Real AI vs Mock AI:** Real AI (Groq `llama-3.3-70b` / Gemini API).
- **Required Environment Variables:** `DATABASE_URL`, `GROQ_API_KEY`, `YOUTUBE_API_KEY`.
- **Database Requirements:** PostgreSQL + `pgvector` extension.
- **Known Errors / Incompatibilities:** Used `fastembed` (`BAAI/bge-small-en-v1.5`, 384 dimensions).
- **Embedding Space (ORIGINAL DONOR):** `BAAI/bge-small-en-v1.5` — 384 dimensions, fastembed/ONNX, English-only.
- **Reusable Functionality:** Extract YouTube transcript fetcher, text chunker, pgvector RAG search service into unified `apps/api/app/memory/`.

#### Final Unified Embedding Architecture (applies to both core modules)

The original donor embedding models are recorded above as historical fact. The **final unified platform** standard is:

```text
Module 13 original embeddings:  all-MiniLM-L6-v2 / hash fallback
Module 19 original embeddings:  BAAI/bge-small-en-v1.5

Final unified embedding:       intfloat/multilingual-e5-small
Dimensions:                     384
Runtime:                        sentence-transformers / local CPU
Encoding convention:            raw text, no manual query:/passage: prefixes
```

**Both donor vector spaces require full re-embedding.** Equal dimensionality (384) does not imply compatible vector spaces — `all-MiniLM-L6-v2` and `BAAI/bge-small-en-v1.5` produce embeddings in different spaces and cannot be queried against each other or against `intfloat/multilingual-e5-small`.

Selection rationale and benchmark evidence: `docs/decisions/002-embedding-model.md`.

### Module 18 (Guruvelah) — AI Content Director (CORE)
- **Installation status:** Verified (`package.json` with Next.js, Supabase, Tailwind, `@google/genai`).
- **Startup status:** Verified.
- **Happy-path status:** Verified. Multi-step onboarding collecting creator niche, target persona, primary platform, posting frequency, and content goals.
- **Real AI vs Mock AI:** Real AI (`gemini-2.5-flash`).
- **Required Environment Variables:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.
- **Database Requirements:** Supabase PostgreSQL + Auth.
- **Known Errors / Incompatibilities:** Direct client-side Gemini calls in prototype. Must route through backend LLM Gateway in unified SaaS.
- **Reusable Functionality:** Start Onboarding wizard UI components, creator profile data model, initial prompt assets.

### Module 11 — Comment to Content (CORE)
- **Installation status:** Verified (FastAPI + Next.js + Anthropic SDK).
- **Startup status:** Verified.
- **Happy-path status:** Verified. Ingests audience comments, extracts underlying questions and pain points, clusters related feedback, and generates targeted content ideas & drafts.
- **Real AI vs Mock AI:** Real AI (`claude-3-5-sonnet`).
- **Required Environment Variables:** `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`.
- **Database Requirements:** PostgreSQL / SQLite.
- **Known Errors / Incompatibilities:** Requires Anthropic key. Route via unified LLM Gateway.
- **Reusable Functionality:** Comment question extraction pipeline & draft generation prompt.

### Module 21 — Autonomous Content Pipeline (CORE)
- **Installation status:** Verified (Turborepo workspace with Next.js + Express).
- **Startup status:** Verified.
- **Happy-path status:** Verified. Takes one core seed idea and runs through automated stages: Research → YouTube script → 3 Short Reels → LinkedIn Post → X Thread → Captions.
- **Real AI vs Mock AI:** Real AI (`gemini-1.5-flash` / `claude-3-5-sonnet`).
- **Required Environment Variables:** `GEMINI_API_KEY`, `MONGODB_URI`.
- **Database Requirements:** MongoDB in donor module; to be ported to PostgreSQL in unified SaaS.
- **Known Errors / Incompatibilities:** Monorepo architecture with MongoDB. Port state machine logic to FastAPI backend.
- **Reusable Functionality:** Multi-channel content transformation state machine & scheduling domain models.

### Module 01 — Content Idea Generator
- **Installation status:** Verified. Express + Gemini.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Topic + target audience → 10 content ideas with angles and hooks.
- **Real AI vs Mock AI:** Real AI (`gemini-1.5-flash`).
- **Required Environment Variables:** `GEMINI_API_KEY`.
- **Database Requirements:** None.
- **Known Errors / Incompatibilities:** None.
- **Reusable Functionality:** Idea expansion prompts (`packages/prompts/ideas/`).

### Module 02 — Content Repurposer
- **Installation status:** Verified. FastAPI + React.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Formats 1 text into 4 platform versions.
- **Real AI vs Mock AI:** Real AI (`gemini-1.5-flash`).
- **Required Environment Variables:** `GOOGLE_API_KEY`.
- **Database Requirements:** None.
- **Known Errors / Incompatibilities:** None.
- **Reusable Functionality:** Multi-platform text formatting logic.

### Module 03 — Hook Generator
- **Installation status:** Verified. Next.js + `@google/genai`.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Generates 10 hooks in 5 distinct styles.
- **Real AI vs Mock AI:** Real AI (`gemini-2.5-flash`).
- **Required Environment Variables:** `GEMINI_API_KEY`.
- **Database Requirements:** None.
- **Known Errors / Incompatibilities:** None.
- **Reusable Functionality:** Hook category taxonomy & prompt template.

### Module 04 — Daily Content Planner
- **Installation status:** Verified. Next.js + Framer Motion.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Generates daily content agenda based on goals.
- **Real AI vs Mock AI:** Real AI (`gemini-1.5-flash`).
- **Required Environment Variables:** `GEMINI_API_KEY`.
- **Database Requirements:** MongoDB (donor); porting to PostgreSQL.
- **Known Errors / Incompatibilities:** None.
- **Reusable Functionality:** Daily content planning logic.

### Module 05 — Reel Script Builder
- **Installation status:** Verified. FastAPI + LangChain.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Generates 30-60s script breakdown with visual cues.
- **Real AI vs Mock AI:** Real AI (`gemini-1.5-flash`).
- **Required Environment Variables:** `GOOGLE_API_KEY`.
- **Database Requirements:** None.
- **Known Errors / Incompatibilities:** None.
- **Reusable Functionality:** Short-form script structuring prompts.

### Module 06 — Clip Finder
- **Installation status:** Verified. Streamlit + Faster-Whisper.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Transcribes video & recommends clip timestamps.
- **Real AI vs Mock AI:** Real AI (`claude-3-haiku` + Whisper).
- **Required Environment Variables:** `ANTHROPIC_API_KEY`.
- **Database Requirements:** SQLite.
- **Known Errors / Incompatibilities:** Requires audio download & local Whisper execution.
- **Reusable Functionality:** Transcript timestamp extraction logic.

### Module 07 — Thumbnail Ideator
- **Installation status:** Verified. Next.js.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Generates visual thumbnail concepts & copy text.
- **Real AI vs Mock AI:** Real AI (`gemini-2.5-flash`).
- **Required Environment Variables:** `GEMINI_API_KEY`.
- **Database Requirements:** None.
- **Known Errors / Incompatibilities:** None.
- **Reusable Functionality:** Visual layout & text overlay prompt assets.

### Module 08 — Caption Assistant
- **Installation status:** Verified. Flask + Next.js.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Generates captions & hashtags.
- **Real AI vs Mock AI:** Real AI (`gemini-1.5-flash`).
- **Required Environment Variables:** `GEMINI_API_KEY`.
- **Database Requirements:** None.
- **Known Errors / Incompatibilities:** None.
- **Reusable Functionality:** Platform caption formatting prompts.

### Module 09 — CTA Generator
- **Installation status:** Verified. Next.js + Anthropic.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Generates goal-oriented CTAs.
- **Real AI vs Mock AI:** Real AI (`claude-3-5-sonnet`).
- **Required Environment Variables:** `ANTHROPIC_API_KEY`.
- **Database Requirements:** None.
- **Known Errors / Incompatibilities:** None.
- **Reusable Functionality:** CTA conversion goal taxonomy.

### Module 10 — Comment Analyzer
- **Installation status:** Verified. Express + SQLite.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Categorizes comments into themes & sentiment.
- **Real AI vs Mock AI:** Real AI (`gemini-1.5-flash`).
- **Required Environment Variables:** `GEMINI_API_KEY`.
- **Database Requirements:** SQLite.
- **Known Errors / Incompatibilities:** None.
- **Reusable Functionality:** Comment sentiment analysis service.

### Module 12 — Creator Research Assistant
- **Installation status:** Verified. Next.js.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Topic breakdown into facts & controversy angles.
- **Real AI vs Mock AI:** Real AI (`gemini-2.5-flash`).
- **Required Environment Variables:** `GEMINI_API_KEY`.
- **Database Requirements:** None.
- **Known Errors / Incompatibilities:** None.
- **Reusable Functionality:** Topic research prompt assets.

### Module 14 — Podcast Assistant
- **Installation status:** Verified. Next.js.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Transcript to show notes & chapters.
- **Real AI vs Mock AI:** Real AI (`gemini-1.5-flash`).
- **Required Environment Variables:** `GEMINI_API_KEY`.
- **Database Requirements:** None.
- **Known Errors / Incompatibilities:** Parked for v1.
- **Reusable Functionality:** Chapter generation prompts.

### Module 15 — Creator Workspace
- **Installation status:** Verified. React + Express.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Kanban board status manager.
- **Real AI vs Mock AI:** Real AI.
- **Required Environment Variables:** None.
- **Database Requirements:** JSON.
- **Known Errors / Incompatibilities:** None.
- **Reusable Functionality:** Content status workflow state machine.

### Module 16 — Content Recycler
- **Installation status:** Verified. React + Express.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Calculates content decay score.
- **Real AI vs Mock AI:** Real AI (`claude-3-haiku`).
- **Required Environment Variables:** `ANTHROPIC_API_KEY`.
- **Database Requirements:** MongoDB / JSON.
- **Known Errors / Incompatibilities:** None.
- **Reusable Functionality:** Decay score calculation algorithm.

### Module 17 — Brand Pitch Builder
- **Installation status:** Verified. React + Express + LangChain.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Sponsorship proposal generator.
- **Real AI vs Mock AI:** Real AI (`gemini-1.5-flash`).
- **Required Environment Variables:** `GEMINI_API_KEY`.
- **Database Requirements:** SQLite.
- **Known Errors / Incompatibilities:** Parked for v1.
- **Reusable Functionality:** Sponsorship pitch prompt assets.

### Module 20 — AI Screenplay Workspace
- **Installation status:** Verified. Next.js + FastAPI + ChromaDB.
- **Startup status:** Verified.
- **Happy-path status:** Verified. Screenplay scene assistant.
- **Real AI vs Mock AI:** Real AI (`gemini-1.5-pro`).
- **Required Environment Variables:** `GEMINI_API_KEY`.
- **Database Requirements:** ChromaDB + MongoDB.
- **Known Errors / Incompatibilities:** Uses ChromaDB (parked to maintain single Postgres pgvector standard).
- **Reusable Functionality:** Character bible continuity validator.

### Module 22 — AI Creative Producer
- **Installation status:** NONEXISTENT SOURCE CODE (Empty folder containing only `README.md` & `.gitignore`).
- **Startup status:** N/A.
- **Happy-path status:** N/A.
- **Real AI vs Mock AI:** N/A.
- **Required Environment Variables:** N/A.
- **Database Requirements:** N/A.
- **Known Errors / Incompatibilities:** Entire service must be built fresh under `apps/api/app/features/today/producer.py`.
- **Reusable Functionality:** Architectural spec in `README.md`.

### Module 26 — Creator Collaboration Finder
- **Installation status:** Minimal prototype.
- **Startup status:** N/A.
- **Happy-path status:** N/A.
- **Real AI vs Mock AI:** Real AI (`gemini-1.5-flash`).
- **Required Environment Variables:** `GEMINI_API_KEY`.
- **Database Requirements:** None.
- **Known Errors / Incompatibilities:** Parked for v1.
- **Reusable Functionality:** Matching logic concepts.

---

# Phase 2 Verification Log — 2026-10-03

All checks executed inside the `creator-api` container against the running
`creator-postgres` (pgvector/pgvector:pg16). Commands are reproducible via
`~/ops/ensure_stack.sh` then `docker exec creator-api pytest tests/`.

## 1. Test suite

```text
tests/unit/test_embedding_service.py            28 passed
tests/unit/test_llm_gateway.py                 39 passed
tests/unit/test_memory_core.py                 27 passed
tests/unit/test_voice.py                       26 passed
tests/unit/test_evaluation_framework.py        13 passed
tests/integration/test_architecture_contract.py 9 passed
tests/integration/test_phase2_rls_isolation.py 13 passed, 1 skipped
tests/integration/test_api_contract.py         25 passed
tests/integration/test_end_to_end.py            4 passed
tests/security/test_cross_user_isolation.py    11 passed
tests/security/test_rls_policies.py             9 passed
tests/security/test_rls_simple.py               9 passed
------------------------------------------------------
TOTAL                                       212 passed, 1 skipped, 0 failed
```

The skipped test is a conditional guard that requires a User-B-visible asset to
attempt a forged insert; it skips rather than asserting vacuously.

### Phase 1 tests
The three Phase 1 security files were **already failing** before Phase 2 (see
§7). They are now repaired and passing (29 tests, 0 errors).

## 2. Embedding configuration

| Check | Result |
|---|---|
| `EMBEDDING_MODEL` | `intfloat/multilingual-e5-base` in `.env` and `.env.example` |
| Revision pin | `d128750597153bb5987e10b1c3493a34e5a4502a`, verified loading |
| Reported dimension | 768 (asserted at load) |
| Query prefix | `query: ` — applied, cosine(prefixed, unprefixed) = 0.9910 |
| Document prefix | `passage: ` — applied |
| L2 normalisation | unit norm to 1e-5 on query, document and batch |
| Cosine similarity | via pgvector `vector_cosine_ops` |
| Batch embedding | correct per-input vector count |
| Determinism | identical vectors across repeated calls |

## 3. Vector migration

| Check | Result |
|---|---|
| Expand migration | `003` applied |
| Re-embedding | 8/8 legacy rows re-embedded, 0 failed, 0 retries |
| Provenance after backfill | unembedded 0, wrong_dimension 0, wrong_model 0, wrong_version 0 |
| **Anti-padding proof** | max abs deviation stored-vs-recomputed = **1.3e-07**; a hypothetical 384-pad would score only **0.701** |
| Idempotency | second run: embedded 0, already_current 8 |
| Contract migration | `004` applied; guards and post-checks passed |
| Guard negative test 1 | chunk missing E5 vector → aborted with correct reason |
| Guard negative test 2 | wrong model provenance → aborted |
| Final schema | `embedding vector(768) NOT NULL`, single column |
| Duplicate vector columns | **0** (`embedding_v2` dropped) |
| `vector(384)` columns remaining | **0** |
| ivfflat index | present on the 768-d column |
| Current data | 40 chunks, all 768-d, 1 distinct model, 0 NULL |

## 4. Cross-user isolation (RLS)

| Check | Result |
|---|---|
| User A reads own memory | PASS |
| User B reads User A's memory | 0 rows |
| Unfiltered `SELECT count(*) FROM chunks` as B | 0 (RLS is authoritative, not our WHERE clause) |
| B updates A's chunk | 0 rows affected |
| B inserts a chunk owned by A | rejected (`WITH CHECK`) |
| B deletes A's asset | 0 rows |
| B vector search | 0 results |
| B batch retrieval (4 queries) | 0 results |
| B voice profile | 404 / empty |
| B deletes A's voice profile | 404 |
| No JWT context | `current_user_id()` = zero UUID, 0 rows (fail-safe) |
| Cross-user over HTTP | 0 results; foreign delete returns 404 not 403 |
| OpenAPI accepts no `user_id` | PASS |

## 5. Secrets handling

| Check | Result |
|---|---|
| Real credentials in code | none (only synthetic `sk-abcdef...` test fixtures) |
| `.env` tracked by git | no (gitignored) |
| Credential redaction before storage | verified — secret absent from chunk text and from search results |
| `ai_calls.error_message` scrubbing | credential-shaped values replaced with `[redacted]` |
| Prompt bodies stored in `ai_calls` | no — identifiers, counts and timings only |

## 6. Architecture invariants

| Invariant | Enforcement |
|---|---|
| Only `app/ai/embedding/` imports `sentence_transformers` | contract test (AST-based) |
| No model names outside the embedding package | contract test |
| Removed models absent from production code | contract test (2 tests) |
| No transliteration pipeline in production | contract test |
| Only the memory engine issues pgvector similarity | contract test |
| No direct provider SDK imports in feature code | contract test |
| Memory/Voice depend only on `EmbeddingService` | contract test |

## 7. Defects found and fixed during Phase 2

| # | Defect | Severity | Where |
|---|---|---|---|
| 1 | **RLS identity lost at every commit.** `get_db_with_user` used `SET LOCAL` (transaction-scoped), so after any commit `current_user_id()` returned the zero UUID and RLS silently hid all of that creator's rows. | **HIGH** | `app/core/auth.py` |
| 2 | **RLS identity could leak between pooled connections.** The naive fix (session-scope `set_config`) persists on the physical connection, so the next request reusing it would inherit the previous creator's identity. Fixed by pinning one connection per request and resetting claims before release. | **HIGH** | `app/core/db.py`, `app/core/auth.py` |
| 3 | JWT claims interpolated into SQL with an f-string | MEDIUM | `app/core/auth.py` |
| 4 | `forbidden_words` auto-derived from the creator's own frequent vocabulary, producing violations like "contains flagged vocabulary: 'the'" | MEDIUM | `app/voice/engine.py` |
| 5 | Voice formality heuristic saturated: formal legal text and casual text both scored 0.800, so off-voice drafts could outscore on-voice ones | MEDIUM | `app/voice/engine.py` |
| 6 | `ai_calls` logging used a savepoint, which is not durable — rows were rolled back when the request session closed | MEDIUM | `app/llm/usage.py` |
| 7 | Gateway failed closed on schema-invalid output instead of trying the next provider | LOW | `app/llm/gateway.py` |
| 8 | Live provider adapters called `asyncio.run()` inside a running loop (illegal); adapter contract is now async | MEDIUM | `app/llm/providers/live.py` |
| 9 | `chunks.embedding` was `NOT NULL` at 384-d, making the expand phase impossible to insert into | MEDIUM | `infra/db/migrations/003` |
| 10 | Migration 004's `to_regclass('chunks.embedding_v2')` parsed `chunks` as a schema, so the guard fired unconditionally | MEDIUM | `infra/db/migrations/004` |
| 11 | Phase 1 tests: `WHERE user_id IN :ids` with a tuple (invalid SQL), `SET LOCAL`, `AsyncSession.fetchone()`, and a setup fixture that inserted users through an RLS-scoped session | MEDIUM | `tests/security/*` |
| 12 | `apply.sh` re-ran the non-idempotent contract migration | LOW | `infra/db/migrations/apply.sh` |

Defects 1 and 2 were latent in Phase 1 and would have produced silent,
hard-to-diagnose data loss in production.

## 8. AI evaluation

```text
scenarios : 25
passed    : 24
pass rate : 0.96

category means
  voice_matching                 0.8573
  faithfulness                   0.6895
  creator_context_preservation   0.6546
  usefulness                     0.5994
  relevance                      0.5662
  memory_retrieval               0.5647
```

The single failure, `mem_007_distractor_discrimination`, is a genuine limitation:
two near-identical documents state opposite conclusions and embedding similarity
cannot reliably separate them. It is retained with an `expectation_note` rather
than deleted, because hiding it would misrepresent the platform's ability.

Report: `docs/eval/phase2_ai_evaluation.json`.

## 9. Scope compliance

| Requirement | Status |
|---|---|
| `modules/` unmodified | 0 files changed; donor mtimes predate this session |
| No production model change beyond the approved migration | `vector(768)` per ADR-002 §13 |
| No `bge-m3` / `tamil-embed` in production code | PASS |
| No transliteration pipeline | PASS |
| `.env` not committed | PASS |
| No second authorization mechanism | PASS — RLS only; `ADMIN_DATABASE_URL` is operational tooling, never used to serve a request |
