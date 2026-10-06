# Phase 4 Final Report — TODAY & CREATIVE PRODUCER

**Phase:** 4 — Today & Creative Producer
**Status:** ✅ Complete
**Baseline:** Phase 3 commit `3edd8ae`
**Date:** 2026-10-06

---

## 1. Executive summary

Phase 4 adds the platform's **decide** step: a daily plan that tells a solo creator
what to do today and why, backed by evidence from their own profile, memory, voice,
prior work, and unfinished plans.

The design constraint that shaped everything: **the Producer decides *what*; Studio
still decides *how*.** The Producer never calls a provider, never drafts copy, and
never writes content. It ranks candidates, asks the LLM Gateway only to rephrase
recommendations it has already selected, and hands off to Studio for generation.

Three properties are enforced by construction rather than by review:

1. **Zero new tables.** The unused `plan_items` table from migration 001 was
   extended in place; Producer runs reuse the existing `jobs` table; generated
   output stays in `content_assets`.
2. **Deterministic-first ranking.** Candidate eligibility, order, and slot
   assignment are computed in Python. The model only reorders nothing and invents
   nothing — if the provider is down, the plan is still produced.
3. **Evidence is mandatory.** Every recommendation carries a
   `reason_kind` and must resolve to a real record. A recommendation whose
   evidence cannot be resolved is dropped, not rendered.

### Verification headline

| Measure | Phase 3 | Phase 4 |
|---|---|---|
| Backend tests | 588 | **750 passed, 0 failed** |
| Producer evaluation | — | **32 / 32 scenarios** |
| Studio evaluation | 28 / 28 | **28 / 28 (re-verified)** |
| New tables | 2 | **0** |
| Frontend | typecheck + build | **typecheck + build pass** |
| `modules/` drift | 0 | **0** (1065 files) |

---

## 2. Architecture

```
              ┌───────────────────────────────────────────┐
   request ──▶│ features/today/router.py                  │
              │ features/producer/router.py               │
              └────────────────┬──────────────────────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │ producer/service.py   │  orchestrates one plan run
                   └───────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
 ┌──────────────┐     ┌──────────────────┐   ┌─────────────────┐
 │ context.py   │     │  planner.py      │   │ persistence.py  │
 │ assembles    │     │  deterministic   │   │ plan_items      │
 │ evidence     │     │  ranking/slots   │   │ repository      │
 └──────┬───────┘     └────────┬─────────┘   └────────┬────────┘
        │                      │                      │
        ▼                      ▼                      ▼
 Phase 2 Platform      LLM Gateway (wording     existing `jobs`
 MemoryEngine /        only, degrades to        (JobService)
 VoiceEngine           deterministic plan)
        │
        ▼
 Studio (`/studio?session=…`) owns generation
```

### Module map

| Module | Responsibility |
|---|---|
| `app/producer/contracts.py` | Domain types + wire contracts (`TodayItem`, `Recommendation`, `StudioHandoff`) |
| `app/producer/context.py` | Assembles creator profile, memory refs, voice, prior assets, unfinished plans |
| `app/producer/planner.py` | Candidate generation, scoring, slot assignment, budget caps |
| `app/producer/persistence.py` | `plan_items` repository, status transitions, dedupe |
| `app/producer/service.py` | One plan run: evidence → rank → enrich → validate → persist → handoff |
| `app/features/today/router.py` | Today read/mutate routes |
| `app/features/producer/router.py` | Recommend + Studio handoff routes |
| `packages/prompts/producer/enrich.v1.json` | Wording-only enrichment prompt |

---

## 3. Ranking model

`planner.py` scores candidates with transparent, auditable weights. No score is
produced by the model.

| Signal | Weight | Rationale |
|---|---|---|
| Overdue continuation | +2.5/day | Finishing started work beats starting new work |
| `planning_gap` (profile states a goal with no recent output) | +2.5 | The clearest signal a creator has an unaddressed intent |
| Bare niche (no audience, no memory) | +2.0 | Sparse creators need a starting point, not a plan |
| Strong profile, thin execution | +2.0 | Capable creator, not shipping |
| Repurpose of own Studio asset | +1.5 | Cheapest real win available |
| Adequate portfolio | −1.5 | Already producing enough |
| High fatigue | −2.5 | Protect rest; the surface must be able to say "nothing today" |

Two of these were **corrected during Phase 4** after tests contradicted the
original intent:

- `planning_gap` was double-counted into the `create` score, inflating fresh
  content above overdue carryover. Removed.
- The carryover bonus was too weak, so a creator's own abandoned work always
  lost to a new idea. Raised to +2.5/day, which means **one day of slippage still
  yields to a fresh concept, but a week does not.**

The day shape is borrowed from Module 04: one main action, plus optional smaller
actions. `test_overdue_carryover_overtakes_new_work` pins this crossover.

---

## 4. Zero new tables

Migration `infra/db/migrations/007_today_plan.sql` **extends `plan_items`** with:

`status`, `reason`, `reason_kind`, `action_kind`, `capability`, `rank`,
`dedupe_key`, `studio_session_id`, `generation_id`, `source`,
`recommendation`, `priority_band`

plus constraints, a status-transition trigger, RLS-compatible indexes, and a
partial unique index on `dedupe_key` so repeated Producer runs cannot
double-book a day.

| Concern | Reused instead of new table |
|---|---|
| Today's plan | `plan_items` (extended) |
| Async Producer run | `jobs` + `JobService` |
| Generated content | `content_assets` |
| Studio session | `studio_sessions` |

---

## 5. Database changes

- `007_today_plan.sql` — applied locally; additive only.
- An initially omitted `reason_kind` column was caught by contract tests and added.
- UUID-array binding was moved from SQLite-style to native asyncpg list binding.

---

## 6. API changes

12 routes registered across `features/today` and `features/producer`. All Phase 4
responses use explicit Pydantic response models, so the schemas now appear in
OpenAPI rather than being opaque.

Representative routes:

| Route | Purpose |
|---|---|
| `GET /api/today` | The persisted plan for a date |
| `GET /api/today/carryover` | Overdue items from prior days |
| `POST /api/today/items` | Manual task |
| `PATCH /api/today/items/{id}` | Status / completion transition |
| `POST /api/producer/recommend` | Run the Producer (preview or persist) |
| `POST /api/producer/sessions/{id}/handoff` | Create Studio session for an item |

---

## 7. Frontend changes

| File | Purpose |
|---|---|
| `apps/web/app/today/page.tsx` | Plan, priority / recommended / completed states, manual tasks |
| `apps/web/lib/today-api.ts` | Typed client generated from the OpenAPI schemas |
| `apps/web/app/studio/page.tsx` | `/studio?session=<id>` deep link, wrapped in Suspense |
| `apps/web/lib/studio-contracts.ts` | Regenerated Studio + Today/Producer contracts |

`tsc --noEmit` exits 0. `next build` succeeds; `/today` is 6.39 kB and `/studio`
is 8.84 kB.

---

## 8. Security & RLS verification

`apps/api/tests/security/test_producer_rls.py` (17 tests) asserts that a session
scoped to user A cannot read, update, or delete user B's plan items — including
raw-SQL forgery attempts that bypass the repository layer.

Creator-profile evidence is validated **before** any UUID binding, so a
non-UUID profile marker cannot produce a database error path.

---

## 9. AI evaluation

32 scenarios across 10 categories, including adversarial ones
(`prompt_injection`, `no_useful_action`, `unfinished_work`, `sparse_creator`,
`studio_handoff`, `normal_creator`).

- **32 / 32 pass.** Results: `docs/eval/producer_evaluation.json`
- The harness clears creator profiles between scenarios.

Provider call failures during the evaluation are **expected and desirable**: they
demonstrate the deterministic fallback path.

---

## 10. Phase 4 defects found and fixed

Recorded because each was a real bug, not a test adjustment:

1. `reason_kind` missing from migration 007.
2. SQLite-style UUID-array binding in production PostgreSQL path.
3. Stored recommendation snapshot did not round-trip.
4. `StudioHandoff` missing its `@dataclass` decorator.
5. Today progress sync stored a placeholder instead of the real generation ID.
6. Creator-profile marker checked after UUID binding.
7. Memory-owned assets counted as prior Studio work.
8. Producer ignored named voice profiles when no `Primary Style` existed.
9. `planning_gap` double-counted in `create` scoring.
10. Carryover underweighted, so new ideas always beat started work.
11. Repurpose candidate was unreachable.
12. Producer evaluations leaked creator profiles across scenarios.
13. **Studio evaluation never reset its user**, so `memory_used` depended on how
    many times the suite had been run (see §11).
14. **The Studio evaluation's admin-connection reset deadlocked** against the
    long-lived shared session, making results nondeterministic. Fixed by resetting
    through the caller's own RLS-scoped session, which is sufficient because the
    evaluation user owns every row it deletes.

---

## 11. The two full-suite failures

The Phase 4 exit run surfaced two failures that passed individually:

**`test_rich_creator_gets_the_higher_scoring_main_slot`** — a genuinely stale
test. Its premise ("create outranks carryover") had been deliberately changed
during Phase 4 when overdue carryover was made to outrank new work. Rather than
weaken the production rule, the test was rewritten as
`test_overdue_carryover_overtakes_new_work`, which pins the actual crossover
point (one day of slippage yields; a week does not) and asserts the day still
holds exactly one main action.

**`test_all_scenarios_pass` (`studio_002_idea_uses_creator_memory`,
`memory_used: 0.0`)** — a Phase 3 harness defect, not a platform defect. Two
causes compounded:

- The evaluation user was never reset, so its corpus grew on every run.
- Adding an admin-connection reset introduced row-lock contention against the
  shared session, producing nondeterministic results.

The fix was to reset through the caller's own RLS-scoped session. The harness now
also records `context_notes` on every result and prints them in the failure
message, so a future `memory_used: 0.0` distinguishes *"nothing relevant
retrieved"* from *"retrieval raised"*.

---

## 12. Test results

```
750 passed, 13 warnings in 117.44s
750 passed, 13 warnings in 137.58s
```

Two consecutive clean full-suite runs. Zero skipped.

---

## 13. Boundary scans

| Scan | Result |
|---|---|
| Provider SDK imports in `app/features/` | 0 |
| Direct `SentenceTransformer` use outside `app/ai/embedding/e5.py` | 0 (one docstring mention in `memory/retrieval.py`) |
| Direct `chunks` SQL in `app/features/` | 0 |
| Duplicate Gateway / Memory / Voice engine definitions | 0 (one definition each) |
| Redis / Kafka / Celery | 0 (one docstring noting their absence) |
| `modules/` | 1065 tracked, 0 modified, 0 diff lines |

---

## 14. Known limitations

1. **Live provider output quality is unvalidated.** `.env` holds placeholder
   credentials. All verification used the deterministic path and scripted
   providers. This is a real gap in confidence, not a claim of completion.
2. Recommendation *wording* quality is therefore also unmeasured in production.
3. Ranking weights are hand-tuned, not learned from outcome data. Phase 5
   performance data is the natural input.
4. Time budgets are a single daily cap; no per-day-of-week modelling.

---

## 15. Deferred work

Not started, by instruction: Phase 5 (Growth & Analytics Copilot), Coach /
closed learning loop, distribution.

---

## 16. Donors

Neither Module 04 nor Module 21 contains prioritization logic. Module 04's
engine and storage are absent from the donor; Module 21 is largely stubs. The
useful patterns taken were Module 04's 3-slot day shape and Module 21's evidence
forcing, anti-fabrication rule, and bounded-loop discipline. Full classification
and rejection reasoning: `docs/producer-donor-adaptation.md`.

---

## 17. Reproducing this report

```bash
# migrations
psql "$DATABASE_URL" -f infra/db/migrations/007_today_plan.sql

# backend
docker exec creator-api pytest tests -q
docker exec creator-api python -m app.ai.evaluation.producer_runner

# frontend
cd apps/web && npm run typecheck && npm run build

# boundary
git status --porcelain modules   # must be empty
git ls-files modules | wc -l    # must be 1065
```
