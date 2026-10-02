# Architecture Decision Records — ContentYou

Short ADRs for the choices that would otherwise get silently reversed by a future session.
Each records what was decided, what it costs, and **what evidence would justify revisiting it**.

Status key: **Accepted** · **Deferred** · **Superseded**

---

## ADR-001 — TypeScript end-to-end for the agent runtime

**Status:** Accepted · **Date:** 2026-09-28

### Context
`PS.md` specifies LangGraph. LangGraph's reference implementation is Python; LangGraph.js is
the TypeScript port. The web app is Next.js either way, so the choice is whether the agent
service is a second language.

### Decision
TypeScript everywhere. `apps/agent` is Node + Fastify hosting LangGraph.js.

### Rationale
- LangGraph.js reached 1.0 GA alongside Python (Oct 2025) with parity on `StateGraph`,
  conditional edges, checkpointers (**including MongoDB**), `interrupt()`, streaming modes,
  subgraphs, and the Store API. The gap that would have forced Python is closed.
- The highest-value asset in this codebase is the **shared Zod contract** in
  `packages/schemas`. In a split-language repo it becomes Pydantic *and* Zod, hand-kept in
  sync, and it drifts. Drift in the artifact schema is drift in the product.
- One toolchain, one test runner, one lint config, one deploy story.

### Consequences
- Accepted cost: LangGraph Python gets new features first. If we need one, we wait or port it.
- Accepted cost: the Python data/ML ecosystem is not directly available. Nothing in the
  current scope needs it.

### Revisit if
We need a LangGraph or LangChain capability that is Python-only and cannot be reimplemented
in a few hundred lines, or we add real ML work (fine-tuning, embeddings at scale, CV on
video frames) rather than API calls.

---

## ADR-002 — Gemini-first, OpenAI optional

**Status:** Accepted · **Date:** 2026-09-28 · **Deviates from `PS.md`**

### Context
`PS.md` says: *"I want to use OpenAI API, for now, as to use free-tier services."* The stated
goal is **free-tier development**; OpenAI is the assumed means to it. The means is wrong:
OpenAI has no usable perpetual free API tier in 2026 — a paid balance is effectively
required. Google Gemini does have a real free tier.

### Decision
`packages/ai` is a provider abstraction. **Gemini is the default provider**; OpenAI is fully
implemented and selectable by env. Model IDs come from env, never hardcoded. The product
owner confirmed this trade explicitly.

### Rationale
- Serves `PS.md`'s actual goal (zero-cost development) rather than its incorrect premise.
- Gemini's **Google Search grounding returns citations** — which is not a cost decision but
  an architectural gift, since `PS.md` requires that plans be verifiable. It removes a whole
  vendor (Tavily/Exa) from the critical path.
- The abstraction means the decision is cheap to reverse; only a default changes.

### Consequences
- Gemini's free tier is **rate-limited, not token-billed** — requests past the limit *fail*.
  This is the single most invasive constraint in the system: it dictates the sequencer in
  the execute subgraph and makes `packages/ai` (Stage 4) a prerequisite of every agent stage.
- Free tier is Flash-only since Pro moved behind billing (May 2026). Prompts must be written
  for a Flash-class model, with a critic pass compensating for the capability gap.

### Revisit if
The project gets a funded API budget. Then flip the default to whichever model wins on the
Stage 10 eval harness — that harness exists precisely to make this a measurement, not a
preference.

---

## ADR-003 — Separate always-on agent worker, not serverless functions

**Status:** Accepted · **Date:** 2026-09-28

### Context
A run performs research, mining, drafting, critique, a human pause, then six generations —
minutes of wall-clock, much of it deliberately waiting on a rate-limit bucket. Vercel Hobby
kills a function at ~10s (~60s with Fluid Compute).

### Decision
Two processes. `apps/web` on Vercel never calls an LLM and never runs long work — it
enqueues and streams. `apps/agent` is an always-on Node service owning LangGraph and every
outbound AI call. MongoDB is the queue.

### Rationale
- The timeout is not tunable on the target tier. No amount of streaming or chunking makes a
  multi-minute rate-limited pipeline fit in a 10s function.
- An always-on process holds the token bucket in memory, which is what makes pacing work.
  Serverless would need a distributed limiter — more moving parts, on a free tier.
- A Mongo-backed queue costs nothing extra: Atlas is already a dependency, and an atomic
  `findOneAndUpdate` is a correct claim primitive for this scale.

### Considered and rejected
- **Inngest / Trigger.dev durable steps** — a real fit on paper, and the free tiers are
  adequate. Rejected because LangGraph's checkpointer and `interrupt()` *already* provide
  durability and human-in-the-loop. Adding one would mean two orchestrators with two
  definitions of "the current step," and the seam between them is where bugs live. Revisit
  only if we need cross-service workflow orchestration beyond a single graph.
- **Vercel Workflows** — plausible, but ties orchestration to one host and duplicates
  LangGraph the same way.

### Consequences
- Two deploy targets instead of one.
- Free-tier hosts sleep idle instances. Mitigated by design: a slept worker's run is
  reclaimed past `staleCutoff` and **resumes from its last checkpoint**, not from scratch.

---

## ADR-004 — Manual-export publishing first; Instagram Graph API deferred

**Status:** Accepted (Stage 11 Deferred) · **Date:** 2026-09-28 · **Deviates from `PS.md`**

### Context
`PS.md` implies autonomy through to posting. Meta gates this: publishing needs a **Business**
account (Creator is not supported), a linked Facebook Page, and approved
`instagram_business_content_publish`, with App Review taking 2–4 weeks and able to reject.
Hashtag research needs the harder **Public Content Access** approval on top.

### Decision
Define a `PublishingPort` interface now. Ship `ManualExportAdapter` in Stage 7 — asset
bundle + caption + `.ics` calendar entry + in-app reminder. `InstagramGraphAdapter` is
Stage 11, behind a feature flag, after approval. **Nothing in stages 0–10 may block on Meta.**

### Rationale
- App Review is unschedulable and externally controlled. Putting it on the critical path
  makes the whole project's timeline a function of someone else's queue.
- The manual path is genuinely useful on day one — the hard part of this product is the
  research, plan and content, not the HTTP POST that publishes it.
- Reviewers want to see a working app. Building the app first *improves* the submission.

### Consequences
- The day-one product is "everything up to the moment of posting," and the UI must be
  honest about that rather than implying automation it does not have.
- Viral-reference mining uses **YouTube Data API** (free, real search, no review needed)
  rather than Instagram hashtag data. Instagram signal is added later if Public Content
  Access is granted.

### Revisit if
Meta approval lands — flip the flag, keep manual export as the fallback for unlinked
accounts and unsupported media.

---

## ADR-005 — Contract-first parallelism with exclusive file ownership

**Status:** Accepted · **Date:** 2026-09-28

### Context
Requested directly by the product owner: stage prompts must be executable **in parallel**
across separate sessions or worktrees. The natural decomposition is a dependency chain
(schema → gateway → graph → skills → UI), which serializes everything.

### Decision
Three mechanisms, all enforced in the stage prompts:
1. **Contract-first.** Stage 0 freezes `packages/schemas` — every entity, every port
   interface, and a **mock for every port** — before any implementation exists.
2. **Exclusive file ownership.** Each stage declares own / read-only / must-not-touch, scoped
   by package. Shared-file contention is designed out: per-package `package.json`, per-domain
   env fragments, append-only per-stage checkpoint sections.
3. **Waves** with an integration gate between them.

### Rationale
- Dependencies between stages are almost entirely **interface** dependencies, not
  implementation ones. Stage 6 (skills) needs to *call* a model, not to know how the limiter
  works. Naming that seam converts a serial edge into a parallel one.
- Mocks make each track independently testable, which is worth having regardless of
  parallelism — it is the same discipline as dependency injection, applied at package scope.
- File-ownership tables prevent the actual failure mode of parallel agent sessions: two
  sessions editing one file and silently clobbering each other.

### Consequences
- Up-front cost: Stage 0 is bigger and must be done carefully and **alone**. A sloppy
  contract poisons every parallel track downstream.
- Ports add indirection. Justified where stages are genuinely concurrent; not to be applied
  reflexively everywhere else.
- Integration gates are mandatory. Mocks passing is not evidence the real wiring works —
  Stage 10 exists to prove it.

### Revisit if
The project becomes single-threaded (one person, one session at a time). The ports are still
good design, but the ceremony around ownership could relax.

---

## ADR-006 — The `PS.md` "light mode" palette is an accent ramp, not a light theme

**Status:** Accepted · **Date:** 2026-09-28 · **Deviates from `PS.md`**

### Context
`PS.md` gives two palettes. The dark one (`#06141B → #CCD0CF`) is a correct six-step
background→text ramp. The light one (`#800021 #881144 #243A66 #C24366 #FF69B4`) is five
dark, saturated hues with **no light neutrals** — no page background, no surface, no border.

### Decision
Use the dark ramp exactly as given. Treat the five "light mode" colors as the **brand,
accent and data-visualization ramp**, rendered over neutral light surfaces derived in
Stage 1. All five hex values are preserved exactly.

### Rationale
- Taken literally, `--background: #800021` with `--foreground: #FF69B4` is roughly 2:1
  contrast — it fails WCAG AA (4.5:1 for body text) and is genuinely hard to read.
- The five colors are clearly chosen as a *brand* identity — deep crimson through hot pink
  with a navy anchor. That intent is preserved and better served by using them as accents.
- Stage 1 produces a contrast table as evidence, so this is a measurement rather than a
  taste argument.

### Consequences
- Light mode needs neutrals that are not in `PS.md`. Stage 1 derives them and documents the
  derivation.
- Documented as a deviation in `CLAUDE.md` §8.2 so no future session "restores" the literal
  reading.

### Revisit if
The product owner wants a genuinely dark-crimson light theme. Then the accents need
light-tinted variants, and the contrast table becomes the acceptance criterion.
