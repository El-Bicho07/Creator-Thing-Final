# Phase 4 Donor Adaptation Report — Modules 04 and 21

**Date:** 2026-10-06
**Rule:** donor modules are capability sources, not architectural authorities.
`modules/` is read-only and unchanged.

This report is the Step 2 gate for Phase 4. It records what each donor actually
provides, what was adapted, and what was rejected. Both audits were done by reading
the donor code, not by reading its documentation — which turned out to matter
(Module 21's own progress document contradicts its stage table).

---

## 1. Headline findings

| Finding | Consequence for Phase 4 |
|---|---|
| **Neither donor contains any prioritization, scoring or ranking algorithm.** | The Producer's ranking is **NEW**. Nothing is ported for it. |
| Module 04's entire logic layer (`src/lib/engine.ts`, `src/lib/storage.ts`) **was deleted by a `lib/` gitignore rule** and is unrecoverable. | Module 04 contributes a *contract*, not logic. Classified **REBUILD**. |
| Module 04 contains a **hardcoded credential** (`1611919`) and a real third party's **PII** (name, email, résumé). | Never ported. Module 04's portfolio half is not product code. |
| Module 04's "best posting time" is a **template string with no data source**. | Rejected. Porting it would inject a fabricated engagement statistic into creator plans. |
| Module 21's `getBestTime()` returns `new Date()` regardless of input — a **fabricated scheduling statistic**. | Rejected explicitly. |
| Module 21 exposes an **unauthenticated, CORS-wildcard** LLM endpoint on port 3001, with a **no-op cost ledger**. | Rejected. Producer runs only through the authenticated platform API + Gateway. |
| Module 21's live path has **no retry, rate limit, cache or budget**, despite four files implementing all four — they are dead code. | Already solved by the platform Gateway. Not reimplemented. |
| Module 21 injects **raw scraped web text** into a prompt with no delimiting, and its `citationIds` check only tests non-emptiness, so citations are forgeable. | Rejected. Producer consumes platform Memory, which is already injection-hardened. |
| Module 21's `PlanClaimSchema` makes `citationIds` **structurally non-optional**. | **PORTED as a pattern**: a Producer recommendation cannot exist without a reason traceable to evidence. |
| Module 21's queue `claim/heartbeat/complete/fail` with `workerId` fencing is **genuinely correct** concurrency control. | Conceptually adapted onto the **existing** platform `JobService`, which already implements it. Not reimplemented. |
| Module 21's LangGraph loop is correctly bounded (max 3 plan generations, 3 critic calls). | The bound is kept in spirit — the Producer is bounded and single-pass, with no autonomous loop. |
| Module 21's `fabricatedStatisticValidator` rejects figures lacking provenance. | **ADAPTED**: the Producer may not assert a fact absent from creator evidence. |

---

## 2. Module 04 — Daily Content Planner

### 2.1 What it actually is

7,318 lines of Next.js 14 / React 18 / Tailwind 3, of which roughly 5,700 lines are
an **unrelated personal portfolio website** for a third party (résumé, filmography,
gallery, contact form). The on-topic planner is four pages and two components over
a **missing** logic layer.

`src/app/page.tsx:8` imports `@/lib/storage` and `@/lib/engine`; `ls src/` returns
only `app components content types`. The module **does not compile**. The cause is
`.gitignore:23` containing `lib/` — a bare pattern that matches `src/lib/` at any
depth, so the files were silently excluded at import. `git log --all` confirms they
were never committed.

### 2.2 Useful capabilities

| Capability | Source | Assessment |
|---|---|---|
| **3-slot day decomposition** | `src/types/index.ts:22` — `SlotType = 'main' \| 'quick' \| 'trust'` | The best idea in the module: a day's plan is one Main Post, one Quick Engage, one Trust Builder. Maps a niche + goal to a *feasible* day rather than an unbounded list. **ADAPTED.** |
| `PlanForm` input contract | `types/index.ts:14` — `{niche, goal, time, tone, platform}` | Close to what the platform already has on `creator_profiles` + Studio capability inputs. **ADAPTED** as the planning parameters, sourced from the platform rather than a form. |
| `PlanItem` output contract | `types/index.ts:29` — title, format, platform, hook, cta, outline, caption, note, done | Partially useful. The content fields (`hook`, `cta`, `outline`, `caption`) are **Studio capability outputs**, not planner outputs. Only `done` survives, as Today state. **PARTIALLY ADAPTED.** |
| `goal` vocabulary | `types/index.ts:2` — subscribers / comments / promote / teach / trust | Five creator goals. Aligns with Studio's goal directives. **ADAPTED** as a closed set. |
| `time` vocabulary | `types/index.ts:4` — 15 min / 45 min / full shoot | A time budget is exactly what Today needs. **ADAPTED.** |
| Bounded streak loop | `src/app/page.tsx:64` — `for (let i = 0; i < 30; i++)` | The only iteration in the module, and it is bounded. **Not needed** (it is a streak display, not planning). |
| `calculateStreak` | `src/app/page.tsx:57` | Retained as a **negative** reference only: it uses UTC dates (wrong for non-UTC creators) and `Math.max(streak, plans.length > 0 ? 1 : 0)`, so it can never return 0 once any plan exists. |

### 2.3 Absent from Module 04

Not implemented, not merely unused:

- **No LLM call anywhere.** Zero AI dependencies in `package.json`. Any LLM logic
  lived in the deleted `engine.ts`.
- **No prioritization, scoring or ranking.** `calculateStreak` is a streak counter.
- **No database.** No ORM, no SQL, no DDL.
- **No prompts** (they were in the deleted `engine.ts`).
- **No persistence implementation** (deleted `storage.ts`).
- **No server, no API, no queue.**

### 2.4 Rejected

| Rejected | Reason |
|---|---|
| Hardcoded password `1611919` gating an admin flag (`src/app/contact/page.tsx:328`) | Security theatre; a client-side string comparison. Never ported. |
| Third-party PII: name, email, résumé, invented internship/award content (`src/content/*`) | Not product code. Porting real people's personal data into the platform would be a serious error. |
| `PlanItem.best` "best posting time" (`src/app/page.tsx` copy formatters) | A template string with **no data source**. Porting it would present a fabricated engagement statistic to the creator as advice — the precise failure the platform's anti-fabrication rules exist to prevent. |
| `salt = Date.now()` seeding (`page.tsx:90`, `history/page.tsx:63`) | Millisecond-collision risk, and randomness is not a substitute for evidence-based prioritisation. |
| The ~5,700-line portfolio half of the module | Unrelated third-party product. |
| `three` / `@react-three/fiber` 3D hero | Irrelevant to planning; heavy. |
| `localStorage` persistence | Platform owns persistence; Today state must be durable and RLS-protected. |

### 2.5 Module 04 classification

| Element | Class | Disposition |
|---|---|---|
| 3-slot day decomposition (`main`/`quick`/`trust`) | **ADAPT** | Became `TodayActionKind` + slot assignment in the Producer's planner |
| `goal` / `time` / `tone` / `platform` vocabulary | **ADAPT** | Became planning parameters, sourced from `creator_profiles` + Studio |
| `Plan` / `PlanItem` contracts | **REBUILD** | Extended the existing `plan_items` table instead of porting a client-side shape |
| Prioritization / scoring | **NEW** | Nothing to port — built from creator evidence |
| Plan generation logic (`engine.ts`) | **PARK** | Unrecoverable; rebuilt against platform services |
| Best-posting-time | **PARK** | Fabricated; would violate anti-fabrication rules |
| Portfolio, PII, 3D, credential gate, localStorage | **PARK** | Rejected |

---

## 3. Module 21 — Autonomous Content Pipeline

### 3.1 What it actually is

1,873 lines across a pnpm/turbo monorepo (`apps/agent`, `apps/web`, `packages/{ai,db,schemas,skills,scheduling,ui,config}`).
Substantially real in **three** places: `packages/schemas/src/entities.ts` (219 lines
of Zod contracts), `apps/agent/src/graphs/plan/index.ts` (150 lines, the only
working graph), `packages/db/src/queue.ts` (50 lines, correct but never wired).
Everything else is a stub (`throw new Error("not implemented: Stage N")`), a mock
returning a hardcoded literal, or an `expect(1).toBe(1)` placeholder test.

`node_modules` was never installed anywhere in this checkout, so nothing in the
module has been typechecked or run.

### 3.2 Useful capabilities

| Capability | Source | Assessment |
|---|---|---|
| **Citation-forcing schema** | `packages/schemas/src/entities.ts:96` — `PlanClaimSchema.refine(v => v.citationIds.length > 0)` | Makes an unsupported claim *structurally impossible*. This is the single best idea in either donor. **ADAPTED**: a `ProducerRecommendation` cannot exist without a reason and an evidence trace. |
| **Fabricated-statistic validator** | `packages/skills/src/validators/index.ts:14` — rejects a `%` figure lacking `provenance.planClaimIds` | **ADAPTED**: the Producer may not assert a fact absent from creator evidence. |
| **Bounded agent loop** | `graphs/plan/index.ts:113-122` — `revisionCount >= 3` terminates | Correct termination discipline. **ADAPAPTED in spirit**: the Producer is single-pass and bounded; it has no autonomous loop at all. |
| **Queue claim/lease with fencing** | `packages/db/src/queue.ts:10` — `claim(workerId, staleCutoff)` atomic findOneAndUpdate, `heartbeat`/`complete`/`fail` guarded on `workerId` | Genuinely correct concurrency control — the module's most portable engineering. **Not reimplemented**: the platform `JobService` already does exactly this (`FOR UPDATE SKIP LOCKED`, retry/fail/cancel). Reused. |
| **Run status vocabulary** | `entities.ts:41` — `queued \| running \| awaiting_review \| completed \| failed \| cancelled` | Sensible. **PARTIALLY ADAPTED** into Today item states (`planned/in_progress/completed/skipped/blocked`) and reused from `jobs`. |
| Stage-event protocol | `RunEvent` discriminated union, `entities.ts:73` | **ADAPPTED** from Studio's `StageTrace`, which already implements the equivalent. |
| Critic-before-approve gate | `graphs/plan/index.ts:84` critic node feeding `shouldRevise` | The plan is not accepted until a critique approves it. **ADAPPTED**: a Producer recommendation carries `confidence` and a `blocked` Today state, and Studio's critique stage remains the quality gate. |

### 3.3 Absent / non-functional in Module 21

- **No prioritization, scoring or ranking.** `getBestTime` (`packages/scheduling/src/best-time/index.ts:2`) returns `{ time: new Date(), tier: 1|2 }` — `time` is *always now*, and `planResearch` is unused.
- **Persistence is unwired.** `packages/db` is imported by no application source;
  `createCheckpointer` and `MongoDBSaver` are defined and never instantiated. The
  running agent persists nothing.
- **No queue.** `worker.ts` starts an empty server on port 3000 and never calls
  `claim`. `enqueue` is never called.
- **No SSE.** `app/api/runs/[runId]/events/route.ts` returns the literal `"data: {}"`.
- **`packages/scheduling/src/index.ts:1` is literally `throw new Error("not implemented: Stage 7")`.**
- **Model IDs do not exist**: `gemini-3.8-flash`, `gemini-3.1-pro`.
- **Tests are placeholders**: `expect(1).toBe(1)` in five suites; the "critic" test
  reads `plan.claims` while `PlanSchema` defines `sections[].claims`.
- **Its progress document contradicts itself**: `docs/checkpoints.md:3` claims
  "Overall: 99% complete — 162/164" from ticked boxes, while its own stage table at
  lines 29-42 shows **0% for all 12 stages**, and all twelve Evidence blocks are the
  empty placeholder `<!-- paste actual command output here -->`. Treated as
  fabricated; not used to scope the port.

### 3.4 Rejected

| Rejected | Reason |
|---|---|
| `packages/ai` — own `@google/genai` client | Duplicates the platform Gateway; hardcoded non-existent model IDs; no retry/limit/cache/budget on the live path. |
| `packages/db` — own MongoDB layer + 8 collections + own migrations + own queue | Duplicates the platform database and job system. Not even used by its own app. |
| `apps/web/src/lib/auth` — Better Auth + mongo adapter + own token crypto + own middleware | Duplicates platform auth. Platform Supabase Auth + RLS is authoritative. |
| `packages/ui` — own Tailwind 4 design system | Duplicates the existing design system. |
| `apps/agent` `POST /plan` with `cors({origin: '*'})` and no auth | Anyone reaching port 3001 spends the platform's provider quota. |
| No-op cost ledger (`recordUsage('system', 0, 0, 1)`) | Cost accounting as theatre. The platform Gateway records real usage. |
| `duck-duck-scrape` with `SafeSearchType.OFF` | Unofficial scraper; ToS/blocking risk; swallows errors so plans get built on zero research while still citing "research context". Producer uses platform Memory instead. |
| Raw scraped text JSON-inlined into the plan prompt (`graphs/plan/index.ts:55`) | Untrusted content with no delimiting. Producer consumes Memory, which is injection-hardened. |
| `citationIds` non-emptiness as the only citation check | Citations are forgeable: nothing verifies the id resolves to a retrieved URL. Phase 4 resolves this — every recommendation's evidence must trace to a real platform record. |
| `getBestTime` returning `new Date()` | A fabricated scheduling statistic presented as advice. |
| `runId: crypto.randomUUID()` (`graphs/plan/index.ts:76`) | Breaks the traceability the whole design depends on. |
| LangSmith upload of full prompts/plans/research (`apps/agent/test-agent.ts:16-18`) | Third-party data exfiltration of creator content. |
| `while (true)` in `packages/ai/src/limiter.ts:16` | Genuinely unbounded loop; currently dead code but a hazard if ever wired. |
| `scaffold.mjs:95-106` overwrites `packages/schemas/src/*` and every `packages/*/src/index.ts` with one-line stubs | Destructive; would destroy the implementation. Never run. |
| `dotenv.config({ path: resolve(cwd, '../../.env') })` (`agent/src/index.ts:7`) | Resolves to `modules/21_.../.env`, which does not exist, so the key falls back to the **ambient environment** — which in this monorepo holds the real Supabase/Gemini/Anthropic/Groq keys. A silent platform-secret exfiltration path. |
| Web app calling the agent synchronously (`apps/web/app/(app)/page.tsx:14`) | Runs a multi-minute LLM pipeline inside a browser request, violating the module's own rule. |

### 3.5 Module 21 classification

| Element | Class | Disposition |
|---|---|---|
| Citation-forcing claim schema | **ADAPT** | `ProducerRecommendation.evidence` is mandatory and validated against real records |
| Fabricated-statistic validator | **ADAPT** | The Producer may not assert a fact absent from creator evidence |
| Bounded loop termination | **ADAPT** | Producer is single-pass, bounded, with no autonomous loop |
| Queue claim/lease/fencing | **REUSE** | Already implemented by the platform `JobService` |
| Stage-event protocol | **REUSE** | Studio `StageTrace` already implements the equivalent |
| Run status vocabulary | **ADAPT** | Today item states; job statuses reused from `jobs` |
| `PipelineRun` entity | **PARK** | The Producer needs a recommendation + Today item, not a pipeline run |
| Plan/research graph | **REBUILD** | Producer plans against platform Memory, not web scraping |
| Scheduling / best-time | **PARK** | Fabricated; also Growth-phase territory |
| Publishing / calendar / social accounts | **PARK** | Distribution is out of Phase 4 scope |
| AI client, Mongo layer, auth, UI package, env path | **PARK** | Rejected duplicated infrastructure |

---

## 4. What Phase 4 therefore builds

Because **neither donor supplies prioritisation**, the Producer's decision layer is
**NEW**, and the only genuinely portable donor assets are *contracts and
constraints*:

1. **Module 04** → the 3-slot day decomposition and the goal/time vocabulary.
2. **Module 21** → the citation/evidence-forcing contract, the anti-fabrication
   rule, and the bounded-loop discipline.
3. **Platform** → everything infrastructural: Gateway, Memory, Voice, Embedding
   Service, Jobs, prompts, RLS, and **Studio for all actual content generation**.

The Producer decides *what should happen*. Studio decides *how content is created*.
No Producer code generates content.
