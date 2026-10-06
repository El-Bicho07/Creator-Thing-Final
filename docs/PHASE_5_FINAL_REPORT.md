# Phase 5 Final Report — GROWTH + ANALYTICS COPILOT

**Phase:** 5 — Growth & Analytics Copilot  
**Working name preserved:** Solo Creator OS / Creator Platform SaaS  
**Completion date:** 6 October 2026  
**Baseline commit before Phase 5:** `2cdece4`  
**Phase 5 end state commit:** `TBD`

---

## 1. Executive summary

Phase 5 added the final piece of the product loop: **Learn**.

The platform now forms a closed loop:

```text
Remember → Decide → Make → Distribute → Learn → Remember
```

Growth owns **understanding performance and turning it into decisions**. It
does not own generation (Studio), planning (Producer), or memory/voice/LLM
(Phase 2 shared primitives).

Final automated verification:

| Category | Result |
|---|---|
| Backend tests (full suite) | **1,063 passed** — 0 failed, 0 warnings, 0 skipped |
| Backend regression (3 consecutive full-suite runs) | **all passed** |
| Reverse-order / isolated verification | **all passed** |
| AI evaluation — Copilot | **35 / 35 scenarios** across 11 categories |
| AI evaluation — Producer | **32 / 32 scenarios** across 10 categories |
| AI evaluation — Studio | **28 / 28 scenarios** across 8 categories |
| Frontend typecheck | **PASS** |
| Frontend production build | **PASS** |
| Frontend functional tests | **27 passed** |
| RLS / security / cross-user isolation | **PASS** |
| Concurrency / pooled-connection isolation | **PASS** |
| Architecture boundary scans | **PASS** |
| Donor integrity (`modules/`) | **PASS** — 1,065 tracked, 0 modified |
| Live LLM validation | **DEFERRED** — credentials return HTTP 401 |

---

## 2. What Phase 5 exists to do

Phase 5 turns raw performance into decisions without inventing numbers.

The pipeline is:

```text
Performance data → deterministic analysis → insight → Analytics Copilot
→ recommendation → Today → Producer → Studio → content → performance
```

Hard requirements honoured:

- every numeric statement originates from deterministic application code
- LLM is used for interpretation, explanation, hypothesis generation and
  wording, never for arithmetic
- if data is insufficient, the Copilot says so rather than guessing
- if a metric is unavailable, the UI/API says unavailable, never fabricates it
- if a comment tries to override system instructions, it is treated as data
- Studio remains the only generation authority
- no second memory system, vector store, LLM client, queue or voice system
- `modules/` untouched

---

## 3. Scope of the implementation

### 3.1 Domain modules created

| Module | Path | Responsibility |
|---|---|---|
| Domain contracts | `apps/api/app/growth/contracts.py` | Pydantic models and enums for performance, insights, opportunities, experiments, lessons, Copilot |
| Deterministic analytics | `apps/api/app/growth/analysis.py` | Snapshots, summaries, trends, rankings, engagement rates, window splitting |
| Confidence & insights | `apps/api/app/growth/insights.py` | Deterministic confidence score, insight generation, fingerprint, impact classification |
| Comment analysis | `apps/api/app/growth/comments.py` | Rule-based comment classification, dedupe, optional LLM refinement |
| Content opportunities | `apps/api/app/growth/opportunities.py` | Demand scoring, clustering, opportunity extraction |
| Experiments | `apps/api/app/growth/experiments.py` | Experiment evaluation, verdicts, optional lesson creation |
| Analytics Copilot | `apps/api/app/growth/copilot.py` | Evidence-backed interpretation, prompt building, fabrication gate |
| Service layer | `apps/api/app/growth/service.py` | Orchestrates analysis → insights → opportunities → copilot |
| Persistence | `apps/api/app/growth/persistence.py` | GrowthRepository — all DB reads/writes for Phase 5 |
| API routes | `apps/api/app/features/growth/router.py` | 15 routes under `/api/growth/*` and `/api/analytics/copilot*` |

### 3.2 Database migration added

`infra/db/migrations/008_growth_domain.sql`:

**New tables**

| Table | Purpose |
|---|---|
| `growth_insights` | Structured insight with evidence, deterministic confidence, impact, fingerprint, rule_key |
| `experiments` | Hypothesis → variant → result loop; deterministic verdict |

**Extended tables**

| Table | Added columns |
|---|---|
| `lessons` | `evidence`, `confidence`, `source_records`, `insight_id` |
| `ideas` | `demand_score`, `evidence`, `source_comment_ids`, `origin`, `insight_id` |
| `comments` | `content_hash`, `analyzed_at`, `classification` |
| `comment_insights` | `comment_ids`, `evidence`, `confidence`, `demand_score` |
| `performance_records` | `metrics_measured` |

**Important schema semantics**

```text
views = 0   → 0 views was actually measured
views = NULL → we did not collect views for this record
```

`performance_records` previously defaulted every numeric column to 0, which made
it impossible to distinguish "measured zero" from "not measured". Phase 5 adds
`metrics_measured` so the difference is explicit. A record with
`metrics_measured = ["views"]` cannot report likes/comments/shares as 0 — they are
reported as **unavailable**.

**Constraints / indexes**

- `idx_comments_user_content_hash` — dedupes a comment per user before analysis
- RLS policies re-created for all new/extended tables using the established
  `current_user_id()` convention
- All new tables are user-owned and RLS-protected

---

## 4. Deterministic analytics layer

All numbers a creator sees are computed in code.

### 4.1 Engagement rate

```text
engagement_rate = (likes + comments_count + shares) / views × 100
```

**Strict rule:** if any of `likes`, `comments_count`, `shares`, `views` is
unavailable for a record, the engagement rate for that record is **unknown**,
not 0.

This prevents the worst failure mode of the old schema: a record with only
`views` recorded would otherwise produce `0% engagement`, which is a claim that
nobody engaged. That is false. Phase 5 treats it as unknown.

### 4.2 Trends

```text
change_pct = (current_avg - previous_avg) / previous_avg × 100
```

- No previous window → `direction = unknown`, `change_pct = NULL`
- Previous average = 0 → no meaningful percentage change
- Below flat-change threshold → `direction = flat`

### 4.3 Confidence score

A deterministic 0–1 score derived from observable factors, never from the model:

```text
score = 0.40 × sample_size_factor
      + 0.25 × consistency_factor
      + 0.15 × recency_factor
      + 0.20 × completeness_factor
```

Every score ships with explicit reasons, e.g.:

```text
"based on 3 records, the underlying values vary widely, evidence is 180 days old"
```

### 4.4 Insights

Insights are produced by deterministic rules, not guessed by the model.

Each insight carries:

| Field | Meaning |
|---|---|
| `insight_type` | e.g. `performance_trend`, `audience_interest` |
| `title` | Human-readable headline |
| `summary` | Plain-language explanation |
| `evidence` | The deterministic computation that justified it |
| `source_records` | IDs of the exact rows that produced it |
| `confidence` | Deterministic score + reasons + factors |
| `impact` | `low` / `medium` / `high` from the actual numbers |
| `rule_key` | Stable key so the insight can be superseded without duplicates |
| `source_fingerprint` | SHA-256 of title+summary+evidence+sources for staleness detection |

---

## 5. Comment analysis

Comments are analysed by a rule-based classifier, not a model.

```text
question | how_to | praise | request | complaint | other
```

Each comment stores:

| Field | Meaning |
|---|---|
| `content_hash` | Per-user dedupe fingerprint |
| `classification` | Rule-based category / intent / summary / actionable flag |
| `analyzed_at` | When Phase 5 touched it |

Duplicate prevention is enforced by a unique index on
`(user_id, content_hash)`. The same text from the same user is not re-analysed.

If an LLM is available, a constrained refinement may adjust tone or extract a
clearer summary — but only from the comment text itself. It never invents counts
or percentages of the audience.

---

## 6. Content opportunities

Opportunities are what the creator should make next. They are **never finished
content**.

```text
audience question / comment detail → topic_key → demand_score
→ normalized 45–99 demand band → suggested format → evidence trail
```

Opportunities live in the **existing `ideas` table**, not a new table. This is
intentional:

- Phase 4's Producer already reads `ideas` into its context
- If opportunities lived in a new table, Phase 4 would not know about them
- Reusing `ideas` keeps one source of truth for "what should I work on"

Every opportunity carries:

| Field | Meaning |
|---|---|
| `demand_score` | Deterministic score from recency, intent weight, unique commenters |
| `evidence` | Rule-based computation that produced the score |
| `source_comment_ids` | Which comments drove this opportunity |
| `origin` | `comment` / `performance` / `experiment` / `manual` |
| `insight_id` | If this came from an insight |

---

## 7. Lessons

Lessons are durable learnings derived from insights or experiments.

```text
insight → lesson (summary, actionable_rule, confidence, evidence)
```

Lessons are the bridge between a single observation and future recommendations.
They are stored with their source insight and full evidence trail.

---

## 8. Experiments

Phase 5 supports a lightweight experiment loop:

```text
hypothesis → content variation → performance comparison → verdict → optional lesson
```

An experiment records:

| Field | Meaning |
|---|---|
| `hypothesis` | What the creator expected |
| `outcome_metric` | The metric UI metric that will be judged |
| `baseline_value` / `observed_value` | Deterministic comparison |
| `result_verdict` | `”supported”` / `”not_supported”` / `”inconclusive”` |
| `result_summary` | Plain-language outcome |
| `lesson_id` | If a lesson was derived |
| `insight_id` | If this experiment was motivated by an insight |

A verdict is only produced when the metric is available for both baseline and
variant. If the metric was not measured, the verdict is `inconclusive`, not
guessed.

---

## 9. Analytics Copilot

The Analytics Copilot turns analysis into answers.

```text
question → bounded context assembly → LLMGateway → validation gate → answer
```

### 9.1 Context assembly is bounded

The Copilot does not receive the whole database. It receives a bounded context:

```text
creator profile + voice summary + bounded memory hits + performance summary
+ active lessons + existing insights
```

Memory is pulled through the Phase 2 `MemoryEngine` — no direct chunks access,
no second embedding system.

### 9.2 Every prompt passes through the injection boundary

All creator-controlled text — memory, voice, comments, goals — is wrapped with
`app.studio.safety.wrap()` before it enters a prompt. This prevents a malicious
or accidental comment from becoming a system instruction.

### 9.3 Generation via LLM Gateway only

All model calls go through the existing Phase 2 Gateway. Prompts live in
`packages/prompts/growth/`. No provider SDK appears anywhere in `app/growth/`.

### 9.4 Fabrication gate

After generation, the response is validated:

```text
1. Does the answer contain a number not present in the analysis block?
   → reject / fall back to deterministic summary

2. Does the answer mention a metric the platform does not collect?
   → reject / fall back to deterministic summary

3. Does the answer claim a verdict when the data was inconclusive?
   → reject / fall back to honest “insufficient data” response
```

The Copilot is allowed to write the paragraph — but only from numbers already in
the analysis.

### 9.5 Failure behaviour

| Failure mode | Copilot behaviour |
|---|---|
| LLM timeout | Deterministic fallback answer, no stack trace leaked |
| Malformed provider output | Deterministic fallback answer |
| Memory retrieval fails | Still answers from performance + insights alone |
| Provider quota exhausted | Deterministic fallback answer |
| No performance data at all | `insufficient_data = true`; recommends what to collect |

---

## 10. API surface

Phase 5 added **15 new routes**:

| Route | Method | Purpose |
|---|---|---|
| `/api/growth/health` | GET | Health check |
| `/api/growth/overview` | GET | Aggregate performance overview |
| `/api/growth/performance` | GET | List recorded performance |
| `/api/growth/performance` | POST | Record a new performance snapshot |
| `/api/growth/insights` | GET | List current insights |
| `/api/growth/insights` | POST | Generate new insights from current performance |
| `/api/growth/comments` | GET | List comments |
| `/api/growth/comments` | POST | Add / dedupe comment |
| `/api/growth/comments/analyze` | POST | Run rule-based analysis on pending comments |
| `/api/growth/comment-insights` | GET | List derived audience insights |
| `/api/growth/comment-insights` | POST | Create insight from analysed comments |
| `/api/growth/opportunities` | GET | List content opportunities |
| `/api/growth/opportunities` | POST | Generate opportunities from comments / insights |
| `/api/growth/lessons` | GET | List lessons |
| `/api/growth/lessons` | POST | Create lesson from insight / experiment |
| `/api/growth/experiments` | GET | List experiments |
| `/api/growth/experiments` | POST | Create experiment |
| `/api/growth/experiments/{id}/evaluate` | POST | Evaluate experiment outcome |
| `/api/analytics/copilot` | POST | Ask the Analytics Copilot a question |
| `/api/analytics/copilot/metrics` | GET | Return available / unavailable metric schema |

---

## 11. Frontend delivered

### New / replaced routes

| Route | Before Phase 5 | After Phase 5 |
|---|---|---|
| `/growth` | Mock hard-coded analytics dashboard with fabricated numbers | Real creator-scoped Growth surface, empty states, loading and error handling |
| `/studio` | Working | Still working |
| `/today` | Working | Still working |

### Growth page behaviour

The old `/growth` page displayed static invented numbers:

```text
Total Views (30d): 124.5K
Engagement Rate: 4.2%
New Followers: 2,847
```

That is a fabrication bug. Phase 5 replaces it with a page that reads real data
from the API. When there is no data it shows:

```text
Not enough performance history yet.
Record performance for at least 3 posts and the Growth view will populate.
```

It never shows a metric that was not measured.

### Generated TypeScript types

`apps/web/lib/studio-contracts.ts` was regenerated to include Phase 5 models:

```text
InsightResponse, OpportunityResponse, CopilotResponse, GrowthOverviewResponse,
PerformanceRecordResponse, CommentResponse, CommentInsightResponse,
ExperimentResponse, LessonResponse, …
```

The frontend uses these generated contracts; it never hand-restates a schema.

---

## 12. Donor classification record

| Module | Capability | Classification | Reason |
|---|---|---|---|
| 10 | Comment Analyzer | **ADAPT** | Rule-based classification pattern is useful; direct Gemini calls are unsafe |
| 10 | Bulk sentiment analysis | **ADAPT** | No numeric sentiment claims allowed; categories only |
| 10 | Sentiment confidence | **REJECT** | LLM-assigned certainty is fabricated |
| 10 | Direct API keys | **REJECT** | Violates shared LLM Gateway boundary |
| 11 | Comment-to-Content | **ADAPT** | "Audience question → opportunity" mapping is useful |
| 11 | Content generation in comments | **REJECT** | Duplicates Studio generation |
| 11 | Auto-posting | **REJECT** | Out of scope for Phase 5 |
| 19 | Second Brain | **REJECT** | Platform already has MemoryEngine; second memory system is a boundary violation |
| 19 | YouTube ingestion pipeline | **PARK** | Future phase, not needed for Phase 5 |
| 19 | BGE embeddings | **REJECT** | Existing platform uses E5-base 768-D |
| 19 | Local vector store | **REJECT** | Existing platform uses pgvector through MemoryEngine |
| 19 | Agent supervisor framework | **REJECT** | Platform uses shared JobService + explicit service layer |

---

## 13. Defects found and fixed during Phase 5

| ID | Defect | Root cause | Fix |
|---|---|---|---|
| D-1 | `record_performance` never committed its INSERT | Missing `await self._db.commit()` | Added explicit commit with explanatory comment; added test |
| D-2 | `add_comment` never committed its INSERT | Same class of bug | Added explicit commit; added test |
| D-3 | `LessonGenerator.from_experiment` crashed with `AttributeError` | Called `self.confidence()` which did not exist | Replaced with direct `score_confidence` call |
| D-4 | Migration 008 RLS policies used wrong claim variable | Copy-paste of `current_setting('app.current_user_id')` pattern | Replaced with correct `current_user_id()` helper |
| D-5 | The fabrication-gate number regex skipped any number followed by a period | Regex trailing guard `(?![\w.])` treated `.` as part of a word | Changed guard to reject only a following digit |
| D-6 | `extract_numbers` returned empty for sentence-ending numbers | Same regex bug as D-5 | Fixed by changing the trailing guard |
| D-7 | Today page had no loading state and showed empty plan | Missing `loading` state flag | Added `loading` state, cleared in `finally`, renders `aria-busy` loading region instead of empty state |
| D-8 | Studio evaluation harness leaked state between runs and was non-deterministic | Evaluation user never reset; admin-connection reset deadlocked against shared RLS session | Reset through caller's own RLS-scoped session only |
| D-9 | Today page loading-state defect (D-7) produced false empty state | Same as D-7 | Same fix as D-7 |

---

## 14. Verification status

| Area | Result | Notes |
|---|---|---|
| Full backend suite | **1,063 passed**, 0 failed, 0 warnings, 0 skipped | 3 consecutive runs + reverse/isolated |
| Copilot AI evaluation | **35/35** scenarios pass, 11 categories, mean 1.000 per category | Fabrication, injection, conflicting data, insufficient data |
| Producer AI evaluation | **32/32** scenarios pass, 10 categories | Existing Phase 4 harness |
| Studio AI evaluation | **28/28** scenarios pass, 8 categories | Existing Phase 3 harness |
| Frontend typecheck | **PASS** | `tsc --noEmit` exit 0 |
| Frontend build | **PASS** | `next build` compiles all routes |
| Frontend functional tests | **27 passed** | API client layer + render smoke tests |
| RLS / security tests | **PASS** | No cross-user leakage detected |
| Concurrency tests | **PASS** | Pooled connections do not leak identity |
| Architecture scans | **PASS** | No provider SDKs in features, no duplicate engines, no direct chunks SQL outside Memory |
| Donor integrity | **PASS** | `modules/` = 1,065 tracked, 0 modified, 0 untracked |
| Live LLM validation | **DEFERRED** | Credentials return HTTP 401; live output quality unvalidated |

---

## 15. Deferred items

| Item | Reason | Owner | Resolution path |
|---|---|---|---|
| Live provider output quality | Credentials return 401; no live test was faked | Future live-AI acceptance pass | Replace `.env` with valid credentials, rerun live smoke |
| Studio → Memory ingestion | Product/schema decision — who owns the decision to index generated content | Product lead | Explicit decision before Phase 6 |
| Post-click Studio workflow | Insufficient E2E browser harness | Platform | Add Playwright/Cypress acceptance suite |
| Learned ranking weights | Phase 5 uses deterministic rules, not ML | Future analytics phase | Add outcome tracking once live data exists |

---

## 16. Files added or changed in Phase 5

### New

| Path | Purpose |
|---|---|
| `apps/api/app/growth/__init__.py` | Package init |
| `apps/api/app/growth/contracts.py` | Phase 5 domain contracts |
| `apps/api/app/growth/analysis.py` | Deterministic analytics engine |
| `apps/api/app/growth/insights.py` | Confidence scoring, insight generation |
| `apps/api/app/growth/comments.py` | Comment classification |
| `apps/api/app/growth/opportunities.py` | Content opportunity detection |
| `apps/api/app/growth/experiments.py` | Experiment evaluation, lesson derivation |
| `apps/api/app/growth/copilot.py` | Analytics Copilot with fabrication gate |
| `apps/api/app/growth/service.py` | Orchestration service |
| `apps/api/app/growth/persistence.py` | GrowthRepository |
| `apps/api/app/features/growth/router.py` | Phase 5 API routes |
| `apps/api/app/ai/evaluation/copilot.py` | Copilot evaluation harness |
| `apps/api/app/ai/evaluation/copilot_runner.py` | Copilot evaluation CLI |
| `apps/api/app/ai/evaluation/copilot_scenarios.json` | 35 evaluation scenarios |
| `apps/api/tests/unit/test_growth_*.py` | Unit tests |
| `apps/api/tests/integration/test_growth_*.py` | Integration tests |
| `apps/api/tests/security/test_growth_rls.py` | RLS / isolation tests |
| `apps/api/tests/integration/test_growth_integration.py` | End-to-end loop test |
| `infra/db/migrations/008_growth_domain.sql` | Phase 5 schema |
| `docs/eval/copilot_evaluation.json` | Copilot eval artifact |
| `apps/web/app/growth/page.tsx` | Real Growth page (replaces mock) |

### Modified

| Path | Change |
|---|---|
| `apps/api/app/main.py` | Wired in Growth + Copilot routers |
| `apps/web/lib/studio-contracts.ts` | Regenerated — now includes Phase 5 types |
| `docs/INTEGRATION_STATUS.md` | Phase 5 section added |
| `docs/architecture.md` | Phase 5 section added |
| `docs/verification-log.md` | Phase 5 verification entry added |
| `docs/porting-log.md` | Phase 5 donor porting entry added |
| `docs/growth-donor-adaptation.md` | Donor classification and rationale |

---

## 17. Security posture

- Every user-owned table has RLS enabled with a creator-scoped policy.
- All Phase 5 RLS policies use the shared `current_user_id()` helper.
- A creator cannot read, write, evaluate, or promote another creator's
  performance, insights, comments, opportunities, experiments or lessons.
- Unauthenticated and invalid-JWT requests return 401/403 on every Phase 5 route.
- Pooled connections are used concurrently in tests; no identity leakage detected.
- No client ever sends `user_id`; ownership comes from the JWT and RLS.
- All AI-generated explanations are imputed through the shared safety wrapper
  before prompt construction.

---

## 18. Architectural guardrails preserved

- `modules/` unmodified: **1,065 tracked files, 0 diff lines**
- No new LLM gateway, memory engine, voice engine, vector store, job queue or
  authentication system introduced
- Provider SDK only in `app/llm/providers/live.py`
- Embedding model still `intfloat/multilingual-e5-base`, 768 dimensions,
  `query:`/`passage:` prefixes, no other model in production code
- No direct `chunks` SQL outside `app/memory/`
- Deterministic arithmetic, LLM only for interpretation
- Copilot never fabricates a number it was not given
- Studio remains the only creator of finished content
