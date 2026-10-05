# Studio Architecture — Phase 3

**Date:** 2026-10-05
**Status:** Implemented and verified. See `docs/PHASE_3_FINAL_REPORT.md` for evidence.

The central principle:

> Studio is one unified creator workspace built on shared platform services.
> Donor modules provide capabilities inside Studio; they do not become separate products.

---

## 1. Position in the platform

```text
                         CREATOR PLATFORM
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
      START                    TODAY                   STUDIO   ← Phase 3
                                                       │
                              ┌────────────────────────┤
                              │                        │
                           Context                 Creation
                              │                        │
                    ┌─────────┴─────────┐      ┌─────────┴─────────┐
                    │                   │      │                   │
                 Memory               Voice  Donor            New
                    │                   │  Capabilities    Capabilities
                    └─────────┬─────────┘      │                   │
                              │                └─────────┬─────────┘
                       Shared Platform                   │
                         Services                       │
                              │                         │
                 ┌────────────┴────────────┐           │
                 │                         │           │
           EmbeddingService           LLM Gateway ──────┘
                 │
          E5-base 768-D
                 │
              pgvector
                 │
          PostgreSQL + RLS
```

Studio is the **Make** step of the Creator Platform loop
(`Remember → Decide → Make → Distribute → Learn`). It consumes the **Remember**
capabilities built in Phase 2. It does not implement distribution, and it does not
implement the learning loop.

---

## 2. Layers

```text
app/features/studio/router.py   HTTP surface, Pydantic bodies, RLS-scoped session
        │
app/studio/orchestrator.py      StudioOrchestrator — the ONLY orchestration authority
        │
        ├── app/studio/registry.py          CapabilityRegistry + StudioCapability contract
        │         └── call_gateway()        the ONLY place Studio calls a model
        │
        ├── app/studio/capabilities/        capability implementations
        │         ├── implementations.py    idea/hook/script/caption/repurpose/cta/thumbnail/refine
        │         ├── critique.py           review stage
        │         └── validation.py         coercion, clamping, hygiene, ranking
        │
        ├── app/studio/context.py           ContextAssembler → Memory + Voice (Phase 2)
        │
        ├── app/studio/persistence.py       sessions, versions, content_assets reuse
        │
        ├── app/studio/domain/rules.py      pure deterministic rules (timing, platforms, goals)
        │
        └── app/studio/safety.py            prompt-injection boundary
```

### Dependency direction

```text
Studio ──→ LongTermMemoryEngine ──→ EmbeddingService ──→ E5-base
Studio ──→ CreatorVoiceEngine
Studio ──→ LLMGateway
Studio ──→ PostgreSQL + RLS
```

Studio issues **no** SQL against `chunks`, imports neither `sentence_transformers`
nor the E5 model, and contains **no** provider SDK import. Only
`app/llm/providers/live.py` imports a provider SDK, and it is unreachable from
Studio's request path.

---

## 3. Session model

```text
studio_sessions  1 ──→ * studio_generations * ──→ 1 content_assets
                                                      │
                                                      └──→ * chunks (Memory Engine only)
```

| Table | Purpose | Why new |
|---|---|---|
| `studio_sessions` | Multi-step workspace: brief, workflow step, idea link | No existing table models a workspace session |
| `studio_generations` | Per-version history, lineage, provenance, critique | No existing table records "how this was generated" |
| `content_assets` | **Reused** for every generated body | One asset store, not two |
| `chunks` | **Reused** by the Memory Engine | Studio never embeds |

Deliberately **not** added: an embeddings, memory, voice, job or prompt table. Phase 2
owns all of those.

### Workflow position

```text
context → generate → review → refine → done
```

- A new session starts at `context`.
- Any capability that produced content advances the session to `review`: once
  something is on the page, the creator's next action is to read it.
- `critique` advances to `refine`.
- `refine` returns to `review`, because the new version is what now needs reading.

`generate` is the position a creator sits at while deciding what to make.

---

## 4. Generation flow

```text
POST /api/studio/generate
      │
StudioOrchestrator.run_capability
      │
      ├── registry.require(capability_id)      # no donor conditionals live here
      ├── capability.validate_input(payload)   # Pydantic; 422 before any cost
      ├── budget check                          # per-session, per-version
      │
      ├── ContextAssembler.assemble()          # the ONLY context builder
      │     ├── LongTermMemoryEngine.retrieve_for_prompt()
      │     ├── CreatorVoiceEngine.get_profile()
      │     └── prior Studio output
      │           └─ every block through app/studio/safety.py
      │
      ├── capability.execute()                 # one Gateway call
      │     └── call_gateway() → LLMGateway → provider → ai_calls
      │
      ├── validate + coerce + realign output   # contract holds even on a bad generation
      │
      ├── persist: content_assets row + studio_generations row (version N+1)
      │
      └── advance the workflow step
```

### Version history

Refinement **appends**. `parent_generation_id` links each version to the one it
derived from, so the chain is walkable. Nothing is overwritten.

```text
v1 (idea) ──→ v2 (refine) ──→ v3 (refine)
   │              │
   └── the original is always recoverable
```

---

## 5. Capability contract

```text
StudioCapability
    id / name / description
    donor: list[str]           which donor module informed it
    classification: PORT|ADAPT|REBUILD|NEW|PARK
    input_model: Type[BaseModel]     validated before any LLM call
    output_model: Type[BaseModel]
    requires_context: list[str]
    supported_platforms: list[str]
    execute(ctx, parsed) -> CapabilityOutcome
```

The orchestrator dispatches by `id` and contains **no** donor-specific branch.
Adding a capability means adding a capability.

Registered capabilities: `idea`, `hook`, `script`, `caption`, `repurpose`, `cta`,
`thumbnail`, `refine`. See `docs/studio-capability-map.md` for the donor mapping.

---

## 6. Context assembly

`ContextAssembler` is the single component that reads creator context, and it reads
it only through Phase 2 services.

| Block | Source | Bound | Injection-hardened |
|---|---|---|---|
| `creator_request` | session brief / capability input | 8 000 chars | yes |
| `retrieved_memory` | `MemoryEngine.retrieve_for_prompt()` | 3 000 chars | yes |
| `creator_voice` | `VoiceEngine.get_profile()` | 1 200 chars | yes |
| `prior_work` | recent Studio `content_assets` | 2 000 chars | yes |

### Prompt-injection boundary

Two layers, because either alone is insufficient:

1. **`app.studio.safety.neutralize`** — defangs tag-like delimiters, markdown code
   fences and line-initial role markers, so untrusted text cannot close our own
   wrapper. Adapted from Module 18 (Guruvelah) `lib/prompts/base.ts:19`.
2. **`app.llm.prompts.UNTRUSTED_DATA_PREAMBLE`** — states in the system channel that
   retrieved material is DATA and must never act as instructions.

Retrieved memory and pasted briefs both pass through this. An empty block returns
an empty string rather than an empty labelled section, so a prompt never invites the
model to invent content for a missing source.

---

## 7. Deterministic vs. generated

Some of Studio's structure is arithmetic and must not cost a model call:

| Computed deterministically | Source |
|---|---|
| Script segment plan (`allocate_segments`) | Module 18 `lib/domain/timing.ts:10` |
| Platform caps, hashtag ranges, duration defaults | Module 18 `lib/domain/platforms.ts:14` |
| Format taxonomy per platform | Module 18 `lib/domain/formats.ts:1` |
| Goal directives | Module 18 `lib/domain/goals.ts:1` |
| Lifecycle directives | Module 18 `lib/domain/lifecycle.ts:1` |
| Version numbering | derived |
| Hook slot realignment | Module 03 `gemini.ts:193` |
| Caption ranking | Module 08 `app.py:359` |
| Headline hygiene | Module 01 `ideaChain.js:126` |

The model is asked only for prose.

---

## 8. Human control

| Guarantee | Mechanism |
|---|---|
| Nothing is published or posted | Studio has no distribution code path |
| Content is never silently rewritten | `refine` creates a new version |
| Review never edits | `critique` returns findings only; a test asserts the text is byte-identical afterwards |
| Nothing is auto-approved | `creator_approved` is only set by an explicit `POST /approve` |
| Nothing is auto-deleted | Deletion requires an explicit `DELETE` from the creator |
| Cost is bounded | Per-session and per-version budgets enforced before the Gateway call |

Phase 3 ends at **publish-ready content**.

---

## 9. Cost control

| Bound | Default | Enforced |
|---|---|---|
| Generations per session | 40 | before the Gateway call |
| Refinements per version | 10 | before the Gateway call |

Counting refinements per version walks the `parent_generation_id` chain rather than
counting consecutive `refine` rows, because each refinement chains from its
predecessor and version order alone would make the count look reset every step.

Gateway-level bounds (timeout, bounded retry, provider fallback, token limits,
`ai_calls` accounting) remain Phase 2's responsibility.

---

## 10. Frontend

```text
app/web/lib/studio-contracts.ts   GENERATED from /openapi.json
app/web/lib/studio-api.ts         typed client, uses the generated types
app/web/app/studio/page.tsx       the workspace
```

**State split** (no global store):

| Server state (PostgreSQL) | Client state (component) |
|---|---|
| sessions, versions, capabilities, platforms | selected session, current step, draft brief, refinement instruction, selected capability |

The generated contract is enforced by
`tests/unit/test_studio_contract_generation.py`, which regenerates and diffs it —
so the TypeScript cannot silently drift from the Pydantic models. That test needs
`scripts/` and `apps/web/lib` mounted into the API container (read-only), which
`infra/docker-compose.yml` now does.

---

## 11. Security

| Concern | Control |
|---|---|
| Authentication | `get_current_user` on every Studio route except `/health` |
| Authorization | PostgreSQL RLS on both Studio tables; no `user_id` parameter exists |
| Enumeration | Cross-creator access returns **404**, not 403, so ids are not confirmed |
| Prompt injection | `studio/safety.py` + `UNTRUSTED_DATA_PREAMBLE` |
| Provider isolation | No provider SDK import anywhere under `app/studio` |
| Secrets | No credential in any Studio file, prompt or response |
| Error leakage | Creator-safe messages via `registry._friendly()`; no stack traces |
| Input validation | Pydantic with `extra="forbid"` on every request body |
| Cost abuse | Per-session and per-version budgets |

---

## 12. Testing

| Layer | File | Tests |
|---|---|---|
| Domain rules | `tests/unit/test_studio_rules.py` | 30 |
| Validation/hygiene/ranking | `tests/unit/test_studio_validation.py` | 31 |
| Injection boundary | `tests/unit/test_studio_safety.py` | 18 |
| Registry + contract | `tests/unit/test_studio_registry.py` | 27 |
| Capabilities (donor smoke) | `tests/unit/test_studio_capabilities.py` | 38 |
| Prompt loader regression (Phase 2 fix) | `tests/unit/test_prompt_loader.py` | 51 |
| Frontend contract drift | `tests/unit/test_studio_contract_generation.py` | 7 |
| AI evaluation | `tests/unit/test_studio_evaluation.py` | 21 |
| API + persistence | `tests/integration/test_studio_api.py` | 43 |
| End-to-end flow | `tests/integration/test_studio_flow.py` | 8 |
| RLS isolation | `tests/security/test_studio_rls.py` | 24 |

Plus the Phase 2 exhaustive RLS matrix, which now covers both Studio tables
(`tests/security/test_rls_exhaustive_isolation.py`).
