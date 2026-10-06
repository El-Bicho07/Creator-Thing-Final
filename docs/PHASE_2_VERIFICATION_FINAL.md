# Phase 2 Verification — Final

**Phase:** 2 — Shared AI Primitives
**Commits:** `481532a` (shared AI primitives), `7e02c87` (Phase 2 hardening, 286 tests)
**Status:** ACCEPTED WITH DEFERRED LIVE-AI VALIDATION
**Verification:** original Phase 2 verification, extended by the Phase 2–4 consolidated cycle (`8bcd53d`)
**Date:** 2026-10-06

> **Verification boundary.** This document records **automated engineering
> verification**. Live provider output quality is a separate claim and is
> **DEFERRED** — see §7.

---

## 1. Scope

Shared AI/platform foundation, all of which Phases 3 and 4 depend on:

| Component | Responsibility |
|---|---|
| **LLM Gateway** | The only provider access path: abstraction, validation, normalization, retries, timeout, token/cost accounting, structured errors |
| **EmbeddingService** | Single embedding authority for the platform |
| **E5-base** | `intfloat/multilingual-e5-base`, 768 dimensions |
| **768D vectors** | pgvector schema, migration, provenance, index configuration |
| **Creator Voice Engine** | Voice profile lifecycle, style, confidence, RLS |
| **Long-Term Memory Engine** | Ingest, chunk, embed, retrieve, rank, cascade, RLS; owns the `chunks` vector store |
| **Jobs** | `JobService` on the existing `jobs` table — the chosen async mechanism |
| **Prompt system** | Centralized, versioned prompt assets with provenance |
| **Auth** | Supabase JWT verification, fail-closed behavior |
| **RLS** | PostgreSQL row-level security as the authorization boundary |
| **Database identity** | Claim pinning, scoping, and clearing on a pooled connection |
| **Security** | Cross-user isolation, concurrency, fail-safe error handling |

---

## 2. Embedding decision

This is a settled decision and is recorded here so it is not reopened casually.

```
Model:         intfloat/multilingual-e5-base
Dimension:     768
Query prefix:  query:
Passage prefix: passage:
```

**BGE-M3 and Tamil-Embed were benchmark candidates only. They are not production
implementations. No further embedding benchmark is required.**

Confirmed by scan across `apps/api/app` and `packages/`:

| Check | Result |
|---|---|
| `bge-m3`, `tamil-embed`, `all-MiniLM`, `text-embedding-3` | **0 references** |
| `SentenceTransformer` imports | **1 file only** — `app/ai/embedding/e5.py`, the embedding authority |
| `384`-dimension assumptions in code | **0** — the only mentions are docstrings in `app/memory/reembed.py` describing the completed 384 → 768 migration |
| Alternative vector database | none |

The embedding model was **not** changed during this cycle, and no benchmark was
re-run.

---

## 3. Verification

### Original Phase 2 verification

286 tests passed, 0 skipped, covering security/RLS regression, concurrency and
fail-safe checks, vector provenance/index/retrieval, E5 provenance, the 384D → 768D
migration, anti-padding validation, frontend typecheck/build, donor integrity, and
provider SDK isolation.

### Consolidated verification

The Phase 2–4 cycle re-executed all of the above with **no regressions**: nothing
was weakened, skipped, or broken. Suite-wide counts moved from 750 → **845**, with
Phase 2 areas extended where coverage was found to be thin.

| Area | Result | Evidence |
|---|---|---|
| **LLM Gateway** | PASS | `test_llm_gateway.py` (33) — provider abstraction, request validation, response normalization, timeout, provider failure, malformed response, retries, token/cost accounting, structured errors |
| **E5 embedding behavior** | PASS | `test_embedding_service.py` (28) — `query:`/`passage:` prefixes, 768-D output, normalization, batch embedding, deterministic behavior, empty/invalid input, model-loading failure, provenance |
| **Vector migration** | PASS | `002` created `vector(384)`; `003` added `embedding_v2 vector(768)`; `004` contracted to one authoritative `embedding vector(768)` after dropping the legacy column |
| **Vector provenance** | PASS | `test_vector_provenance.py` (11) — stored dimension, fresh-E5-versus-stored agreement, cosine similarity behavior, pgvector index configuration, no padding/truncation, provenance metadata |
| **Memory Engine** | PASS | `test_memory_core.py` (23) — creation, retrieval, ranking, user isolation, empty memory, no-result retrieval, embedding generation, vector retrieval, deletion, cascade, chunk ownership, fail-closed |
| **Voice Engine** | PASS | `test_voice.py` (25) — profile retrieval, missing/empty/malformed profile, context generation, update behavior, RLS, cross-user isolation |
| **Jobs** | PASS — **after adding 36 dedicated tests**, see §4 | `test_job_lifecycle.py` (36) |
| **Prompt system** | PASS | `test_prompt_loader.py` (12) — centralized prompts, versioning, correct template loading, non-empty prompt bodies, missing prompt, invalid version, provenance |
| **Prompt `template` vs `prompt` regression** | PASS | Every shipped asset is asserted to load with a **non-empty** template — the exact historical failure mode, where assets authored under `prompt` rendered an empty user message with no error |
| **Authentication** | PASS | Unauthenticated → protected data denied; invalid JWT → protected data denied; fail-closed |
| **RLS** | PASS | `test_rls_exhaustive_isolation.py` (7) — every table has RLS enabled **and** a policy |
| **Database identity** | PASS | `test_connection_identity.py` (8) — claim setting is session-scoped not transaction-local, survives commit, is stable across many statements |
| **Pooled connection isolation** | PASS | `test_pooled_connection_is_not_reused_with_stale_identity`, `test_identity_cleared_on_the_very_connection_that_carried_it`, `test_claims_are_cleared_on_scope_exit`, `test_pool_exhaustion_does_not_leak_identity` |
| **Concurrency** | PASS | `test_concurrency_isolation.py` (3) — parallel requests never cross identity, including over HTTP and under pool exhaustion |
| **Frontend typecheck / build** | PASS | `tsc --noEmit` exit 0; `next build` success |
| **Architecture boundaries** | PASS | The only provider-SDK import anywhere under `app/` is `app/llm/providers/live.py`, which **is** the provider boundary. Zero in `app/features/`, `app/producer/`, `app/studio/`. Zero raw `chunks` SQL outside `app/memory/` |

---

## 4. JobService finding

**This discovery is recorded explicitly and is not hidden.**

The consolidated verification found that **`JobService` had insufficient dedicated
test coverage**. It exposes **eleven** public operations:

```
create · claim · get · update_progress · complete · fail · cancel
list_jobs · run_job · _merge_metadata · get_job_service
```

It had **no dedicated test file**. Coverage arrived only incidentally, through
later Phase 3 and Phase 4 flows.

This is not incidental surface. `JobService` is Phase 2's chosen answer to
asynchronous work — explicitly **without** Redis, Kafka, Celery, or Kubernetes —
and Phase 4's Producer depends on it for asynchronous planning. A defect in
`claim()` would have been invisible.

**36 dedicated JobService tests were added**
(`apps/api/tests/integration/test_job_lifecycle.py`):

| Area | Proven |
|---|---|
| create | starts `pending` at zero progress; `total` and nested metadata round-trip; metadata defaults to `{}`, not NULL |
| claim | moves a pending job to running; returns `None` on an empty queue; **never re-claims a running job**; filters by `job_type` |
| claim | never returns another creator's job |
| claim | **two concurrent sessions race one queue; every job is delivered exactly once — none lost, none double-delivered** (`FOR UPDATE SKIP LOCKED` proven, not assumed) |
| progress | intermediate progress recorded; **clamped to 0–100** (a caller reporting 5000 stores 100, a negative value stores 0); `total` revisable but preserved when omitted; cannot touch a foreign job |
| complete | marks done, forces progress to 100, clears the error, stores the result |
| complete | **merges rather than replaces metadata** — a result never erases context recorded earlier |
| fail | records the error and stops the job; **truncates a 50,000-character message** to the documented 1000 bound; `retry=True` genuinely returns the job to the queue and it is re-claimable |
| complete | a foreign creator cannot complete another creator's job |
| cancel | stops pending and running jobs; **refuses to rewrite a finished job** (invalid state transition); is idempotent; cannot touch a foreign job |
| read | `get` returns `None` for a foreign or unknown id; `list_jobs` is creator-scoped and newest-first |
| run_job | completes and returns the final record; **retries then succeeds**; **gives up after `max_retries`** (2 → three attempts, then terminal failure); zero retries fails on the first error; failures are recorded in the job row rather than raised into the request path |
| RLS | `jobs` has RLS enabled and **every policy is scoped by `user_id`**; raw SQL cannot read or delete another creator's jobs |

One test deliberately asserts an **unimplemented** behavior:

> `test_a_claimed_job_is_never_reclaimed_after_a_worker_dies` — there is no
> stale-job recovery in Phase 2; a job left `running` by a dead worker stays
> running forever. This limitation is now explicit, and a future phase that adds
> recovery will fail this test and have to decide what the right timeout is.

No new queue system was introduced to satisfy these tests.

---

## 5. Live AI validation

**DEFERRED.**

This was checked, not assumed. `.env` configures `ANTHROPIC_API_KEY` and
`GROQ_API_KEY`, and both look non-placeholder by pattern, so a live probe was run.
**HTTP status codes only were recorded; no credential value was printed.**

```
ANTHROPIC_API_KEY -> HTTP 401   NOT USABLE (placeholder)
GROQ_API_KEY      -> HTTP 401   NOT USABLE (placeholder)
```

**Live provider output quality remains unvalidated. The deterministic verification
path is passing. A future live-AI acceptance run is required when valid provider
credentials are available.**

No live test was faked, and no test was weakened to compensate. All results in this
document were produced against the deterministic path and scripted providers, which
is sufficient for structure, contracts, isolation, and failure handling — and
**not** sufficient to make any claim about real model output quality.

---

## 6. Donors

`modules/` unchanged: 1,065 tracked files, 0 diff lines.

Phase 2 consumed no donor implementation. No test failure was resolved by
modifying donor code.

---

## 7. Status

```
ACCEPTED WITH DEFERRED LIVE-AI VALIDATION
```

Acceptance criteria:

- [x] Shared services tested
- [x] E5 768-D verified
- [x] Vector migration verified
- [x] Memory verified
- [x] Voice verified
- [x] LLM Gateway verified
- [x] Prompt system verified
- [x] Jobs verified *(36 dedicated tests added; previously untested)*
- [x] RLS verified
- [x] Cross-user concurrency verified
- [x] Frontend contracts verified

Engineering, integration, security, regression, and architecture verification
passed. Live provider output quality remains unvalidated because the configured
provider credentials are not currently usable.

**No Phase 5 work was performed.**
