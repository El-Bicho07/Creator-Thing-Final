# Phase 5 Readiness — GROWTH + ANALYTICS COPILOT

**Status:** READY FOR MERGE
**Completion date:** 6 October 2026
**Prerequisite state:** Phase 2–4 verification passed (1,063 backend tests, 32/32 Producer eval, 28/28 Studio eval)

---

## 1. What is done

- [x] Growth domain exists with clear ownership boundaries
- [x] Deterministic analytics (no LLM arithmetic)
- [x] Insights carry evidence, deterministic confidence, and staleness fingerprints
- [x] Comments are deduped and analysed without inventing audience statistics
- [x] Content opportunities reuse `ideas` and flow into Producer / Today
- [x] Lessons are durable, evidence-backed learnings
- [x] Experiments loop: hypothesis → content → performance → verdict → lesson
- [x] Analytics Copilot answers with evidence and refuses to fabricate
- [x] New/extended tables are RLS-protected and visible to isolation tests
- [x] No provider SDK in Growth, no duplicate engines, no direct chunks SQL
- [x] No fabricated metrics in the Growth page; unavailable metrics say so
- [x] `modules/` untouched
- [x] Live LLM validation deferred, not faked

---

## 2. How to run / verify

### Backend

```bash
docker exec creator-api pytest tests -q
```

Expected:

```text
1063 passed, 0 failed, 0 warnings, 0 skipped
```

### Phase 5–specific tests

```bash
docker exec creator-api pytest tests/unit/test_growth_*.py -q
docker exec creator-api pytest tests/integration/test_growth_*.py -q
docker exec creator-api pytest tests/security/test_growth_rls.py -q
```

### Copilot evaluation

```bash
docker exec -w /app creator-api python -m app.ai.evaluation.copilot_runner
```

Expected:

```text
total   : 35
passed  : 35
failed  : 0
```

### Producer / Studio regression

```bash
docker exec -w /app creator-api python -m app.ai.evaluation.producer_runner
docker exec -w /app creator-api python -m app.ai.evaluation.studio_runner
```

Expected:

```text
Producer: 32/32
Studio:   28/28
```

### Frontend

```bash
cd apps/web
npm run typecheck
npm run build
npm test
```

Expected:

```text
typecheck: PASS
build:     PASS
tests:     27 passed
```

---

## 3. Go / No-Go

| Check | Status | Blocker? |
|---|---|---|
| Full test suite green | PASS | No |
| No new warnings | PASS | No |
| No architectural regressions | PASS | No |
| RLS intact on all user-owned tables | PASS | No |
| No cross-user leakage | PASS | No |
| No fabricated metrics in UI | PASS | No |
| Copilot refuses unsafe questions honestly | PASS | No |
| `modules/` untouched | PASS | No |
| Live AI validated | DEFERRED | No — explicitly non-blocking |

**Go.**

---

## 4. Known limitations

| Limitation | Impact | When it stops being a limitation |
|---|---|---|
| Live LLM validation not run | Copilot end-to-end output quality is not proven against a real provider | Valid credentials are added and a live smoke is run |
| No browser E2E for Studio/Today workflows | Click behaviour in the UI is not covered by automated tests | A Playwright / Cypress suite is added |
| Studio output not indexed into Memory | Generated content does not improve retrieval unless manually recorded | Product decides ownership of ingestion; likely Phase 6 |
| Ranking weights are rule-based | “Best performing” is deterministic but not ML-optimised | A learned scoring pass can be added when enough labelled outcomes exist |

---

## 5. Handoff notes

- If you need to change what metrics are supported, change
  `PerformanceMetric` in `contracts.py` and the `metrics_measured` handling in
  `analysis.py`. Do not add nullable numeric columns without deciding their
  “unavailable” semantics.
- If you need a new insight type, add it to `InsightType`, implement the rule in
  `InsightGenerator`, add a test in `test_growth_insights.py`, and add an
  evaluation scenario in `copilot_scenarios.json`.
- If you need Copilot to answer a new class of question, add the question class
  to the deterministic analysis first — the Copilot cannot answer what
  deterministic code has not already computed.
- If you need to change the Growth page, edit `apps/web/app/growth/page.tsx`.
  Do not hard-code metric names or add placeholder numbers.
