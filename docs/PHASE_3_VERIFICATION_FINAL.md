# Phase 3 Verification — Final

**Phase:** 3 — Studio, Unified Creator Workspace
**Commit:** `3edd8ae`
**Status:** ACCEPTED WITH DEFERRED LIVE-AI VALIDATION
**Verification:** original Phase 3 verification, extended by the Phase 2–4 consolidated cycle (`8bcd53d`)
**Date:** 2026-10-06

> **Verification boundary.** This document records **automated engineering
> verification**. Live provider output quality is a separate claim and is
> **DEFERRED** — see §10.

---

## 1. Scope

Studio is the platform's creation workspace and the **Make** step of the loop.

### Verified lifecycle

```
Session
  ↓
Context
  ↓
Generate
  ↓
Critique
  ↓
Refine
  ↓
Publish-ready content
```

Workflow position is `context → generate → review → refine → done`. Refinement
appends a version; it never overwrites, so the creator can always go back. Phase 3
ends at publish-ready content: nothing is published, posted, or auto-approved.

### Verified capabilities — all eight

| # | Capability | Covered by |
|---|---|---|
| 1 | `idea` | `test_studio_capabilities.py`, `test_studio_validation.py` |
| 2 | `hook` | `test_studio_capabilities.py`, `test_studio_rules.py` |
| 3 | `script` | `test_studio_capabilities.py`, `test_studio_rules.py` |
| 4 | `caption` | `test_studio_capabilities.py`, `test_studio_validation.py` |
| 5 | `repurpose` | `test_studio_capabilities.py` |
| 6 | `cta` | `test_studio_capabilities.py`, `test_studio_rules.py` |
| 7 | `thumbnail` | `test_studio_capabilities.py`, `test_studio_validation.py` |
| 8 | `refine` | `test_studio_capabilities.py`, `test_studio_lineage.py` |

Each capability has coverage for a valid request, an invalid request, missing
context, sparse context, user isolation, persistence, errors, retries where
applicable, and its output contract.

---

## 2. Verification

| Area | Result | Evidence |
|---|---|---|
| **Session lifecycle** | PASS | `test_studio_api.py` (41), `test_studio_flow.py` (8) — create, retrieve, update, delete, resume, concurrent access, invalid session id, cross-user access. The client cannot override authenticated ownership |
| **Session / version relationship** | PASS | `test_studio_lineage.py` (23) — version monotonicity, per-session numbering, ascending listing, latest = highest version |
| **Generation lineage** | PASS — **23 dedicated tests added**, see §3 | `test_studio_lineage.py` |
| **Critique** | PASS | `test_studio_lineage.py` — critique references the generation it was written for, is persisted, is user-owned, cannot reference another user's generation, and fails safely when the generation does not exist. Refinement consumes it |
| **Refinement** | PASS | Refinement appends and links to its parent; the origin remains fully retrievable; the budget follows the correct lineage |
| **Asset lifecycle** | PASS — asserted on **both** tables, see §4 | `test_studio_lineage.py` |
| **RLS** | PASS | `test_studio_rls.py` (24) — sessions, versions, generated assets, including raw-SQL forgery |
| **User isolation** | PASS | `test_studio_rls.py`, `test_cross_phase_journey.py` |
| **Memory integration** | PASS | Studio consumes `LongTermMemoryEngine`; owns no second vector store |
| **Voice integration** | PASS | Studio consumes `CreatorVoiceEngine`; duplicates no voice logic |
| **LLM integration** | PASS | Studio reaches providers only through `LLMGateway`; zero provider SDK imports under `app/studio/` |
| **Prompt system** | PASS — see §5 | `test_prompt_loader.py` — no shipped asset loads with an empty template |
| **Donor boundaries** | PASS — see §6 | `test_architecture_contract.py` (9) |
| **Frontend** | PASS | typecheck, production build, functional render tests |
| **AI evaluation** | PASS — 28 / 28 | `test_studio_evaluation.py` (21 tests) + 28 scenarios across 8 categories |

---

## 3. Generation lineage

Lineage was thin at the start of this cycle: `max_refinements_per_version` appeared
in **exactly one reference**. Version ordering, lineage shape, latest-version
selection, duplicate prevention, and deletion behavior were asserted nowhere.

**23 dedicated tests added** (`apps/api/tests/integration/test_studio_lineage.py`):

| Property | Test |
|---|---|
| Versions start at 1 and are monotonic | `test_next_version_is_monotonic_and_starts_at_one` |
| `next_version` advances past existing rows | `test_next_version_advances_past_existing_versions` |
| Versions are **per-session**, not global | `test_versions_are_numbered_per_session_not_globally` |
| Listing is ascending by version | `test_list_generations_returns_ascending_versions` |
| Latest = highest version, not newest row | `test_latest_generation_is_the_highest_version_not_the_newest_row` |
| Empty session returns `None`, not an error | `test_latest_generation_is_none_for_an_empty_session` |
| **Duplicate version rejected by the database** | `test_a_duplicate_version_in_one_session_is_rejected_by_the_database` |
| **`version >= 1` check constraint enforced** | `test_version_zero_is_rejected_by_the_check_constraint` |
| Refinement appends and links to its parent | `test_refinement_appends_and_links_to_its_parent` |
| A 4-deep chain resolves to exactly one origin | `test_the_lineage_chain_walks_back_to_a_single_origin` |
| Only `refine` chains; a new capability starts a new root | `test_first_generation_of_a_capability_is_an_origin` |
| Deleting a parent does not delete descendants | `test_deleting_a_parent_does_not_delete_its_descendants` |
| `ON DELETE SET NULL`: lineage lost, content kept | same test |
| Approval is explicit and defaults to off | `test_approval_is_explicit_and_default_off` |
| A foreign creator cannot approve | `test_a_foreign_creator_cannot_approve` |

---

## 4. Asset lifecycle and orphan prevention

The FK `studio_generations.asset_id -> content_assets(id) ON DELETE CASCADE`
cascades in the **asset → generation** direction only. Deleting a session or a
version therefore removes the generation row but strands the generated text unless
the asset is deleted explicitly.

Asserting on only one of the two tables is precisely how the historical orphan
defect shipped. Every deletion test below asserts on **both**:

| Test | Asserts |
|---|---|
| `test_deleting_a_generation_also_deletes_its_asset` | generation **and** asset removed |
| `test_deleting_a_session_removes_its_generations_and_assets` | all generations **and** all assets removed |
| `test_deleting_an_asset_cascades_to_the_generation` | the other cascade direction |
| `test_deleting_a_session_cascades_asset_deletion_to_chunks` | chunk cleanup arrives **via the `content_assets` FK**, not by Studio issuing chunk SQL |
| `test_a_foreign_creator_cannot_delete_a_generation` | denied; the owner's row survives |
| `test_a_foreign_creator_cannot_delete_a_session_or_its_assets` | denied; assets survive |

No orphaned generated asset or embedding remains.

---

## 5. Prompt regression

The historical defect was that every prompt asset except `voice/profile_summary`
authored its body under the key `prompt`, while the loader reads `template`. Those
assets loaded with an **empty** template and rendered to an empty user message — a
silent empty prompt rather than an error.

**Verified impossible:** `test_prompt_loader.py` asserts that **no shipped asset
loads with an empty template**, plus correct template loading, versioning, missing
prompt behavior, invalid version handling, and prompt provenance.

The end-to-end path — stored asset → prompt loader → non-empty usable template →
LLM Gateway request — is exercised by every scripted-generation test in
`test_studio_flow.py` and by the cross-phase journey test.

---

## 6. Donor boundaries

| Scan under `app/studio/` | Result |
|---|---|
| Provider SDK imports | **0** |
| `SentenceTransformer` imports | **0** |
| Embedding model names | **0** |
| Raw `chunks` SQL | **0** — only comments explaining the prohibition |
| Direct vector database ownership | **0** |
| `create_async_engine` / raw credential access | **0** |
| `modules/` drift | **0 lines**, 1,065 tracked files |

Studio depends on platform services and has not become a second architecture.
`tests/integration/test_architecture_contract.py` enforces this continuously.

---

## 7. Defects previously discovered and fixed

### 1. Prompt / template loading mismatch — FIXED

Assets authored under `prompt` while the loader read `template`, producing silent
empty prompts. Fixed by aliasing `prompt` → `template`, adding dotted-path variable
resolution with hard failure on a missing variable, and normalizing all assets.
**Regression:** asserted by `test_prompt_loader.py`.

### 2. Studio deleting `chunks` directly — FIXED

Studio manipulated the Memory Engine's vector store. Fixed to reach chunk cleanup
through the `content_assets` FK.

**Verified still fixed:** scanning `(FROM|INTO|UPDATE|DELETE FROM) chunks` outside
`app/memory/` returns **zero hits** application-wide. All 12 files that *mention*
`chunks` were inspected manually; every hit is a comment explaining the
prohibition, a response-model field name, or `app/features/memory/router.py` (the
Memory feature itself).

**Regression:** `test_deleting_a_session_cascades_asset_deletion_to_chunks`.

### 3. Orphaned generated assets / embeddings — FIXED

Session and version deletion left generated text in `content_assets` with its
embeddings. Fixed by deleting assets explicitly, relying on the FK for chunks.

**Regression:** the six tests in §4, each asserting on both tables.

### 4. Refinement lineage / budget issue — FIXED

The budget followed the wrong lineage. Fixed so `_refinement_chain_length` walks
`parent_generation_id` back to the origin, counting only `refine` nodes.

**Regression:** the lineage tests in §3.

### 5. Studio evaluation harness state leakage — FIXED

**This is a `test-harness defect`, NOT a production platform defect.** The Studio
platform produced correct output; the evaluation harness leaked state.

- **Symptom.** `studio_002_idea_uses_creator_memory` intermittently reported
  `memory_used: 0.0`, and only in sequence, never in isolation.
- **Root cause.** Two compounding causes. First, the evaluation user was never
  reset, so its corpus grew on every run and `memory_used` depended on how many
  times the suite had been executed. Second, the initial fix — resetting through an
  **admin** connection — introduced row-lock contention against the long-lived
  shared session, making results *nondeterministic*, which was worse than the
  original bug.
- **Fix.** Reset through the caller's own RLS-scoped session, which is sufficient
  because the evaluation user owns every row it deletes. The harness now also
  records `context_notes` per result and prints them in the failure message, so a
  future `memory_used: 0.0` distinguishes "nothing relevant retrieved" from
  "retrieval raised".
- **Result.** 28/28, stable across four consecutive runs.

**Distinction, stated plainly:**

| | Classification |
|---|---|
| Studio evaluation state leakage (defect 5) | **test-harness defect** — the evaluation tool was stateful |
| Prompt/template mismatch (defect 1) | **production defect** — shipped assets would render empty prompts |
| Direct `chunks` deletion (defect 2) | **production defect** — a real Memory/Studio boundary violation |
| Orphaned assets (defect 3) | **production defect** — real data-integrity bug |
| Refinement lineage (defect 4) | **production defect** — real budget-logic bug |

---

## 8. Architectural decision — Studio output and the memory corpus

> **DEFERRED — FUTURE PRODUCT DECISION**

**Studio generated content is currently not automatically ingested/chunked into the
Long-Term Memory retrieval corpus.**

`StudioOrchestrator` persists output through `repository.create_asset(...)` and does
not call the Memory Engine, so generated content has no `chunks` rows and is
therefore not retrievable by memory search.

**This is intentionally deferred because it is a product/schema decision, not a
verification failure. Changing it now would expand Phase 3/4 scope and alter the
existing Memory/Studio boundary.**

**This is not a bug.** It is not counted against Phase 3 acceptance.

Practical consequence, recorded for planning: a creator's own generated output
cannot currently inform future memory retrieval, and the Phase 4 Producer — which
reads memory — cannot use it as grounding.

**Recommendation:** decide this **before Phase 5**, where performance loops will
want generated content available as memory. The options have different schema
implications (chunk on write, a separate retrieval store, or an explicit opt-in),
which is exactly why it is a product decision rather than a fix.

---

## 9. Frontend

| Gate | Result |
|---|---|
| Typecheck | PASS |
| Production build | PASS |
| Functional render tests | PASS |

Functional tests were added for the Studio experience: the page renders, and it
never surfaces provider surface (model names, API keys) to the creator.

**Declared limitation:** `react-dom/server` renders initial markup only, so
generate → critique → refine is not driven through a browser in this cycle. No DOM
or browser harness was introduced. See `apps/web/tests/README.md`.

---

## 10. Live AI validation

**DEFERRED.**

The configured provider credentials currently return **HTTP 401** (status codes
only; no credential values were printed). Live provider output quality remains
unvalidated. The deterministic verification path is passing. A future live-AI
acceptance run is required when valid provider credentials are available.

**No factual truth verification is claimed.** The anti-fabrication metrics verify
that the model did not invent numbers *relative to supplied context*, which is not
the same as checking its output against reality.

---

## 11. AI evaluation

**28 / 28 scenarios passed**, stable across four consecutive runs, across 8
categories:

| Category | n |
|---|---|
| `idea_to_content` | 5 |
| `script_quality` | 4 |
| `hook_quality` | 4 |
| `refinement_quality` | 4 |
| `critique_usefulness` | 4 |
| `memory_usage` | 3 |
| `context_relevance` | 2 |
| `instruction_following` | 2 |

Coverage inspected for relevance, creator-context usage, voice consistency,
critique quality structure, refinement quality, unsupported/fabricated numbers,
sparse context, contradictory context, and failure cases.

---

## 12. Donors

`modules/` unchanged: 1,065 tracked files, 0 diff lines. No donor module was
modified.

---

## 13. Status

```
ACCEPTED WITH DEFERRED LIVE-AI VALIDATION
```

Acceptance criteria:

- [x] Studio lifecycle verified
- [x] All capabilities verified
- [x] Session isolation verified
- [x] Generation lineage verified *(23 dedicated tests added; previously 1 reference)*
- [x] Critique verified
- [x] Refinement verified
- [x] Asset lifecycle verified
- [x] Prompt regression verified
- [x] Studio security verified
- [x] Frontend workflow verified *(initial render and client layer; post-click browser flow not covered — no DOM harness)*
- [x] AI evaluation verified — 28/28

Engineering, integration, security, regression, architecture, and donor-boundary
verification passed. Live provider output quality remains unvalidated because the
configured provider credentials are not currently usable.

One item is recorded as **DEFERRED — FUTURE PRODUCT DECISION** (§8) and is not a
verification failure.

**No Phase 5 work was performed.**
