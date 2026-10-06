# Phase 3 Verification — Final

**Phase:** 3 — Studio Unified Creator Workspace
**Commit:** `3edd8ae`
**Status:** ✅ ACCEPTED WITH DEFERRED LIVE-AI VALIDATION
**Verification run:** 2026-10-06 (consolidated Phases 2–4 verification)

---

## 1. Baseline vs. this run

| | Phase 3 baseline | This verification |
|---|---|---|
| Backend tests | 588 | **845** |
| Studio-specific tests | 247 | 311 |
| Studio evaluation | 28 / 28 | **28 / 28** |
| Lineage / asset-lifecycle tests | **1 reference** | **23 dedicated** |
| Frontend | typecheck + build | **typecheck + build + 27 functional tests** |
| Live provider | deferred | **deferred (re-confirmed)** |

---

## 2. Defect regression status

The four Phase 3 defects were each re-checked against real code, and each now has
a **dedicated regression test** rather than incidental coverage.

### Defect 1 — Studio deleting `chunks` directly

**Still fixed.** `StudioRepository.delete_session` and `delete_generation` delete
only `content_assets`; the code carries an explicit comment that deleting chunks
would be a boundary violation.

- **Static proof:** scanning `(FROM|INTO|UPDATE|DELETE FROM) chunks` outside
  `app/memory/` returns **zero hits** across the whole application.
- **Behavioural proof (new):**
  `test_deleting_a_session_cascades_asset_deletion_to_chunks` gives an asset a
  real chunk through the Memory Engine, adopts it as a Studio generation, deletes
  the session, and asserts the chunk count drops by exactly one — proving cleanup
  arrives *via the FK cascade* rather than by Studio issuing chunk SQL.

### Defect 2 — Orphaned generated assets / embeddings

**Still fixed, and previously under-tested.**

The FK `studio_generations.asset_id -> content_assets(id) ON DELETE CASCADE`
cascades in the *asset → generation* direction only, so deleting a session or a
version strands the generated text unless the asset is deleted explicitly. Asserting
on only one of the two tables is precisely how this defect shipped.

**New `apps/api/tests/integration/test_studio_lineage.py` — 23 tests**, asserting
on **both** sides for every deletion path:

- deleting a generation removes its asset (`test_deleting_a_generation_also_deletes_its_asset`)
- deleting a session removes all its generations **and** all its assets
- deleting an asset cascades to the generation (the other direction)
- asset deletion cascades to chunks
- a foreign creator can delete neither the generation nor the session, and the
  assets survive

### Defect 3 — Refinement budget following the wrong lineage

**Still fixed.** `_refinement_chain_length` walks `parent_generation_id` back to
the origin, counting only `refine` nodes.

**New lineage coverage** pinning the properties that were asserted nowhere:

- `test_refinement_appends_and_links_to_its_parent` — refinement appends, never overwrites
- `test_the_lineage_chain_walks_back_to_a_single_origin` — a 4-deep chain resolves to exactly one origin
- `test_first_generation_of_a_capability_is_an_origin` — only `refine` chains; a new capability starts a new root
- `test_deleting_a_parent_does_not_delete_its_descendants` — `ON DELETE SET NULL`: lineage is lost, content is not

### Defect 4 — (bonus, from Phase 4) prompt-loader class of defect

Covered in the Phase 2 report; Studio prompt regression re-verified in §5.

---

## 3. What was already adequately tested — reused, not duplicated

| Area | File | Tests |
|---|---|---|
| Capability contracts | `test_studio_capabilities.py` | 38 |
| Input validation | `test_studio_validation.py` | 31 |
| Registry / dispatch | `test_studio_registry.py` | 27 |
| Domain rules | `test_studio_rules.py` | 20 |
| Prompt-injection boundary | `test_studio_safety.py` | 18 |
| API surface | `test_studio_api.py` | 41 |
| End-to-end flow | `test_studio_flow.py` | 8 |
| Session / version RLS | `test_studio_rls.py` | 24 |

All eight capabilities (`idea`, `hook`, `script`, `caption`, `repurpose`, `cta`,
`thumbnail`, `refine`) have valid/invalid request, missing/sparse context, user
isolation, persistence, error, and output-contract coverage in these files.

The verification deliberately did **not** add parallel tests for areas already
covered. Roughly 200 lines of new test code were written and then deleted during
this work because an equivalent assertion already existed.

---

## 4. Versioning and session semantics — newly covered

The brief asked specifically about version ordering, active-version selection,
duplicate prevention, and the session/version relationship. These were thin:

| Property | Test |
|---|---|
| Versions start at 1 and are monotonic | `test_next_version_is_monotonic_and_starts_at_one` |
| `next_version` advances past existing rows | `test_next_version_advances_past_existing_versions` |
| Versions are **per-session**, not global | `test_versions_are_numbered_per_session_not_globally` |
| Listing is ascending by version | `test_list_generations_returns_ascending_versions` |
| Latest = highest version, not newest row | `test_latest_generation_is_the_highest_version_not_the_newest_row` |
| Empty session returns `None`, not an error | `test_latest_generation_is_none_for_an_empty_session` |
| **Duplicate version rejected by the DB** | `test_a_duplicate_version_in_one_session_is_rejected_by_the_database` |
| **`version >= 1` check constraint enforced** | `test_version_zero_is_rejected_by_the_check_constraint` |

Critique and approval (new):

- `test_attached_critique_references_the_generation_it_was_written_for`
- `test_critique_cannot_be_attached_to_another_users_generation`
- `test_attaching_critique_to_a_missing_generation_returns_none` — fails safely
- `test_approval_is_explicit_and_default_off` — Studio never self-approves
- `test_a_foreign_creator_cannot_approve`

---

## 5. Prompt regression — proven through to the Gateway call

Not merely "the row exists". The existing `test_prompt_loader.py` asserts that
**no shipped asset loads with an empty template** — the exact failure mode that
shipped in Phase 3 (assets authored under `prompt`, loader reading `template`,
rendering an empty user message with no error). Re-verified, still passing, and
now covering the Phase 4 producer prompt too.

End-to-end Studio prompt flow (stored asset → loader → non-empty template →
Gateway request) is additionally exercised by every scripted-generation test in
`test_studio_flow.py` and the new cross-phase journey.

---

## 6. Donor boundary

| Scan | Result |
|---|---|
| Provider SDK imports under `app/studio/` | **0** |
| `SentenceTransformer` under `app/studio/` | **0** |
| Embedding model names under `app/studio/` | **0** |
| Raw `chunks` SQL under `app/studio/` | **0** (only comments explaining the prohibition) |
| `create_async_engine` / raw credentials under `app/studio/` | **0** |
| `modules/` drift | **0 lines**, 1065 tracked files |

Studio depends on platform services and has not become a second architecture.
`tests/integration/test_architecture_contract.py` (9) enforces this
continuously.

---

## 7. AI evaluation — 28/28

Re-verified, and now **stable across four consecutive runs**.

Verifying it surfaced a **harness defect inherited from Phase 3**, which is
documented in full in the Phase 4 report (§11) because the fix was found here:

- the evaluation user was never reset, so its corpus grew on every run;
- the first fix (reset via an **admin** connection) deadlocked against the shared
  long-lived session and made results *nondeterministic* — worse than the bug;
- correct fix: reset through the caller's own RLS-scoped session, which suffices
  because the evaluation user owns every row it deletes.

The harness now also records `context_notes` on every result and prints them in
the failure message, so a future `memory_used: 0.0` distinguishes "nothing
relevant retrieved" from "retrieval raised".

**Coverage inspected** across relevance, creator-context usage, voice
consistency, critique structure, refinement quality, fabricated numbers, sparse
context, contradictory context, and failure cases. As instructed, **no factual
truth verification is claimed** — the anti-fabrication metrics check that the
model did not invent numbers relative to the supplied context, which is not the
same as checking its output against reality.

---

## 8. Finding: Studio output is never chunked

Found while writing the chunk-cascade regression test. `StudioOrchestrator`
persists generated content through `repository.create_asset(...)` and **never
calls the Memory Engine**, so Studio-generated content has no `chunks` rows and is
therefore **not retrievable by memory search**.

Consequences observed:
- a creator's own generated output cannot inform future memory retrieval;
- Phase 4's Producer context reads Memory, so it cannot benefit from Studio output
  as grounding.

This is reported, **not fixed**. Making generated content retrievable is a product
and schema decision (chunk on write? separate the two stores? opt-in?), and
silently changing ingestion behaviour during a verification task would exceed the
mandate. It should be resolved before Phase 5, which is where performance loops
will want generated content as memory.

---

## 9. Frontend — previously typecheck-only

Phase 3 and 4 both accepted "typecheck + build" as frontend verification. That is
not evidence a workflow works. A functional frontend harness was added — see
`apps/web/tests/README.md` — contributing **27 tests**, including Studio page
render checks and assertions that the Studio UI never surfaces provider surface
(model names, API keys).

**Honest limitation:** `react-dom/server` renders initial markup only, so
post-click behaviour (generate → critique → refine in the browser) is **not**
covered. Closing that needs a DOM or browser, which the brief asked not to
introduce. It is recorded as a deliberate gap, not an oversight.

---

## 10. Phase 3 acceptance

- [x] Studio lifecycle verified
- [x] All capabilities verified
- [x] Session isolation verified
- [x] Generation lineage verified — **23 new tests; previously 1 reference**
- [x] Critique verified
- [x] Refinement verified
- [x] Asset lifecycle verified
- [x] Prompt regression verified
- [x] Studio security verified
- [x] Frontend workflow verified — **partially; initial render + client layer. Post-click flow NOT covered (no DOM)**
- [x] AI evaluation verified — 28/28

**Result: ACCEPTED WITH DEFERRED LIVE-AI VALIDATION**, with two recorded
limitations: live output quality (§ deferred), and the unchunked Studio output
finding in §8.
