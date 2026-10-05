# Phase 3 Final Report — STUDIO

**Date:** 2026-10-05
**Baseline:** Phase 2 verified at `7e02c87` (286 tests, 0 skipped).
**Verdict:** Phase 3 is complete and verified. Studio is one unified creator
workspace built on shared platform services. `modules/` is unchanged.

**Classification key:** IMPLEMENTED (built) · VERIFIED (executed and proven) ·
DEFERRED (intentionally later) · PENDING (built, awaiting external input) ·
BLOCKED (cannot proceed without an external dependency).

---

## 1. Executive summary

Studio consolidates donor capabilities from Modules 01, 02, 03, 05, 07, 08, 09 and
18 into **one** creator workspace, rather than eight separate applications. The
creator sees a session, a brief, capabilities, critique and refinement — not module
names.

The architectural commitment from the brief held: Studio owns orchestration,
sessions, capability dispatch and version history, and **reuses** every Phase 2
service. There is no second LLM client, no second vector store, no second memory
system, no second voice system, no second auth path and no second asset store.

| Measure | Result |
|---|---|
| Backend tests | **588 passed, 0 skipped, 0 failed** |
| Studio-specific tests | 247 |
| AI evaluation | 28 scenarios, 28 passed |
| Frontend typecheck | exit 0 |
| Frontend production build | exit 0, 11 routes |
| `modules/` | 1065 tracked files, **0 modified** |
| New user-owned tables | 2 (both RLS-protected) |
| Live LLM provider | **BLOCKED** — placeholder credentials |

---

## 2. Studio architecture

**IMPLEMENTED · VERIFIED**

```text
Studio
  ├── StudioSession          server-persisted, survives refresh
  ├── StudioOrchestrator     the only orchestration authority
  ├── ContextAssembler       → LongTermMemoryEngine + CreatorVoiceEngine
  ├── CapabilityRegistry     8 capabilities, Pydantic contracts
  ├── Generation             6 creative capabilities
  ├── Critique               structured review, never edits
  └── Refinement             appends a version, never overwrites
```

Dependency direction — verified by tests, not by assertion:

```text
Studio ──→ LongTermMemoryEngine ──→ EmbeddingService ──→ E5-base
Studio ──→ CreatorVoiceEngine
Studio ──→ LLMGateway          (only via registry.call_gateway)
Studio ──→ PostgreSQL + RLS
```

| Property | Result |
|---|---|
| Provider SDK imports under `app/studio/` | **0** |
| `sentence_transformers` / E5 / pgvector imports under `app/studio/` | **0** |
| Direct `chunks` SQL under `app/studio/` | **0** (found and removed during verification) |
| `CREATE TABLE` under `app/studio/` | **0** |

Full design: `docs/STUDIO_ARCHITECTURE.md`.

---

## 3. Donor capability mapping

**IMPLEMENTED · VERIFIED** — full table in `docs/studio-capability-map.md`.

The audit read the donor code rather than assuming it. Findings that changed the
plan:

| Finding | Consequence |
|---|---|
| Module 09's entire `lib/` tree is **absent** from the donor (gitignored there). Only the UI and test contracts survive. | Classified **REBUILD**, not PORT. The CTA logic was written from its contract. |
| Module 12's local fallback returns **hardcoded fabricated statistics with fake journal citations** (`researchService.ts:246`). | Deliberately **not ported**. Parked the module. |
| Module 18-Guruvelah is the strongest donor: staged orchestrator, validators, platform/timing/format/goal/lifecycle tables, injection defence, prompt versioning, `FakeAIProvider` harness. | Adapted the domain rules and the reliability patterns; **rejected** its fixed 6-stage pipeline and its provider client. |
| Hardcoded model names across donors (`gemini-3.x`, `claude-opus-5`, `claude-3-5-sonnet`) — several do not resolve against real APIs. | Studio names **no** model. Routing belongs to the Gateway. |
| No donor module uses embeddings at all. | Confirms Phase 2 ownership; Studio reaches embeddings only via the Memory Engine. |
| Only 18-Guruvelah has auth + DB; the rest are stateless or `localStorage`-only. | Rejected. Platform owns identity and persistence. |
| Module 05 parses JSON from plain text with a regex (`agent.py:136`). | Not ported. Studio uses the Gateway's structured-output path with validation and bounded repair. |

| Classification | Capabilities |
|---|---|
| PORT | hygiene scrubber, schema clamping, hook slot realignment, caption heuristic ranker, output coercion, format taxonomy, fake-provider test pattern |
| ADAPT | stage orchestration, stage→prompt dispatch, platform/timing/goal/lifecycle rules, validators + bounded retry, injection boundary, prompt provenance, and the content capabilities from Modules 01/02/03/05/07/08 |
| REBUILD | CTA kits + freshness steering (donor implementation lost) |
| NEW | `studio/` package, `ContextAssembler`, `CapabilityRegistry`, sessions, Studio API, Studio UI, evaluation scenarios |
| PARK | model failover & provider fallback (Gateway owns), export to Markdown/CSV, `localStorage` state, donor auth/service-role DB, trend ingestion, research assistant, Module 22 |

---

## 4. Studio session architecture

**IMPLEMENTED · VERIFIED**

```text
studio_sessions  1 ──→ * studio_generations * ──→ 1 content_assets
                                                       │
                                                       └──→ * chunks (FK cascade only)
```

| Table | Purpose | Status |
|---|---|---|
| `studio_sessions` | Workspace: brief, workflow step, idea link | new, RLS |
| `studio_generations` | Version history, lineage, provenance, critique | new, RLS |
| `content_assets` | Generated bodies | **reused** |
| `chunks` | Embeddings | **reused**, never written by Studio |

Deliberately **not** added: embeddings, memory, voice, job or prompt tables. Phase 2
owns all of those.

Migration `006_studio_sessions.sql` is additive, idempotent via `schema_migrations`,
applies through the existing `apply.sh`, and grants `api_user` automatically.

---

## 5. Context assembly

**IMPLEMENTED · VERIFIED**

`ContextAssembler` is the only component that reads creator context, and it reads it
only through Phase 2 services. Verified end-to-end in
`test_full_studio_lifecycle`, which asserts that real memory text and real voice
rules reach the prompt.

| Block | Source | Bound | Injection-hardened |
|---|---|---|---|
| `creator_request` | brief / capability input | 8 000 | yes |
| `retrieved_memory` | `MemoryEngine.retrieve_for_prompt()` | 3 000 | yes |
| `creator_voice` | `CreatorEngine.get_profile()` | 1 200 | yes |
| `prior_work` | recent Studio output | 2 000 | yes |

**Degradation is reported, not hidden.** A creator with no memory or voice still
generates; the response carries `notes: ['no_relevant_memory', 'no_voice_profile']`
so the creator can see why context was thin.

---

## 6. Memory integration

**IMPLEMENTED · VERIFIED**

Studio calls `MemoryEngine.retrieve_for_prompt()`. It issues no SQL against
`chunks` and imports no embedding model. A test asserts that generating content
leaves the vector store untouched.

## 7. Voice integration

**IMPLEMENTED · VERIFIED**

Studio calls `VoiceEngine.get_profile()`. Verified that stored forbidden words and
formatting rules reach the prompt block.

## 8. LLM Gateway integration

**IMPLEMENTED · VERIFIED**

`app/studio/registry.py::call_gateway` is the only call site. Zero provider SDK
imports exist anywhere under `app/studio/`. Every call carries `feature="studio"`,
`purpose`, prompt name/version and capability, and is recorded in `ai_calls` —
asserted by test.

---

## 9. Generation flow

**IMPLEMENTED · VERIFIED**

Capabilities: `idea`, `hook`, `script`, `caption`, `repurpose`, `cta`, `thumbnail`,
plus `refine`. Each validates input with Pydantic **before** any LLM cost, and
coerces output so the contract holds even on a bad generation.

Two donor reliability patterns were kept because they are the difference between a
contract and a hope:

- **Hook realignment** (Module 03): asking for N styles always returns N hooks.
- **Structural validation** (Module 18): a script without HOOK-first/CTA-last
  reports a warning rather than passing silently.

**Output persisted** and **provenance recorded** are both *gating* metrics in the
evaluation, so "it got persisted" is measured, not assumed.

## 10. Critique flow

**IMPLEMENTED · VERIFIED**

| Property | Result |
|---|---|
| Structured feedback | dimension, severity, finding, **suggestion** |
| Actionable only | A finding without a concrete fix is dropped and warned about |
| Never edits | Test asserts stored text is byte-identical after a critique |
| Never implies approval | Empty critique returns 409, not a fake "looks good" |
| Advances the workflow | `review → refine` |

## 11. Refinement flow

**IMPLEMENTED · VERIFIED**

Refinement **appends**: `v1 → v2 → v3` with `parent_generation_id` lineage. The
original is always retrievable — asserted directly. Modifiers come from Module 18's
`MODIFIER_INSTRUCTIONS` plus `simpler`.

---

## 12. Database changes

**IMPLEMENTED · VERIFIED**

Migration 006, additive only. Both tables verified to have RLS enabled with an
isolation policy, and both are registered in the Phase 2 exhaustive RLS matrix,
which failed loudly until they were added — the guard working as intended.

---

## 13. API changes

**IMPLEMENTED · VERIFIED** — 16 routes under `/api/studio`.

```text
GET    /studio/health                          (unauthenticated)
GET    /studio/capabilities                   catalogue + schemas + donor provenance
GET    /studio/platforms                      platform constraints
GET    /studio/workflow                       the five workflow steps

POST   /studio/sessions                       201
GET    /studio/sessions
GET    /studio/sessions/{id}
PATCH  /studio/sessions/{id}
DELETE /studio/sessions/{id}
GET    /studio/sessions/{id}/context          what a generation would use
GET    /studio/sessions/{id}/versions         version history

POST   /studio/generate                       run a capability
POST   /studio/critique                       structured review
POST   /studio/refine                         new version

POST   /studio/versions/{id}/approve          explicit creator approval
DELETE /studio/versions/{id}
```

Ownership: no `user_id` parameter exists on any route. The generated TypeScript
contract is asserted to contain no `user_id` field.

---

## 14. Frontend changes

**IMPLEMENTED · VERIFIED**

| File | Purpose |
|---|---|
| `lib/studio-contracts.ts` | **Generated** from `/openapi.json` |
| `lib/studio-api.ts` | Typed client over the generated contract |
| `app/studio/page.tsx` | The workspace (8.59 kB route) |

The Phase 1 mock Studio page — hardcoded sessions and a donor-derived "7-stage
pipeline" label — was replaced.

**Contract generation** (task §27) is enforced by a test that regenerates and diffs
the committed file, so the TypeScript cannot silently drift from the Pydantic
models. `infra/docker-compose.yml` now mounts `scripts/` and `apps/web/lib`
read-only so that guard can actually run in the container.

**State split** (task §30): server state (sessions, versions, capabilities,
platforms) lives in PostgreSQL and is refetched after each mutation; client state
(current step, draft brief, refinement instruction) stays local. No global store.

`npm run lint` remains **not configured** — there is no committed ESLint config and
`next lint` is deprecated and interactive. Lint is not a required gate.

---

## 15. Security & RLS verification

**IMPLEMENTED · VERIFIED**

Live two-user verification against the running service:

```text
PASS  A creates own session                201
PASS  A lists own sessions                 200
PASS  A updates own session                200
PASS  A reads own versions                 200
PASS  B reads A session                    404 (want 404)
PASS  B updates A session                  404 (want 404)
PASS  B deletes A session                  404 (want 404)
PASS  B generates into A session           404 (want 404)
PASS  B reads A versions                   404 (want 404)
PASS  B list excludes A sessions           0 leaked
PASS  A session intact after B attempts    unchanged
```

| Control | Result |
|---|---|
| Authentication | 401 without a token on every route except `/health` |
| Authorization | PostgreSQL RLS; 24 Studio RLS tests + exhaustive matrix |
| Forged ownership via raw SQL | Rejected by `WITH CHECK` on both tables |
| `user_id` reassignment | Rejected |
| Enumeration | Cross-creator access returns **404**, not 403 |
| Prompt injection | 18 tests on the neutralisation boundary |
| Secrets | 0 live-secret patterns in Studio code or prompts |
| Error leakage | No stack traces, no provider internals, no credentials |
| Cost abuse | Per-session and per-version budgets, enforced pre-call |

---

## 16. Test results

**VERIFIED**

```bash
docker exec creator-api pytest -q
# 588 passed
```

| Layer | Tests | Status |
|---|---|---|
| Domain rules (timing, platforms, goals) | 30 | VERIFIED |
| Validation, hygiene, ranking | 31 | VERIFIED |
| Prompt-injection boundary | 18 | VERIFIED |
| Capability registry + contracts | 27 | VERIFIED |
| Capabilities (donor smoke) | 38 | VERIFIED |
| Frontend contract drift | 7 | VERIFIED |
| AI evaluation harness | 21 | VERIFIED |
| Prompt loader regression (Phase 2 fix, parametrised over assets) | 51 | VERIFIED |
| API + persistence | 43 | VERIFIED |
| End-to-end flow | 8 | VERIFIED |
| RLS isolation | 24 | VERIFIED |
| **Studio total** | **247** | VERIFIED |
| Prompt loader regression (guards the Phase 2 fix) | 51 | VERIFIED |
| Phase 1 + Phase 2 regression (everything else) | 290 | VERIFIED |

### Negative controls

| Control | Result |
|---|---|
| Provider always failing | Creator-safe timeout; no stack trace or internals |
| Transient provider failure | Recovered by Gateway retry |
| Refinement returning identical text | Flagged, not stored silently |
| Empty generation output | Rejected; not persisted as a blank version |
| Critique with no content | 409, never a fake clean review |
| Forge ownership via raw SQL | Rejected by the policy |
| Zero-padded vector injected into the DB | Phase 2 provenance suite failed as designed |

---

## 17. AI evaluation results

**VERIFIED** — 28 scenarios across 8 categories. `docs/eval/studio_evaluation.json`.

| Category | Mean |
|---|---|
| instruction_following | 1.0 |
| script_quality | 0.9719 |
| memory_usage | 0.9444 |
| idea_to_content | 0.8433 |
| critique_usefulness | 0.7833 |
| context_relevance | 0.8 |
| hook_quality | 0.7344 |
| refinement_quality | 0.5 |

Per capability: idea 14/14, script 5/5, hook 5/5, caption 2/2, cta 1/1, repurpose 1/1.

14 deterministic metrics; **only gating metrics decide pass/fail**, and a scenario
exercising no gating metric is reported failed rather than vacuously passing.
Notably `no_fabricated_numbers` is gating — any number in generated output that does
not trace to the creator's own input fails the scenario.

`refinement_quality` averages 0.5 because its score is the mean of "original
preserved" (always 1.0) and "output actually changed" (1.0 only when the scripted
refine returns different text). Two scenarios deliberately script an identical
refinement to prove the "unchanged" warning fires, which caps the mean. This is a
property of the scenario set, not a failure.

No embedding benchmark was re-run and no language-specific model work was started,
per §37.

---

## 18. Known limitations

| Limitation | Assessment |
|---|---|
| Live LLM output never reviewed | Structural metrics are provider-independent by design; output quality needs real credentials. **BLOCKED.** |
| Anti-fabrication is prompt-enforced | No validator can tell whether a statistic is true. The evaluation metric catches numbers absent from the creator's input, but cannot verify a plausible one. |
| Injection defence is structural | Untrusted text cannot mechanically escape its delimiter; a sufficiently clever model could still be influenced. |
| No streaming | Request/response only. `StageTrace` exists for progress but the API does not stream it. |
| Single-pass critique | Re-critiquing is a creator action. |
| No frontend component tests | The repo has no frontend test harness; typecheck + build is the gate. |
| `packages/contracts/index.ts` is stale | Pre-existing file whose header claims to be generated but is hand-maintained. Left untouched as out of scope; Studio uses its own generated contract. Recorded here rather than silently rewritten. |

---

## 19. Deferred work

| Item | Status | Reason |
|---|---|---|
| Automated publishing | **DEFERRED** | §39 — Phase 3 ends at publish-ready content |
| Performance → Insight → Lesson loop | **DEFERRED** | §38 — Growth/Coach phases |
| Trend ingestion | **DEFERRED** | Growth concern |
| Creator research assistant | **DEFERRED** | Parked; donor fabricates statistics |
| Export to Markdown/CSV | **DEFERRED** | Library/distribution concern |
| Generation streaming | **DEFERRED** | Not required by the acceptance criteria |
| Frontend test harness | **DEFERRED** | No existing harness |
| Phase 4 (TODAY + AI Producer) | **NOT STARTED** | §46 — out of scope |

---

## 20. Phase 3 defects found and fixed

Verification found real bugs, including several in my own Phase 3 work:

| Defect | Impact |
|---|---|
| Prompt assets authored under `prompt` but read as `template` | 4 Phase 2 assets silently rendered an **empty** prompt. Found because Studio depends on them. Fixed with a key alias; 24 regression tests pin the contract. |
| `render` could not resolve `voice_profile.tone_keywords` | Nested prompt variables raised `KeyError`. Now resolved, with a hard failure on a missing variable. |
| Assets used Handlebars syntax | The strict renderer cannot express it. Normalised; a test forbids the syntax. |
| Studio issued `DELETE FROM chunks` | A §12 boundary violation, and redundant — the FK already cascades. Removed. |
| Deleting a session orphaned its generated assets | FK cascades asset→generation only. Fixed; a test asserts no orphaned asset **or embedding** remains. |
| Deleting a version orphaned its asset | Same asymmetry. Fixed and tested. |
| Refinement budget miscounted the chain | Counting consecutive `refine` rows reset each step. Now walks `parent_generation_id`; tested. |
| Capability input errors returned 502 | A client error was reported as backend failure. Now 422/409. |
| Workflow step did not advance after generation | Sessions stayed at `generate` with content already on the page. Corrected and documented. |
| `render_lines` called on the wrong module | `refine` crashed at runtime; caught by the end-to-end flow test. |
| Generated contract marked always-present fields optional | Consumers needed `?? []` for fields the API always sends. Generator now consults Pydantic defaults. |
| Exhaustive RLS matrix rejected the new tables | The Phase 2 guard working as intended; both tables registered with parent seeding. |

---

## 21. Phase 4 readiness

**READY.**

The services Phase 4 needs are verified and stable: Gateway, Memory, Voice,
EmbeddingService, Jobs, prompt registry, RLS. Studio demonstrates the
capability-registry and orchestration pattern that Module 21 (Autonomous Content
Pipeline) and the new AI Producer should **reuse** rather than reimplement.

Recommended before Phase 4 ships user-facing work:

1. Real provider credentials, so live output can be reviewed rather than only
   structurally validated.
2. A frontend test harness, if the UI surface keeps growing.
3. Streaming, if long-running Studio generations need a progress channel.

`docs/INTEGRATION_STATUS.md` no longer lists embedding-model selection as blocking.

---

## 22. Phase 4 boundary

Phase 4 (TODAY + AI Producer) has **not** been started. Studio's work is complete and
this report is the stopping point.

---

## 23. Reproducing this report

```bash
~/ops/ensure_stack.sh                                        # Postgres + API
docker exec creator-api pytest -q                            # 588 passed
docker exec creator-api python -m app.ai.evaluation.studio_runner
                                                            # 28/28, rate 1.0

cd apps/web && npm install && npm run typecheck             # exit 0
cd apps/web && npm run build                                # exit 0

git diff -- modules/                                        # empty
```
