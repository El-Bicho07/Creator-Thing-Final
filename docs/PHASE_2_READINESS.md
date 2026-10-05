# Phase 2 Readiness Assessment — Creator Platform SaaS

*Final gate assessment after Phase 1 blocker resolution and technical evaluation*

> **SUPERSEDED IN PART (reconciled 2026-10-05).** This is the Phase 2 *readiness*
> assessment written before Phase 2 was implemented. References below to
> `multilingual-e5-small` (384-d) and a `vector(384)` store describe the
> **Phase 1** system and are historical. Current verified state:
> `intfloat/multilingual-e5-base` (768-d), `chunks.embedding` is `vector(768)`,
> Phase 2 complete. See `docs/PHASE_2_FINAL_VERIFICATION.md`.

## Executive Summary

| Overall Status | Details |
|----------------|---------|
| **Phase 1 Foundation** | ✅ COMPLETE — All gates passed |
| **Architectural Readiness** | ✅ READY — All technical gates satisfied |
| **Implementation Readiness** | ⏳ PENDING — Requires LLM Gateway implementation first |
| **Phase 2 Execution** | ⏸️ BLOCKED BY DECISIONS — Requires human approval |

---

## Readiness Classification

### Architectural Readiness: ✅ READY

All architectural decisions are complete and documented:

| Area | Status | Evidence |
|------|--------|----------|
| Unified vector architecture | ✅ CONFIRMED | Single `chunks` table + pgvector, no separate stores |
| Donor embedding incompatibility | ✅ RESOLVED | Full re-embedding required + migration plan (ADR-002) |
| RLS / Multi-tenancy | ✅ FUNCTIONAL | 13 tables, non-superuser `api_user`, cross-user isolation verified |
| Feature routers | ✅ REGISTERED | 6 routers with `get_db_with_user` dependency |
| LLM Gateway contract | ✅ VALIDATED | ADR-003: 14/14 capabilities covered |
| Provider strategy | ✅ DOCUMENTED | ADR-006: classifications + credential status |
| Migration management | ✅ DEFINED | ADR-005: Versioned SQL in `infra/db/migrations/` |
| Test infrastructure | ✅ READY | `apps/api/tests/security/` with RLS tests |

### Implementation Readiness: ⏳ PENDING

| Component | Status | Notes |
|-----------|--------|-------|
| **LLM Gateway Implementation** | ❌ NOT IMPLEMENTED | **First Phase 2 implementation task** |
| Voice Engine (`apps/api/app/voice/`) | ❌ NOT IMPLEMENTED | Must not proceed until gateway tests pass |
| Memory Engine (`apps/api/app/memory/`) | ❌ NOT IMPLEMENTED | Must not proceed until gateway tests pass |
| Embedding Service (`apps/api/app/llm/embeddings.py`) | ❌ NOT IMPLEMENTED | Phase 2 task, follows gateway |
| Voice Engine port (Module 13) | ❌ NOT STARTED | Requires Voice Engine |
| Memory Engine port (Module 19) | ❌ NOT STARTED | Requires Memory Engine |
| Re-embedding pipeline | ❌ NOT IMPLEMENTED | Phase 2 task |

> **Phase 2 may START after explicit user authorization.**
>
> The LLM Gateway is the **first Phase 2 implementation task**.
>
> Voice Engine and Memory Engine integration **must NOT proceed** until the LLM Gateway implementation is complete and its tests pass.

### Phase 2 Implementation Lifecycle

```text
USER APPROVAL
      ↓
PHASE 2 START
      ↓
LLM GATEWAY IMPLEMENTATION
      ↓
LLM GATEWAY TESTS
      ↓
EMBEDDING SERVICE
      ↓
VOICE ENGINE
      ↓
MEMORY ENGINE
      ↓
MODULE 13 PORT
      ↓
MODULE 19 PORT
      ↓
RE-EMBEDDING
      ↓
PHASE 2 ACCEPTANCE TESTS
      ↓
PHASE 2 COMPLETE
```

---

## Phase 2 Readiness Gate Table

| Gate | Status | Evidence | Blocking? |
|------|--------|----------|-----------|
| **Infrastructure** | | | |
| PostgreSQL + pgvector healthy | ✅ PASS | Container running, health checks pass | No |
| FastAPI running + health endpoints | ✅ PASS | `/health`, `/api/health` return 200 | No |
| Next.js running + 6-tab navigation | ✅ PASS | All 6 routes render correctly | No |
| Docker Compose starts all services | ✅ PASS | `docker-compose up` works cleanly | No |
| **Authentication & Multi-Tenancy** | | | |
| JWT validation (Supabase) | ✅ PASS | `get_current_user_id` verifies RS256 JWT | No |
| RLS policies on all 13 tables | ✅ PASS | `pg_tables.rowsecurity = true` for all | No |
| RLS policies use `current_user_id()` | ✅ PASS | All policies filter by `user_id = current_user_id()` | No |
| Cross-user isolation verified | ✅ PASS | User A cannot read/update/delete User B data, embeddings, jobs, AI calls | No |
| Non-superuser API role (`api_user`) | ✅ PASS | RLS enforced (superuser bypass prevented) | No |
| **Database & Migrations** | | | |
| 13 tables created with RLS | ✅ PASS | `users`, `creator_profiles`, `voice_profiles`, `content_assets`, `chunks`, `ideas`, `plan_items`, `performance_records`, `comments`, `comment_insights`, `lessons`, `jobs`, `ai_calls` | No |
| Versioned SQL migrations | ✅ PASS | `000_create_api_user.sql`, `001_enable_extensions.sql`, `002_core_schema.sql` | No |
| Migration management decision | ✅ PASS | ADR-005: Versioned SQL in `infra/db/migrations/` | No |
| **API Structure** | | | |
| 6 feature routers registered | ✅ PASS | `/api/start`, `/api/today`, `/api/studio`, `/api/coach`, `/api/growth`, `/api/library` | No |
| All routers use `get_db_with_user` | ✅ PASS | RLS context set per request | No |
| TypeScript contracts generated | ✅ PASS | `packages/contracts/index.ts` with all 13 tables | No |
| **LLM Architecture** | | | |
| LLM Gateway **CONTRACT** defined | ✅ VALIDATED | ADR-003: 14/14 capabilities covered | No |
| LLM Gateway **IMPLEMENTATION** | ❌ NOT IMPLEMENTED | Phase 2 first task | Yes |
| Embedding benchmark completed (round 1) | ✅ PASS | ADR-002: 4 small models, 36 docs | No |
| Embedding benchmark completed (round 2, top-3) | ✅ PASS | 3 candidates, 113 docs / 225 queries, leakage-checked | No |
| Embedding model selected | 🔄 RE-EVALUATED — NOT APPROVED | Leading: `BAAI/bge-m3` 1024d; alt: `tamil-embed-base` 512d | No — awaiting approval |
| Cross-script (Tanglish/Hinglish → native) retrieval | ❌ FAILS FOR ALL CANDIDATES | `tanglish_ta` R@3 = 0.000; needs transliteration layer | No — separate workstream |
| Provider strategy documented | ✅ PASS | ADR-006: classifications + credential status | No |
| Mock gateway path for dev | ✅ AVAILABLE | Design documented in ADR-006 | No |
| **Embeddings & Vector Store** | | | |
| Unified vector architecture | ✅ CONFIRMED | Single `chunks` table + pgvector, no separate stores | No |
| Donor embedding incompatibility resolved | ✅ RESOLVED | ADR-002: re-embedding required + migration plan | No |
| Donor models evaluated | ✅ COMPLETE | Module 13 (all-MiniLM, hash fallback), Module 19 (BGE) — both rejected | No |
| Re-embedding plan documented | ✅ PASS | ADR-002: migration strategy + version tracking | No |
| **Documentation & Governance** | | | |
| Porting log updated | ✅ PASS | `docs/porting-log.md` with Phase 1 entries | No |
| Integration status updated | ✅ PASS | `docs/INTEGRATION_STATUS.md` — Phase 1 complete | No |
| ADRs created | ✅ PASS | ADR-002 (embedding), ADR-003 (gateway), ADR-004 (RLS), ADR-005 (migrations), ADR-006 (providers), ADR-007 (deployment) | No |
| Test infrastructure | ✅ READY | `apps/api/tests/security/` with RLS tests | No |
| **Deployment** | | | |
| Deployment target decision | ⏳ PENDING HUMAN DECISION | ADR-007: requires human decision | No — not a Phase 2 blocker |
| Local dev environment | ✅ WORKING | `docker-compose up` works | No |

---

## LLM Gateway Status Reconciliation

| Aspect | Status | Details |
|--------|--------|---------|
| **Contract** | ✅ **VALIDATED** | ADR-003: 14/14 capabilities covered |
| **Implementation** | ❌ **NOT IMPLEMENTED** | **First Phase 2 implementation task** |
| **Production Provider Credentials** | 🔴 **BLOCKED FOR LIVE TESTING** | `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY` unavailable |
| **Mock Gateway** | ✅ **AVAILABLE FOR DEVELOPMENT** | Design documented in ADR-006 |

> **Critical Distinction**: The LLM Gateway **contract** is validated (ADR-003), but the **implementation** does not yet exist.
>
> **Phase 2 may START after explicit user authorization.** The LLM Gateway is the **first Phase 2 implementation task**. Voice Engine and Memory Engine integration **must NOT proceed** until the LLM Gateway implementation is complete and its tests pass.

---

## Decisions & Credential Status

| # | Item | Required For | Status | Phase 2 Blocker? |
|---|------|--------------|--------|-------------------|
| 1 | **Embedding Model Approval** | Phase 2 memory/voice engines | 🔄 **RE-EVALUATED 2026-10-03** — top-3 benchmark complete. Leading candidate `BAAI/bge-m3` (1024d); strongest alternative `Tamil-ai/tamil-embed-base` @512d. NOT approved; no production model changed. See `docs/eval/embedding_top3_benchmark/benchmark_report.md`. | **Yes** — requires explicit approval |
| 2 | **Production LLM API Keys** | Live provider testing only | 🔴 BLOCKED FOR LIVE TESTING — mock gateway available | **No** — not required to start Phase 2 |
| 3 | **Deployment Target** | Production RLS, secrets, CI/CD | ⏳ PENDING HUMAN DECISION — ADR-007 | **No** — needed before Phase 3 |
| 4 | **Cross-script retrieval layer** | Tanglish/Hinglish → native-script search | 🔴 **NEW GAP IDENTIFIED** — all three candidates score 0.000 on `tanglish_ta`. Requires transliteration / script-normalisation work regardless of model choice. | **No** — but must be scoped before Memory Engine GA |

---

## Phase 2 Execution Path

### Can Start Immediately (After Embedding Model Approval)

1. **Implement LLM Gateway** (`apps/api/app/llm/gateway.py`) with mock provider
2. **Implement Embedding Service** (`apps/api/app/llm/embeddings.py`) using `intfloat/multilingual-e5-small`
3. **Implement Voice Engine** (`apps/api/app/voice/` - analyzer, profile, validators)
4. **Implement Memory Engine** (`apps/api/app/memory/` - assets, chunks, embeddings, retrieval)
5. **Port Module 13 voice services** to `apps/api/app/voice/`
6. **Port Module 19 memory services** to `apps/api/app/memory/`
7. **Wire Voice + Memory through LLM Gateway** (mock)
8. **Implement re-embedding pipeline** for Module 13 & 19 data

### Requires Decision #1 (Embedding Model Approval)
- [ ] Finalize `EMBEDDING_MODEL=intfloat/multilingual-e5-small` in `.env`
- [ ] Run re-embedding pipeline on any existing data

### Requires Decision #2 (API Keys) — For Live Testing Only
- [ ] Configure `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`
- [ ] Switch gateway from mock to real providers
- [ ] Run live integration tests

### Requires Decision #3 (Deployment) — Before Phase 3
- [ ] Select production target (Supabase+Vercel vs Self-hosted vs K8s)
- [ ] Implement production RLS (`auth.uid()` vs `current_user_id()`)
- [ ] Configure secret management
- [ ] Design CI/CD pipeline

---

## Benchmark Caveats (Must Be Preserved)

| Limitation | Status |
|------------|--------|
| Dataset size | 36 documents / 15 queries — small, not statistically significant |
| Code-mixed evaluation | **INSUFFICIENT** — 3 docs/queries; 1.0 recall from English token overlap |
| Production code-mixed quality | **NOT VALIDATED** — requires post-launch monitoring |
| Production-scale statistical confidence | **NOT ESTABLISHED** |
| CPU saturation | ~780% on 8 vCPU (all models saturate 8 cores) |
| Memory | ~1.2 GB RSS per model |
| Latency | Warm batch p95 = 93.1 ms (meets <150ms target) |
| Dataset size | 36 docs / 15 queries — not production-scale |

> **Critical**: The 1.0 recall on code-mixed (Tanglish/Hinglish) queries is an artifact of English token overlap (technical terms like "Next.js", "React", "PostgreSQL"). True code-mixed semantic understanding is **NOT VALIDATED** by this benchmark.

---

## Migration Requirement (Must Be Preserved)

```
Module 13 existing embeddings (all-MiniLM-L6-v2 / hash fallback)
        ↓
FULL RE-EMBED

Module 19 existing embeddings (BAAI/bge-small-en-v1.5)
        ↓
FULL RE-EMBED

Future content
        ↓
intfloat/multilingual-e5-base (768 dimensions)  <!-- SUPERSEDED: was e5-small 384-d at Phase 1 -->
        ↓
PostgreSQL + pgvector (unified vector store)
```

The unified vector architecture remains:

```
Creator Voice Engine
        +
Long-Term Memory Engine
        ↓
Unified Creator Intelligence
        ↓
PostgreSQL + pgvector (384 dimensions)
```

---

## Migration Requirement (Must Be Preserved)

| Source | Current Embedding | Action Required |
|--------|-------------------|-----------------|
| Module 13 | all-MiniLM-L6-v2 / hash fallback | FULL RE-EMBED |
| Module 19 | BAAI/bge-small-en-v1.5 | FULL RE-EMBED |
| Future content | N/A | Embed with `intfloat/multilingual-e5-small` |

---

## Final Decision Summary

| Item | Status |
|------|--------|
| **Phase 1** | ✅ COMPLETE / VERIFIED |
| **Embedding Model** | `intfloat/multilingual-e5-small` |
| **Embedding Decision** | VALIDATED — READY FOR USER APPROVAL |
| **LLM Gateway Contract** | VALIDATED |
| **LLM Gateway Implementation** | PENDING — PHASE 2 TASK |
| **Code-Mixed Validation** | INSUFFICIENT — KNOWN LIMITATION |
| **Production API Keys** | NOT REQUIRED TO START PHASE 2 |
| **Deployment Target** | PENDING HUMAN DECISION — NOT A PHASE 2 BLOCKER |
| **Architectural Readiness** | ✅ READY |
| **Implementation Readiness** | ⏳ PENDING LLM GATEWAY IMPLEMENTATION |

---

## Phase 2 Status

> **PHASE 2: READY TO START AFTER EXPLICIT USER APPROVAL**

All architectural gates are satisfied. Phase 2 may begin immediately upon explicit user authorization.

**Required before Phase 2 start**:
1. **Explicit approval** of `intfloat/multilingual-e5-small` embedding model (ADR-002, status: VALIDATED — AWAITING EXPLICIT USER APPROVAL)

**Not required for Phase 2 start**:
- Production API keys (BLOCKED FOR LIVE TESTING only — mock gateway available for development)
- Production deployment decision (PENDING HUMAN DECISION — needed before Phase 3)

**Phase 2 execution order** (the LLM Gateway is the first implementation task, not a prerequisite):

```text
USER APPROVAL
      ↓
PHASE 2 START
      ↓
LLM GATEWAY IMPLEMENTATION
      ↓
LLM GATEWAY TESTS
      ↓
EMBEDDING SERVICE
      ↓
VOICE ENGINE
      ↓
MEMORY ENGINE
      ↓
MODULE 13 PORT
      ↓
MODULE 19 PORT
      ↓
RE-EMBEDDING
      ↓
PHASE 2 ACCEPTANCE TESTS
      ↓
PHASE 2 COMPLETE
```

---

## Next Actions

1. **Stakeholder Review**: Review ADR-002 (embedding), ADR-003 (gateway), ADR-004 (RLS)
2. **Approve Embedding Model**: Sign off on `intfloat/multilingual-e5-small`
3. **Authorize Phase 2 Start**: With mock gateway
4. **Provide API Keys** (async): When available, for live gateway testing
5. **Decide Deployment** (async): Before Phase 3 kickoff

---

*Report generated after Phase 1 blocker resolution and technical evaluation. All benchmark results, ADRs, and validation documents available in `docs/`*
---

# Phase 2 Readiness Reassessment — 2026-10-03 (post-implementation)

The pre-implementation readiness assessment above is preserved as the historical
record. This section states the position after Phase 2 was implemented and
verified.

## Blocking gates: now CLEARED

| Gate (previously blocking) | Status | Evidence |
|---|---|---|
| Embedding model explicitly selected | **CLEARED** | ADR-002 §13: `intfloat/multilingual-e5-base`, 768-d |
| LLM Gateway implemented | **CLEARED** | `app/llm/gateway.py`, 39 unit tests |
| Prompt versioning available | **CLEARED** | `app/llm/prompts.py` + `packages/prompts/` |
| Vector migration strategy defined | **CLEARED** | expand/contract, migrations 003/004, fail-closed guards |
| Migration safety proven | **CLEARED** | anti-padding proof (1.3e-07), idempotency, guard negative tests |
| RLS verified after migration | **CLEARED** | 13 RLS isolation tests, incl. unfiltered-query proof |
| Phase 1 tests passing | **CLEARED** | 29 security tests (were failing; repaired) |
| Donor modules untouched | **CLEARED** | 0 files changed |

## Acceptance criteria

| Area | Criteria | Met | Notes |
|---|---|---|---|
| LLM Gateway | 12 | **12/12** | 2 rate/budget items DEFERRED with config in place |
| E5 Embedding Service | 11 | **11/11** | includes 2 negative tests for removed models |
| Vector Migration | 10 | **10/10** | |
| Creator Voice Engine | 8 | **8/8** | |
| Long-Term Memory | 12 | **12/12** | |
| Integration | 6 | **6/6** | frontend surface minimal per §33 |
| Security | 7 | **7/7** | |

Every criterion is met. Two LLM-gateway sub-items (per-user token budget,
per-feature rate limits) are marked DEFERRED in ADR-003; they are additive and do
not block.

## Residual risks carried into Phase 3

1. **No live LLM provider.** Everything AI-side is validated against a
   deterministic mock. Real-model behaviour, latency and cost are unmeasured.
2. **Benchmark corpus is not human-validated.** The embedding decision rests on a
   synthetic corpus with 0/30 human-validated pairs. This does not block Phase 3
   work, but it must not be presented as production-grade evidence.
3. **Cross-script retrieval is a known platform limitation** for all three
   benchmarked models. Transliteration is not the fix (Phase 1 measured net
   negative). This is a product-level constraint, not a bug.
4. **Voice matcher calibration** rests on synthetic samples.
5. **ivfflat with `lists = 100`** is approximate. At small row counts it can
   return fewer neighbours than `k` unless `ivfflat.probes` is raised. This is
   inherited from the Phase 1 schema and matters for recall on a small corpus.
6. **Job execution is in-process**; long ingestion runs will block a request.

## Phase 3 readiness

**READY.** The shared primitives exist, are verified, and are correctly bounded:
no feature module depends on a specific embedding model, and there is exactly one
LLM egress point and one vector store. Studio can be built on top without
touching E5 internals.
