# Studio Capability Map — Phase 3

**Date:** 2026-10-05
**Scope:** Donor modules mapped into the unified Studio workspace.
**Authority:** `StudioOrchestrator` is the sole orchestration authority. Donor modules supply *capabilities*, never architecture, auth, storage, or navigation.

---

## 1. Classification key

| Class | Meaning |
|-------|---------|
| **PORT** | Donor code moves across substantially unchanged; the platform supplies all surrounding services. |
| **ADAPT** | Donor *logic* is reused, rewritten against platform contracts (Gateway, Memory, Voice, prompts, DB). |
| **REBUILD** | The capability is required, but the donor implementation cannot be used at all. |
| **NEW** | No donor capability exists; built for Studio. |
| **PARK** | Deliberately not brought into Phase 3. |

---

## 2. Studio capability map

| Capability | Donor | Classification | Platform replacement | Studio usage |
|---|---|---|---|---|
| Stage orchestration / pipeline | 18-Guruvelah `lib/ai/orchestrator.ts:32` | **ADAPT** | `StudioOrchestrator` | Session planning, staged generation |
| Stage→prompt dispatch w/ cross-stage context | 18 `lib/prompts.ts:70` | **ADAPT** | `packages/prompts/studio/*.json` + `ContextAssembler` | Every capability prompt |
| Platform-aware config (platform caps, hashtag/char limits) | 18-G `lib/domain/platforms.ts:14` | **ADAPT** | `studio/domain/platforms.py` | Hook/script/caption constraints |
| Deterministic timing / segment allocation | 18-G `lib/domain/timing.ts:10` | **ADAPT** | `studio/domain/timing.py` | Script structure, no LLM needed |
| Format taxonomy per platform | 18-G `lib/domain/formats.ts:1` | **ADAPT** | `studio/domain/formats.py` | Format selection |
| Goal directives | 18-G `lib/domain/goals.ts:1` | **ADAPT** | `studio/domain/goals.py` | Steering generation by goal |
| Trend-lifecycle directives | 18-G `lib/domain/lifecycle.ts:1` | **ADAPT** | `studio/domain/lifecycle.py` | Timing-aware framing |
| Validation + single retry with errors in prompt | 18-G `lib/ai/validators.ts`, `HookGenerator.ts:35` | **ADAPT** | `studio/capabilities/validation.py` | Output validation, bounded repair |
| Prompt-injection boundary (`sanitizeUserInput`/`wrapUserInput`) | 18-G `lib/prompts/base.ts:19` | **ADAPT** | `app/llm/prompts.py::UNTRUSTED_DATA_PREAMBLE` | Context isolation |
| Prompt version provenance | 18-G `app/api/generate-content/route.ts:108` | **ADAPT** | `studio_generations` provenance columns | "How was this generated?" |
| FakeProvider test harness | 18-G `tests/integration/orchestrator.test.ts:6` | **PORT** | `tests/.../fake_gateway.py` | Deterministic capability tests |
| Idea generation (10 concepts, structured) | 01 `server/langchain/ideaChain.js:45` | **ADAPT** | `studio.capabilities.idea` | Context → ideas |
| AI-buzzword / emoji / em-dash scrubber | 01 `ideaChain.js:126` | **PORT** | `studio/capabilities/hygiene.py` | Output cleanup |
| Schema-driven numeric clamping | 01 `ideaChain.js:139` | **PORT** | `studio/capabilities/validation.py` | Defensive coercion |
| Hook taxonomy (10 mandatory styles) | 03 `src/lib/gemini.ts:9` | **ADAPT** | `studio.capabilities.hook` | Hook variants |
| Deterministic realignment to N slots | 03 `gemini.ts:193` | **PORT** | `studio/capabilities/validation.py` | Guarantees output count |
| Anti-fabrication statistic rule | 03 `gemini.ts:106` | **PORT** | `packages/prompts/studio/hook.v1.json` | Prevents invented numbers |
| Reel script (hook/body/CTA) | 05 `src/agent.py:29` | **ADAPT** | `studio.capabilities.script` | Script generation |
| Model failover + per-attempt timeout | 01 `ideaChain.js:126`, 03 `gemini.ts:148` | **PARK** | LLM Gateway already owns failover | — (Gateway concern) |
| Cover/thumbnail strategy taxonomy | 07 `app/api/generate/route.ts:6` | **ADAPT** | `studio.capabilities.thumbnail` | Thumbnail concepts |
| Three-mode request contract (generate/refine/variations) | 07 `route.ts:20` | **PORT** | Studio capability + refine | Refinement UX |
| Caption generation + variants | 08 `app.py:381` | **ADAPT** | `studio.capabilities.caption` | Caption output |
| Heuristic caption ranker (5 signals) | 08 `app.py:359` | **PORT** | `studio/capabilities/ranking.py` | Suggest best variant |
| Provider fallback + error aggregation | 08 `app.py:333` | **PARK** | Gateway owns provider policy | — (Gateway concern) |
| LLM output shape coercion | 08 `app.py:81` | **PORT** | `studio/capabilities/validation.py` | Salvage malformed JSON |
| CTA kits per placement | 09 `src/components/Studio.tsx:70` | **REBUILD** | `studio.capabilities.cta` | CTA suggestions |
| CTA freshness / anti-repetition | 09 `tests/strategy.test.ts` | **REBUILD** | `studio/capabilities/cta.py` | Slot ordering |
| Research brief (facts + angles + sources) | 12 `src/services/researchService.ts:1116` | **PARK** | Belongs to a later research phase | — |
| Content repurposing (fan-out per platform) | 02 `backend/chains/orchestrator.py:65` | **ADAPT** | `studio.capabilities.repurpose` | One source → many formats |
| Per-platform prompt rules (LinkedIn/X/IG) | 02 `backend/chains/{linkedin,x,instagram}.py` | **ADAPT** | `studio/domain/platforms.py` | Format constraints |
| Export to Markdown/CSV | 18 `lib/export.ts:3` | **PARK** | Belongs to distribution/library | — |
| Local persistence (localStorage) | 01, 09, 12, 18 `lib/storage.ts` | **PARK** | Platform DB + RLS replaces it | — |
| Supabase auth + per-module DB | 18-G `lib/db/*`, `middleware.ts` | **PARK** | Platform Supabase Auth + RLS | — |
| Trend ingestion (Google Trends RSS) | 18-G `lib/trends/ingest.ts:5` | **PARK** | Belongs to Growth phase | — |
| AI Creative Producer | 22 | **PARK** | Phase 4 (explicitly out of scope) | — |

---

## 3. Platform-owned components (no donor equivalent)

These are **NEW** — Studio requires them and no donor provides a usable version.

| Component | Purpose |
|---|---|
| `studio/session.py` | Server-persisted Studio session lifecycle (create/advance/close) |
| `studio/context.py` | `ContextAssembler` — the single creator-context builder |
| `studio/registry.py` | `CapabilityRegistry` + `StudioCapability` contract |
| `studio/orchestrator.py` | `StudioOrchestrator` — session planning and staged execution |
| `studio/persistence.py` | Generation/version persistence + provenance |
| `studio/api/schemas.py` | Pydantic request/response contracts for the Studio API |
| `studio/safety.py` | Prompt-injection hardening for creator-supplied and retrieved text |
| Studio UI | Unified workspace (sessions, workflow rail, workspace, context bar) |
| AI evaluation scenarios | 24 Studio scenarios on the Phase 2 evaluation framework |

---

## 4. Explicitly rejected donor infrastructure

Per the donor principle, Studio does **not** adopt:

| Rejected | Reason |
|---|---|
| Donor Gemini/Anthropic SDK calls | All Studio LLM access goes through `LLMGateway` |
| Hardcoded model names (`gemini-3.x`, `claude-opus-5`, …) | Platform routing owns model selection; several donor names do not exist |
| Donor `localStorage` state | Server state belongs in PostgreSQL under RLS |
| Donor Supabase auth + service-role DB | Platform owns auth; Studio must not bypass RLS with a service key |
| Donor prompts inline in code | Centralized under `packages/prompts/` |
| Donor per-module frontends | One Studio UI |
| Module 12 fabricated statistics | `researchService.ts:246` returns invented numbers with fake citations — **not ported** |
| Module 09 missing `lib/` tree | Gitignored in the donor; only contracts survive, so logic is REBUILT |

---

## 5. Data model

| Table | Owner | Why it exists |
|---|---|---|
| `studio_sessions` | creator | No existing table models a multi-step workspace session |
| `studio_generations` | creator | Version history + provenance per generation |
| `content_assets` | creator | **Reused** for generated content bodies (no second asset store) |
| `chunks` | creator | **Reused** by Memory Engine only; Studio never embeds directly |

Studio deliberately does **not** add an embeddings, memory, voice, job, or prompt
table — Phase 2 already owns all of those.

---

## 6. Dependency direction

```text
Studio API  →  StudioOrchestrator  →  CapabilityRegistry  →  StudioCapability
                                       ↓
                                  ContextAssembler
                                    ↓        ↓
                          LongTermMemory   VoiceEngine      (Phase 2 services)
                                    ↓
                              LLM Gateway                        (Phase 2)
                                    ↓
                              PostgreSQL + RLS
```

Studio imports **no** donor module code at runtime. Donor logic is adapted by
reading it and reimplementing against platform contracts; `modules/` stays
read-only and untouched.
