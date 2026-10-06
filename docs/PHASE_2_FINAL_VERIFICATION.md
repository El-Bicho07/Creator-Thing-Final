# Phase 2 — Final Verification

> **Superseded.** This document records the *original* Phase 2 verification run
> (2026-10-05) and is retained as the historical record for that phase.
>
> The **final** Phase 2 verification record, extended by the Phase 2–4
> consolidated cycle, is `docs/PHASE_2_VERIFICATION_FINAL.md`. The consolidated
> executive record is `docs/PHASE_2_3_4_CONSOLIDATED_VERIFICATION.md`.
>
> One material finding was made after this document was written: `JobService` had
> insufficient dedicated test coverage. 36 dedicated tests were added during the
> consolidated cycle. See `docs/PHASE_2_VERIFICATION_FINAL.md` §4.

**Date:** 2026-10-05
**Scope:** Phase 2 hardening and independent verification only.
**Baseline commit:** `481532a` — *Phase 2: shared AI primitives (E5-base gateway, voice + memory engines)*
**Verdict:** Phase 2 is functionally complete and verified, with one external blocker (live LLM provider credentials) and no code defects outstanding.

Every result below was produced by running the command shown. No result is asserted from memory.

---

## 1. Acceptance matrix

| # | Area | Result | Evidence |
|---|------|--------|----------|
| 1 | RLS session identity | **VERIFIED** | `apps/api/app/core/db.py`; 8 + 20 dedicated tests; negative control |
| 2 | Cross-user isolation (exhaustive) | **VERIFIED** | 31 tests, all 13 user-owned tables |
| 3 | Concurrency isolation | **VERIFIED** | 3 tests (SQL / HTTP / pool pressure), repeat-run stable |
| 4 | Fail-safe behaviour | **VERIFIED** | 20 tests (bad identity + bad/absent JWT) |
| 5 | E5 embedding service | **VERIFIED** | 28 tests; live dimension/prefix/norm checks |
| 6 | Vector provenance (no fake conversion) | **VERIFIED** | 11 tests; negative control reproduced cosine `1.000000` |
| 7 | Vector migration `384 → 768` | **VERIFIED** | Migrations 003/004; live schema is `vector(768)` |
| 8 | Index / retrieval path | **VERIFIED** | Index assertion + within-query ranking tests |
| 9 | LLM Gateway contract | **VERIFIED** | 39 tests; provider SDKs confined to one module |
| 10 | Frontend typecheck | **VERIFIED** | `tsc --noEmit` exit 0 |
| 11 | Frontend production build | **VERIFIED** | `next build` exit 0, 11 routes incl. `/phase2` |
| 12 | Live LLM provider | **BLOCKED — NOT AVAILABLE** | `.env` holds placeholders, not real keys |
| 13 | Secrets hygiene | **VERIFIED** | `.env` untracked + ignored; 0 live secrets in tracked files |
| 14 | Donor module integrity | **VERIFIED** | `modules/` 1065 tracked files, 0 modified, 0 untracked |

---

## 2. Test suite — clean run

```
docker exec creator-api pytest -q
```

**286 passed, 0 skipped, 0 failed** (52.5s).

There are **no skipped tests**. Two security tests previously skipped themselves and
were rewritten during this pass — see §5, *Silent skips removed*.

| File | Tests |
|------|-------|
| `unit/test_llm_gateway.py` | 39 |
| `security/test_rls_exhaustive_isolation.py` | 31 |
| `unit/test_embedding_service.py` | 28 |
| `unit/test_memory_core.py` | 27 |
| `unit/test_voice.py` | 25 |
| `security/test_failsafe.py` | 20 |
| `integration/test_phase2_rls_isolation.py` | 15 |
| `unit/test_evaluation_framework.py` | 13 |
| `integration/test_vector_provenance.py` | 11 |
| `security/test_connection_identity.py` | 8 |
| `security/test_concurrency_isolation.py` | 3 |
| (remaining: RLS policy/simple, cross-user isolation) | remainder |

---

## 3. RLS session identity — the real design

`app.core.db.rls_scoped_session` pins **one physical connection per request**:

1. Open a session, read `db.connection`, and hold that exact connection.
2. `SELECT set_config('request.jwt.claims', :claims, false)` — **parameterised**, `false` = session-scoped (survives commits).
3. Clear the claims again *before* the connection returns to the pool.

The old bug was `SET LOCAL`, which Postgres discards at `COMMIT`, leaving every
statement after the first write running with **no RLS identity**. That is why
`test_identity_survives_commit` exists.

Verified properties:

- Identity survives commits and rollbacks.
- A → B → A sequencing on one connection yields the correct identity each time.
- A long-lived uvicorn process cannot leak identity to a later request.
- Exceptions still clear claims.
- Correctness holds on a **single-connection pool**, where a leaked identity
  would be maximally damaging.

### Negative control (the tests are not vacuous)

Removing the claims-clearing step from production code made exactly the right two
tests fail:

- `test_identity_cleared_on_the_very_connection_that_carried_it`
- `test_concurrent_requests_over_http_api`

The change was then reverted. This proves the tests detect the real defect rather
than merely passing.

> Note: the intentionally polluted process pool required an API restart to clear.
> That is itself the finding — a leaked identity survives until process restart.

---

## 4. Exhaustive isolation coverage

**Actual schema reality:** 13 user-owned tables, all with RLS and policies.
`schema_migrations` is operational bookkeeping and intentionally has **no** RLS.
An `experiments` table referenced in the original task list **does not exist** in
this schema; nothing was fabricated to match it.

`test_rls_exhaustive_isolation.py` covers **every** user-owned table with:
A-owned CRUD, B-isolation, forged ownership, and API-path checks.

A failure to seed a table now **fails the suite** rather than skipping it —
previously such a table would silently lose its entire isolation proof while the
run still reported green.

---

## 5. Silent skips removed

Three self-suppressing defects were found and fixed. Each one could have hidden a
real failure:

| Test | Old behaviour | Risk | Fix |
|------|---------------|------|-----|
| `test_user_b_cannot_insert_chunk_owned_by_user_a` | `pytest.skip` when user B had no visible asset | `WITH CHECK` forgery assertion never ran | Seed a B-owned asset so the only violation is the forged `user_id` |
| same test | asserted only `pytest.raises(Exception)` with a `"[0.0]"` literal | `chunks.embedding` is `vector(768)`, so `"[0.0]"` raised `expected 768 dimensions, not 1` — it passed for the **wrong reason** and never reached RLS | Use a valid 768-d vector and assert the error contains `row-level security` |
| 3 provenance tests | `pytest.skip("no embedded chunks present")` | a wiped vector table silently disabled provenance checking — the exact failure §9 exists to catch | Self-seed a chunk through the **real** ingest path (RLS session + live E5) |
| `test_rls_exhaustive_isolation` insert guard | `pytest.skip("...produced no row")` | whole-table isolation silently unverified | `pytest.fail` |

Result: **0 skipped tests**.

---

## 6. Vector provenance — §9 / §10

Live E5 configuration, read from the implementation:

| Property | Value |
|----------|-------|
| Model | `intfloat/multilingual-e5-base` |
| Revision | `d128750597153bb5987e10b1c3493a34e5a4502a` |
| Dimension | 768 |
| Query prefix | `"query: "` |
| Document prefix | `"passage: "` |
| Normalisation | L2 |
| Similarity | cosine |
| dtype / max seq / batch / device | `float32` / 512 / 16 / `cpu` |
| Version string | `e5-base-v1` |

Live data: **42 chunks**, all 768-d, all a single model.

- 25-vector sample vs freshly computed E5 output: max absolute deviation **`0.0`**, min cosine **`0.99999988`**.
- Stored L2 norms within `0.99999994 … 1.00000012`.
- Anti-padding similarities — zero-pad `0.703`, repeat/cycle `0.488`, genuine 384-d MiniLM padded to 768 `-0.043`.
- Index: `ivfflat` on the live 768-d column; no index remains on any 384-d column.
- Retrieval: within-query ranking verified — each query's own chunk ranks first, with the runner-up strictly worse.

### Negative control

A real chunk's embedding was overwritten with a zero-padded 384→768 "conversion"
(keeping 768 dimensions) and the suite was re-run:

```
AssertionError: chunk ae93a55d-… is suspiciously close to a 'zero_pad_of_truncation'
conversion (cosine 1.000000); it may not be genuine E5 output
```

3 tests failed as intended. Data was then restored and the suite returned green
(42 chunks, 1 distinct dimension, 1 distinct model).

This exposed a weakness that was then fixed: the anti-padding test originally
inspected only the first sampled row and **missed** the corrupted one. It now
checks every sampled chunk.

---

## 7. Stale `384` references — classified

| Location | Classification | Action |
|----------|----------------|--------|
| `apps/api/app/**` | Docstring only, describing the migration | None needed |
| `infra/db/migrations/002_core_schema.sql` | **Immutable history** — 003/004 depend on the 384 column existing | Deliberately unchanged |
| Migrations 003 / 004 | Comments describing the expand/contract steps | Correct as-is |
| `.env` / `.env.example` | None | Clean |
| `docs/eval/**`, `scripts/**` | **Benchmark artifacts** — required evidence, must not be rewritten | Preserved |
| `docs/decisions/002-embedding-model.md` | ADR history, already carries a "no production configuration was modified" note | Preserved |
| `docs/INTEGRATION_STATUS.md`, `PHASE_2_READINESS.md`, `FINAL_RECONCILIATION_REPORT.md` | **Stale "current state" claims** (e5-small, `vector(384)`, "awaiting approval") | Reconciled — see §10 |

Removed models and normalisation: `BAAI/bge-m3` **0** production references,
`Tamil-ai/tamil-embed-base` **0**, `indic_transliteration` **0**, `fastembed` **0**.

---

## 8. LLM Gateway — §11

- **39 Gateway tests pass**, covering routing, fallback, timeouts, retries,
  determinism, and cost accounting.
- Provider SDKs (`google.genai`, `anthropic`, `groq`) are imported in **exactly
  one production module**: `app/llm/providers/live.py`. No other module imports
  them, so no code path can bypass the Gateway.
- `openai` is not installed and is not referenced.
- Configured default: `LLM_PROVIDER=mock`, deterministic (`mock-deterministic`).

---

## 9. Live provider — **BLOCKED / NOT AVAILABLE** — §13

Assessed **without printing any credential value** (length and pattern class only):

| Variable | Length | Assessment |
|----------|--------|------------|
| `GEMINI_API_KEY` | 24 | **placeholder** |
| `ANTHROPIC_API_KEY` | 27 | **placeholder** |
| `GROQ_API_KEY` | 22 | **placeholder** |
| `SUPABASE_JWT_SECRET` | 20 | **placeholder** |

These are present in `.env` but hold **placeholder values, not real
credentials**. No live smoke test was attempted, and no credential was invented.
This **corrects** an earlier claim that the keys were simply "missing" — the
accurate statement is *present but not usable*.

This does not weaken the rest of the verification: the Gateway contract and all
provider adapter boundaries are covered by tests against the deterministic mock.
Only end-to-end calls to Gemini/Anthropic/Groq remain unverified, pending real
credentials.

---

## 10. Documentation reconciliation

Updated to reflect verified reality without erasing history:

- `docs/INTEGRATION_STATUS.md` — superseded banner; embedding decision marked
  **RESOLVED**; the "awaiting explicit user approval" blocker struck through; LLM
  key blocker restated as *placeholder credentials*; Phase 2 approval marked done.
- `docs/PHASE_2_READINESS.md` — superseded banner; e5-small 384-d → e5-base 768-d.
- `docs/FINAL_RECONCILIATION_REPORT.md` — superseded banner; same dimension fix.
- `docs/PHASE_2_FINAL_REPORT.md` — left intact; its `384 → 768` narrative is
  correct and is the record of the migration.
- Benchmark reports and ADRs left intact as historical evidence.

---

## 11. Frontend — §15 / §16

The toolchain **is** defined (`typescript ^5.7.0`, `next ^15.1.0`, plus
`typecheck` and `build` scripts), so it was installed and run per the repository's
normal workflow rather than reported as unavailable.

Two environment problems were fixed first: `apps/web/node_modules` and
`apps/web/.next` were **root-owned** artifacts of an earlier container build,
causing `EACCES`. Both were reclaimed.

- `npm run typecheck` → **exit 0, clean.**
- `npm run build` → **exit 0**, 11 static routes including `/phase2` (2.34 kB),
  shared JS 103 kB.
- `*.tsbuildinfo` added to `.gitignore`; `node_modules/` and `.next/` were
  already ignored.
- `package-lock.json` is now generated and committed for reproducibility.

**One real defect fixed:** `app/today/page.tsx` used `<Link>` without importing
it — 2 × `TS2304`, which broke `tsc`. This is a pre-existing Phase 1 file, not a
Phase 2 file. Fixed with `import Link from "next/link"`. No Phase 2 file had any
type error.

`npm run lint` is **not configured** — there is no committed ESLint config and
`next lint` is deprecated and interactive (it prompts for setup). Lint is not one
of the required gates, so no interactive config was generated.

---

## 12. Secrets & configuration — §18

- `.env` is **not tracked** and **is gitignored**.
- `.env.example` contains only placeholder values.
- Pattern scan for live credentials (`sk-ant-*`, `AIza*`, `gsk_*`, JWTs) across
  all tracked files: **0 matches**.

## 13. Donor integrity — §17

`modules/` is **untouched**: 1065 tracked files, **0 modified**, **0 deleted**,
**0 untracked**. It remains tracked (not gitignored).

---

## 14. Outstanding

1. **Live LLM provider verification** — blocked on real credentials (§9). The only
   item preventing an unconditional pass.
2. **`npm run lint`** — no ESLint config; would require choosing a lint setup.
3. **Phase 3 has not been started**, as instructed. No Studio, Producer, Growth,
   Coach, Analytics Copilot, transliteration, or further embedding benchmarking
   work was performed.

## 15. Reproducing this report

```bash
~/ops/ensure_stack.sh                     # start Postgres + API
docker exec creator-api pytest -q         # 286 passed

cd apps/web
npm install
npm run typecheck                         # exit 0
npm run build                             # exit 0
```
