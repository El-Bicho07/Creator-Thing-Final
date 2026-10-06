# Phase 2–4 Consolidated Verification

**Scope:** Phase 2 (Shared AI Primitives), Phase 3 (Studio), Phase 4 (Today + AI
Creative Producer)
**Purpose:** consolidated verification, gap analysis, targeted test additions,
defect fixes, and a formal acceptance record
**Date:** 2026-10-06
**Commits verified:** Phase 2 `481532a`/`7e02c87`, Phase 3 `3edd8ae`, Phase 4 `6f7ab59`

**Phase 5 was not started.** No Growth, Analytics Copilot, Coach, Learning, or
Phase 5 architecture work was performed.

---

## Executive summary

| Phase | Baseline tests | Final tests | Result |
|---|---|---|---|
| Phase 2 — Shared AI Primitives | 286 | 845 (suite total) | **ACCEPTED WITH DEFERRED LIVE-AI VALIDATION** |
| Phase 3 — Studio | 588 | 845 (suite total) | **ACCEPTED WITH DEFERRED LIVE-AI VALIDATION** |
| Phase 4 — Today + Producer | 750 | 845 (suite total) | **ACCEPTED WITH DEFERRED LIVE-AI VALIDATION** |
| Cross-phase | — | 845 (suite total) | **ACCEPTED WITH DEFERRED LIVE-AI VALIDATION** |

Phase 2–4 are **formally acceptable**. The suite grew from **750 → 845 (+95)**, and
the **13 pre-existing warnings were eliminated (→ 0)**.

Three things this verification found that earlier reports did not:

1. **The Job system had no tests at all.** `JobService` exposes eleven operations
   and was covered only incidentally, despite being Phase 2's chosen async
   mechanism and a Phase 4 dependency. Now 36 dedicated tests.
2. **The Today page had no loading state.** It told creators with a full plan that
   nothing was planned, and invited them to re-plan a day that already existed.
   Fixed, with a regression test.
3. **Studio-generated content is never chunked**, so it is not retrievable by
   memory search. Reported, deliberately not fixed (see §9).

Zero new tables, zero new dependencies, zero donor modification.

---

## Baseline vs. final

| | Recorded baseline | Final | Delta |
|---|---|---|---|
| Backend tests | 750 | **845** | +95 |
| Skipped | 0 | **0** | — |
| Failed | 0 | **0** | — |
| Warnings | 13 | **0** | −13 |
| Producer evaluation | 32 / 32 | **32 / 32** | — |
| Studio evaluation | 28 / 28 | **28 / 28** | — |
| Frontend typecheck | pass | **pass** | — |
| Frontend build | pass | **pass** | — |
| Frontend functional tests | **none** | **27** | +27 |
| `modules/` drift | 0 | **0** | — |

The Phase 2 (286) and Phase 3 (588) figures are cumulative-suite figures from their
own points in history; 845 is the current whole-suite total. No Phase 2 or Phase 3
test was weakened, deleted, or skipped.

---

## Tests executed

### Backend — full suite, three consecutive runs plus reverse order

```bash
docker exec creator-api pytest tests -q --no-header -p no:cacheprovider
```

| Run | Result | Duration |
|---|---|---|
| 1 | **845 passed**, 0 failed, 0 skipped, 0 warnings | 128.61s |
| 2 | **845 passed**, 0 failed, 0 skipped, 0 warnings | 128.40s |
| 3 | **845 passed**, 0 failed, 0 skipped, 0 warnings | 128.08s |
| reverse order (all files, `tac`) | **845 passed** | 128.57s |
| canonical (recorded) | **845 passed** | 128.91s |

### Test-harness integrity

The brief required checking order dependence and fixture leakage. Executed:

| Check | Result |
|---|---|
| New files, reverse order | 95 passed |
| Each new file in isolation | 36 / 23 / 30 / 6 passed |
| Whole suite in reverse file order | 845 passed |
| Consecutive-run stability | 3 runs, identical counts |

No test depends on state left by a previous test.

**Known harness weakness found and fixed earlier (carried into this run):**
`tests/unit/test_studio_evaluation.py` had a module-level
`pytestmark = pytest.mark.asyncio` applied to 14 *synchronous* tests, producing
13 warnings. Fixed by removing the module-level mark and decorating the 5 genuinely
async tests individually. **Warnings: 13 → 0.**

### Frontend

```bash
cd apps/web
npm run typecheck     # exit 0
npm run build         # success — /today 6.48 kB, /studio 8.84 kB
npm test              # 27 tests, 27 passed, 0 failed
```

### Evaluations

```bash
docker exec creator-api python -m app.ai.evaluation.producer_runner   # 32/32, exit 0
docker exec creator-api pytest tests/unit/test_studio_evaluation.py    # 28/28
```

---

## New tests added

| File | Tests | What it proves |
|---|---|---|
| `apps/api/tests/integration/test_job_lifecycle.py` | **36** | The entire Phase 2 Job system: create/claim/progress/complete/fail/retry/cancel; **duplicate-claim prevention under two concurrent workers**; progress clamping; metadata merge-not-replace; retry limits; invalid transitions; ownership; RLS incl. raw-SQL forgery; **the absence of stale-job recovery, asserted deliberately** |
| `apps/api/tests/integration/test_studio_lineage.py` | **23** | Version monotonicity and per-session numbering; `parent_generation_id` chain shape; `ON DELETE SET NULL` semantics; duplicate-version and `version >= 1` constraint enforcement; **asset + chunk cleanup on every deletion path (both tables asserted)**; critique attachment isolation; explicit-approval-only |
| `apps/api/tests/integration/test_today_lifecycle.py` | **30** | Every legal Today transition and every illegal one; the reopen rules; **declared machine == enforced machine**; persistence read back through fresh connections; **`GET /api/today` is side-effect free**; empty-plan contract; Producer failure paths (dead provider, malformed output, memory failure, handoff failure); prompt injection; the anti-fabrication empty-plan boundary |
| `apps/api/tests/integration/test_cross_phase_journey.py` | **6** | The full chain auth → RLS → memory → voice → gateway → Producer → Today → Studio → asset → embedding; **the Producer generates nothing itself**; combined cross-user isolation across the entire API surface; interleaved concurrent A/B journeys; provider-failure leak scan |
| `apps/web/tests/api-client.test.mjs` | **16** | Endpoints, methods, JWT header, `ApiError` mapping, FastAPI `detail` fallback, non-JSON body, 204 handling; **no client call ever sends `user_id`**; the browser never targets a provider origin |
| `apps/web/tests/pages.test.mjs` | **6** | Today and Studio render; **loading-state regression test**; no provider surface in the UI; no internal detail in markup |
| `apps/web/tests/contracts.test.mjs` | **5** | Generated-types chain: the client imports the generated module, does not restate a schema, and the contract still declares all five Today statuses |

**Total new: 122** (95 backend + 27 frontend).

Approximately 200 lines of test code written during this verification were
**deleted** because an equivalent assertion already existed — the brief asked for
targeted additions, not volume.

---

## Defects found

### D1 — Production defect: Today page had no loading state

- **Symptom.** On every load, `app/today/page.tsx` rendered "Nothing planned for
  today. Run the Producer, or add work yourself." while the request was in flight,
  even when the creator had a full plan.
- **Root cause.** `plan` initialised to `null`; `items = plan?.items ?? []`; no
  `loading` flag existed in the file.
- **Impact.** A false statement about the creator's own day, and an *actionable*
  one — it invited re-planning a day that already had a plan. Server-side dedupe
  would have caught the duplicate, but relying on that to paper over a misleading UI
  is not acceptable.
- **Fix.** `loading` state initialised `true`, cleared in `finally` (so it also
  clears on error), rendering an accessible `role="status"` / `aria-busy` region
  instead of the empty state.
- **Regression test.** `test_shows_a_loading_affordance_not_a_false_empty_state_before_data_arrives`.
- **Verification.** 27 frontend tests pass; typecheck and build clean.

### D2 — Test-harness defect: 13 `pytestmark` warnings

- **Symptom.** 13 `PytestWarning`s on every run.
- **Root cause.** Module-level `pytestmark = pytest.mark.asyncio` in
  `test_studio_evaluation.py` applied to 14 synchronous tests.
- **Classification.** Test issue, not production, not deprecated.
- **Fix.** Removed the module-level mark; decorated the 5 async tests individually.
- **Result.** 13 → 0 warnings.

### D3 — Coverage gap: the Job system was untested

- **Symptom.** None observed — that is the problem. `JobService` (eleven
  operations) had no dedicated tests; a defect in `claim()` would have been
  invisible.
- **Root cause.** The service was built in Phase 2 and exercised only indirectly
  through later features.
- **Fix.** 36 new tests. Notably `claim()` was found to be correct under two
  concurrent sessions (`FOR UPDATE SKIP LOCKED`), which had never been proven.
- **Regression test.** The whole file.

### D4 — Coverage gap: generation lineage and asset lifecycle

- **Symptom.** `max_refinements_per_version` appeared in exactly **one** test.
  Version ordering, lineage shape, latest-version selection, and orphan prevention
  were asserted nowhere.
- **Root cause.** Verified through the API surface but never at the persistence
  layer, so the deletion cascade — which is where Phase 3 defect 2 lived — was
  untested.
- **Fix.** 23 tests asserting on **both** the generation row and the asset row for
  every deletion path.

### D5 — Coverage gap: Today state machine and failure paths

- **Symptom.** Five incidental references to item statuses; two malformed-input
  tests for Producer failure.
- **Root cause.** The state machine was exercised only through the happy paths
  used by flow tests.
- **Fix.** 30 tests, including the declared-vs-enforced machine agreement check.

### D6 — Finding: Studio output is never chunked (NOT FIXED)

- **Symptom.** `StudioOrchestrator` persists via `repository.create_asset(...)` and
  never calls the Memory Engine, so Studio-generated content has no `chunks` rows.
- **Impact.** Generated content is not retrievable by memory search; the Producer,
  which reads memory, cannot use a creator's own output as grounding.
- **Why not fixed.** Making it retrievable is a product/schema decision (chunk on
  write? separate stores? opt-in?). Changing ingestion behaviour inside a
  verification task would exceed the mandate and could affect Phase 4 ranking.
- **Action.** Recorded here and in `PHASE_3_VERIFICATION_FINAL.md` §8. Should be
  resolved before Phase 5, where performance loops will want generated content as
  memory.

### D7 — My own test defects, corrected rather than papered over

Recorded because the corrections are informative:

| Initial test | Why it failed | Resolution |
|---|---|---|
| Prompt-injection test asserted hostile substrings absent | The Producer **legitimately quotes** retrieved memory as evidence; the quote contains the injection | Rewritten to assert the real property: injected text never becomes a title, kind, or priority escalation |
| "Profile-only creator gets a recommendation" | The planner's anti-fabrication gate correctly requires memory **or** prior content | Rewrote to assert the *correct* behaviour, and added a test pinning that boundary so it cannot be relaxed |
| Concurrency test asserted on item-title substrings | Weak assertion that would pass while identities crossed | Rewritten to assert on **item identity sets**, which is what actually proves no boundary crossing |

In every case the **production behaviour was confirmed correct and the test was
fixed** — no production rule was weakened to make the suite green.

---

## Security

| Area | Result |
|---|---|
| RLS enabled on all tables | pass — `test_all_tables_have_rls_enabled` |
| RLS policy coverage | pass — every table has policies |
| Policies scoped by `user_id` | pass — asserted for `jobs` in the new job tests |
| User A → own data | allowed |
| User A → User B data | denied, across every table **and** every Phase 4 route |
| Unauthenticated → protected data | denied (extended to `/api/today`, `/api/producer/*`) |
| Invalid JWT → protected data | denied |
| Missing identity → protected data | denied (claims cleared on scope exit) |
| **Pooled-connection identity leakage** | denied — 8 dedicated tests incl. pool exhaustion and stale-identity reuse |
| Raw-SQL forgery (bypassing repositories) | denied for `jobs`, `plan_items`, `studio_*` |
| SQL injection | none — the only two f-string SQL constructions interpolate **code-defined literal fragments** with bound parameters (`persistence.py` clause builders); user values are always bound |
| Prompt injection | Producer: 4 eval scenarios + integration test; Studio: 18 `test_studio_safety.py` tests |
| Error leakage | no `Traceback`, connection string, `asyncpg`, `psycopg`, or SQL in any client-facing error — asserted in new tests |
| Secrets in tracked files | none. Five test files match a secret-shaped regex; all use the single identical synthetic fixture `sk-abcdef…` proving secrets never leak into responses |
| `.env` tracked | no — only `.env.example` |
| CORS | localhost:3000 / 127.0.0.1:3000 only, `allow_credentials=True` |
| JWT verification | PyJWKClient signing-key lookup, `verify_exp=True`, typed exception handling |
| Client-controlled identity | none — no router accepts `user_id` in a body or query; the new frontend test asserts no client call sends one |

---

## Architecture

| Scan | Result | Inspection |
|---|---|---|
| Provider SDK imports in `app/features/`, `app/producer/`, `app/studio/` | **0** | — |
| Provider SDK imports anywhere in `app/` | **1** — `app/llm/providers/live.py` | Correct: that *is* the provider boundary |
| `SentenceTransformer` outside `app/ai/embedding/e5.py` | **0** | — |
| Hardcoded alternative embedding models (`bge-m3`, `tamil-embed`, `all-MiniLM`, `text-embedding-3`) | **0** | — |
| Raw `chunks` SQL outside `app/memory/` | **0** | Manually inspected all 12 files mentioning `chunks`: every hit is a comment explaining the prohibition, a response-model field name, or `app/features/memory/router.py` (the Memory feature itself) |
| Duplicate LLM Gateway / Memory / Voice definitions | **0** — one each | — |
| Client-controlled `user_id` | **0** | — |
| Raw engine construction / credential access in feature modules | **0** | — |
| Redis / Kafka / Celery / Kubernetes | **0** | One docstring noting their absence |
| `384`-dimension assumptions | **docstrings only**, in `app/memory/reembed.py` describing the migration | No code path assumes it |
| New tables | **0** | Phase 4 extended `plan_items` |
| New dependencies | **0** | Frontend tests use Node's runner + React 19 + installed `typescript` |

---

## Frontend

| Gate | Result |
|---|---|
| **Typecheck** (`tsc --noEmit`) | **pass**, exit 0 |
| **Production build** (`next build`) | **pass** — 11/11 pages, `/today` 6.48 kB, `/studio` 8.84 kB |
| **Functional workflow** (`npm test`) | **27 passed, 0 failed** — previously *zero* tests |

Functional coverage: endpoints/methods/auth header, error mapping (including
FastAPI `detail` and non-JSON bodies), 204 handling, no `user_id` leakage, Today and
Studio initial render, loading-state regression, no provider surface in the UI, and
the generated-TypeScript-types chain.

**Declared limitation.** `react-dom/server` renders initial markup only, so
post-click behaviour — run Producer → recommendations appear, status change
round-trip, Studio handoff navigation — is **not** verified in a browser. Closing
that needs `jsdom`/`happy-dom` or Playwright, which the brief asked not to
introduce. Documented in `apps/web/tests/README.md`. The backend equivalent *is*
covered end-to-end.

---

## AI evaluation

Deterministic evaluations, both re-run and both green.

**Producer — 32/32 across 10 categories**

| Category | n |
|---|---|
| `sparse_creator` | 5 |
| `conflicting_context` | 4 |
| `multiple_priorities` | 4 |
| `prompt_injection` | 4 |
| `studio_handoff` | 4 |
| `normal_creator` | 3 |
| `no_useful_action` | 3 |
| `anti_fabrication` | 2 |
| `unfinished_work` | 2 |
| `context_relevance` | 1 |

**Studio — 28/28 across 8 categories**: `idea_to_content` 5, `script_quality` 4,
`hook_quality` 4, `refinement_quality` 4, `critique_usefulness` 4, `memory_usage` 3,
`context_relevance` 2, `instruction_following` 2.

No scenarios were added — the brief asked not to inflate evaluations, and the
required dimensions were already covered.

**Not claimed:** these are deterministic, scripted-provider evaluations. They verify
structure, contract adherence, evidence resolution, and instruction separation. They
do **not** verify factual truth of model output, nor live generation quality.

---

## Live provider

**LIVE LLM VALIDATION = DEFERRED**

This was checked, not assumed. `.env` sets `ANTHROPIC_API_KEY` and `GROQ_API_KEY`,
and both look non-placeholder by pattern. A live probe was therefore run, reporting
**HTTP status only — no credential value was printed**:

```
ANTHROPIC_API_KEY -> HTTP 401  => NOT USABLE (placeholder)
GROQ_API_KEY      -> HTTP 401  => NOT USABLE (placeholder)
```

No live test was faked. What this leaves unverified:

- real model output quality for Studio generation and critique;
- **the quality of the Producer's wording enrichment** — the one place a model
  writes prose in Phase 4;
- real-world latency, rate limiting, and cost behaviour.

Everything verified above ran against the deterministic path and scripted
providers, which is sufficient for structure, contracts, isolation, and failure
handling.

---

## Donor integrity

```
git diff --stat -- modules   ->  0 lines
git ls-files modules | wc -l ->  1065
```

**`modules/` unchanged.** No donor file was modified, and no test failure was
solved by touching a donor module.

---

## Warnings

All 13 pre-existing warnings were **one class** and are now **zero**.

| Classification | Count | Detail |
|---|---|---|
| Test issue — **fixed** | 13 | `pytestmark = pytest.mark.asyncio` applied to 14 synchronous tests in `test_studio_evaluation.py` |
| Production issue | 0 | — |
| Actionable defect | 0 | — |
| Deprecated | 0 | — |
| Known/deferred | 0 | — |
| Harmless | 0 | — |

No warning was ignored, and none was allowed to fail the run.

---

## Acceptance criteria

### Phase 2
[x] Shared services tested · [x] E5 768-D verified · [x] Vector migration verified ·
[x] Memory verified · [x] Voice verified · [x] LLM Gateway verified ·
[x] Prompt system verified · [x] Jobs verified *(36 new tests; previously untested)* ·
[x] RLS verified · [x] Cross-user concurrency verified · [x] Frontend contracts verified

### Phase 3
[x] Studio lifecycle verified · [x] All capabilities verified ·
[x] Session isolation verified · [x] Generation lineage verified *(23 new tests)* ·
[x] Critique verified · [x] Refinement verified · [x] Asset lifecycle verified ·
[x] Prompt regression verified · [x] Studio security verified ·
[x] Frontend workflow verified *(partial — see §Frontend)* · [x] AI evaluation verified

### Phase 4
[x] Today verified · [x] Producer verified · [x] Recommendation contracts verified ·
[x] Producer safety verified · [x] Prompt injection verified ·
[x] Producer → Studio verified · [x] Today persistence verified · [x] Jobs verified ·
[x] Frontend Today workflow verified *(partial)* · [x] Generated TS types verified ·
[x] Producer AI evaluation verified

### Cross-phase
[x] Full integration verified · [x] Cross-user isolation verified ·
[x] Failure paths verified · [x] Full regression suite passes ·
[x] Three consecutive full runs stable · [x] Frontend typecheck passes ·
[x] Frontend build passes · [x] Donor modules unchanged ·
[x] Architecture scans clean · [x] Security checks complete · [x] Warnings classified

---

## What remains genuinely unverified

Stated plainly, because a green suite is not the same as a verified product:

1. **Live LLM output quality** — deferred; credentials are placeholders (401).
   The largest gap, and it is a confidence gap rather than a code gap.
2. **Post-click frontend behaviour** — no DOM/browser harness. Initial render and
   the whole client layer are covered; interactions are not.
3. **Studio output is not retrievable from memory** (D6) — a design question left
   open deliberately.
4. **Factual truth of generated content** — not claimed anywhere. Anti-fabrication
   metrics check the model did not invent numbers *relative to supplied context*.
5. **No performance/load testing** at any concurrency beyond the correctness-level
   interleaving in `test_concurrency_isolation.py` and the cross-phase journey.
6. **Ranking weights are hand-tuned**, not validated against outcome data. Phase 5
   performance data is the natural input.

---

## Final status

```
ACCEPTED WITH DEFERRED LIVE-AI VALIDATION
```

"100% verified" is **not** claimed: live provider validation remains unavailable,
and two coverage limitations are documented above.

Phase 5 was **not** started.

---

## Documentation index

| Document | Contents |
|---|---|
| `docs/PHASE_2_VERIFICATION_FINAL.md` | Phase 2 detail, incl. the 36 new Job tests |
| `docs/PHASE_3_VERIFICATION_FINAL.md` | Phase 3 detail, incl. the 23 lineage tests and the unchunked-output finding |
| `docs/PHASE_4_VERIFICATION_FINAL.md` | Phase 4 detail, incl. the loading-state defect |
| `docs/PHASE_2_3_4_CONSOLIDATED_VERIFICATION.md` | This document |
| `apps/web/tests/README.md` | Frontend harness design and its declared limits |
