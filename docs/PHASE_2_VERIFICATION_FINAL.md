# Phase 2 Verification — Final

**Phase:** 2 — Shared AI Primitives
**Status:** ✅ ACCEPTED WITH DEFERRED LIVE-AI VALIDATION
**Verification run:** 2026-10-06 (consolidated Phases 2–4 verification)

This report does not restate the Phase 2 report. It records only what was
**re-executed and independently confirmed**, plus the coverage that was found
missing and added.

---

## 1. Baseline vs. this run

| | Phase 2 baseline | This verification |
|---|---|---|
| Backend tests | 286 | **845** (whole-suite total; Phase 2 tests all still pass) |
| Job system tests | **0 dedicated** | **36** |
| Warnings | 13 | **0** |
| Live provider | deferred | **deferred (re-confirmed)** |

Phase 2 committed 286 tests across Gateway, embeddings, vector migration, voice,
memory, auth/RLS, prompts, and frontend contracts. Re-running them found **no
regressions**: nothing was weakened and nothing broke.

---

## 2. What was verified

### LLM Gateway — `tests/unit/test_llm_gateway.py` (33)
Provider abstraction, request validation, response normalization, timeout
handling, provider failure, malformed provider response, retries, token/cost
accounting, structured errors. **Reused; adequate.**

Isolation confirmed by scan: the only provider-SDK import anywhere under
`apps/api/app/` is `app/llm/providers/live.py`, which *is* the provider boundary.
Zero in `app/features/`, `app/producer/`, `app/studio/`.

### Embedding Service — `tests/unit/test_embedding_service.py` (28)
`query:` / `passage:` prefixes, 768-dimension output, normalization, batch
embedding, deterministic behaviour, empty/invalid input, model-loading failure,
provenance. **Reused; adequate.**

Model remains `intfloat/multilingual-e5-base`. A scan for
`bge-m3`, `tamil-embed`, `all-MiniLM`, `text-embedding-3` across `app/` and
`packages/` returns **0 hits**. `SentenceTransformer` is imported in exactly one
file, `app/ai/embedding/e5.py`.

### Vector migration — `tests/integration/test_vector_provenance.py` (11)
Schema is `vector(768)`: migration 002 created `vector(384)`, 003 added
`embedding_v2 vector(768)`, and 004 contracted to a single authoritative
`embedding vector(768)` after dropping the legacy column. Stored dimension,
fresh-E5-versus-stored agreement, cosine behaviour, pgvector index configuration,
anti-padding, and provenance are all asserted. **Reused; adequate.**

`384` appears in production only inside `app/memory/reembed.py` **docstrings**
that describe the migration itself. No code path assumes it.

### Creator Voice Engine — `tests/unit/test_voice.py` (25)
Profile retrieval, missing/empty/malformed profile, context generation, update
behaviour, RLS, cross-user isolation. **Reused; adequate.**

### Memory Engine — `tests/unit/test_memory_core.py` (23)
Create, retrieve, rank, user isolation, empty memory, no-result retrieval,
embedding generation, vector retrieval, deletion, cascade, chunk ownership,
fail-closed behaviour. **Reused; adequate.**

**Chunk ownership boundary — scanned, not assumed.** A scan for
`(FROM|INTO|UPDATE|DELETE FROM) chunks` outside `app/memory/` returns **zero
hits**. Every other mention is either a comment explaining that Studio must *not*
touch chunks, a response-model field name, or `app/features/memory/router.py`
(which is the Memory feature itself).

### Auth / RLS / Database identity — **the strongest area**
| File | Tests | Covers |
|---|---|---|
| `tests/security/test_connection_identity.py` | 8 | claim scoping, commit vs transaction scope, pool reuse, A-B-A-B, clearing on scope exit |
| `tests/security/test_cross_user_isolation.py` | 11 | read/update/delete/embeddings/jobs/ai_calls, unauthenticated, invalid token |
| `tests/security/test_rls_exhaustive_isolation.py` | 7 | every table with RLS enabled and a policy |
| `tests/security/test_concurrency_isolation.py` | 3 | parallel requests, over-HTTP, pool exhaustion |

**Pooled-connection identity leakage** — the specific hazard called out in the
brief — is covered by `test_pooled_connection_is_not_reused_with_stale_identity`,
`test_identity_cleared_on_the_very_connection_that_carried_it`,
`test_claims_are_cleared_on_scope_exit`, and `test_pool_exhaustion_does_not_leak_identity`.
Concurrent A/B/A/B traffic across the full creator journey is now also covered at
the cross-phase level (`tests/integration/test_cross_phase_journey.py`).

**Unauthenticated and invalid-JWT denial** are asserted for protected routes and
extended in this verification to the Phase 4 surface: `test_unauthenticated_today_access_is_denied`.

---

## 3. Gap found and closed: the Job system

`JobService` (`app/jobs/service.py`) exposes **eleven** public operations —
`create`, `claim`, `get`, `update_progress`, `complete`, `fail`, `cancel`,
`list_jobs`, `run_job`, plus helpers. It had **no dedicated test file**. Coverage
arrived only incidentally, through Producer and Studio flows.

It is not incidental surface: it is the Phase 2 chosen answer to async work, and
Phase 4's Producer depends on it. A defect in `claim()` would have been invisible.

**Added `apps/api/tests/integration/test_job_lifecycle.py` — 36 tests**, proving:

| Area | Proven |
|---|---|
| create | pending/zero-progress start; `total` and nested metadata round-trip; metadata defaults to `{}` not NULL |
| claim | moves to running; returns `None` on an empty queue; **never re-claims a running job**; filters by `job_type` |
| claim | never returns another creator's job |
| claim | **two concurrent sessions race the same queue; every job delivered exactly once — none lost, none doubled** |
| progress | intermediate progress; **clamped to 0–100** (a caller reporting 5000 stores 100); `total` revisable but preserved when omitted; cannot touch a foreign job |
| complete | marks done, forces progress 100, clears the error, stores the result |
| complete | **merges rather than replaces metadata** — a result never erases earlier context |
| fail | records the error and stops; **truncates a 50 000-char message** to the 1000 bound; `retry=True` genuinely returns the job to the queue and it is re-claimable |
| complete | a foreign creator cannot complete someone else's job |
| cancel | stops pending and running jobs; **refuses to rewrite a finished job** (invalid transition); idempotent; cannot touch a foreign job |
| read | `get` returns `None` for foreign/unknown; `list_jobs` is creator-scoped, newest first |
| run_job | completes with the result; **retries then succeeds**; **gives up after `max_retries`** (2 → three attempts); zero retries fails on the first; failures stay in the job row rather than raising into the request path |
| RLS | `jobs` has RLS enabled and **every policy is scoped by `user_id`**; raw SQL cannot read or delete another creator's jobs |

One test asserts an **unimplemented** behaviour deliberately:
`test_a_claimed_job_is_never_reclaimed_after_a_worker_dies`. There is no
stale-job recovery in Phase 2 — a job left `running` by a dead worker stays
running forever. That limitation is now explicit and will fail loudly if a future
phase adds recovery without deciding what the timeout should be.

---

## 4. Gap found and closed: prompt `template` vs `prompt`

The Phase 3 historical defect (assets authored under `prompt`, loader reading
`template`, producing a silent **empty** prompt) is covered by
`tests/unit/test_prompt_loader.py`, including "no shipped asset loads with an empty
template". Re-verified: **still passing.**

The generated contract surface for Phase 4 prompts
(`packages/prompts/producer/enrich.v1.json`) is included in that sweep.

---

## 5. Frontend contracts

`tests/unit/test_studio_contract_generation.py` (7) compares the committed
`apps/web/lib/studio-contracts.ts` against a live regeneration from the OpenAPI
document, so "types are current" is asserted rather than assumed.

**Extended in this verification** (`apps/web/tests/contracts.test.mjs`, 5 tests)
with the links that Python cannot see: that `lib/today-api.ts` actually imports
from the generated module, carries its provenance comment, and does **not**
restate a schema by hand; and that the contract still declares all five Today
item states the UI renders.

---

## 6. Warnings — classified

All 13 warnings in the Phase 4 baseline were **one class**, and a **test issue**:

```
PytestWarning: The test <Function ...> is marked with '@pytest.mark.asyncio'
but it is not an async function.
```

`tests/unit/test_studio_evaluation.py` had a module-level
`pytestmark = pytest.mark.asyncio` applied to all 21 tests, of which **14 are
synchronous** dataset assertions.

Not production, not deprecated, not a deferred item: the mark was simply wrong.
The module-level `pytestmark` was removed and the 5 genuinely-async tests marked
individually. **Suite warnings: 13 → 0.**

---

## 7. Live provider validation: DEFERRED

Not assumed — checked. `.env` sets `ANTHROPIC_API_KEY` and `GROQ_API_KEY`, and
both look non-placeholder by pattern. A live probe was therefore run
(reporting HTTP status only; no credential value was printed):

```
ANTHROPIC_API_KEY -> HTTP 401  => NOT USABLE (placeholder)
GROQ_API_KEY      -> HTTP 401  => NOT USABLE (placeholder)
```

**LIVE LLM VALIDATION = DEFERRED.**

No live test was faked. Everything above ran against the deterministic path and
scripted providers, which is sufficient for structure, contracts, isolation and
failure handling — and **not** sufficient to make any claim about real model
output quality.

---

## 8. Phase 2 acceptance

- [x] Shared services tested
- [x] E5 768-D verified
- [x] Vector migration verified
- [x] Memory verified
- [x] Voice verified
- [x] LLM Gateway verified
- [x] Prompt system verified
- [x] Jobs verified — **36 new tests; previously untested**
- [x] RLS verified
- [x] Cross-user concurrency verified
- [x] Frontend contracts verified

**Result: ACCEPTED WITH DEFERRED LIVE-AI VALIDATION**

The only open item is live provider output quality, which is blocked on real
credentials rather than on any code or test gap.
