# Stage 5 — Agent Architecture: Research → Plan

> **Wave W2 · runs in parallel with Stage 3 and Stage 6.**
> Copy this entire file as the first message of a fresh session.

---

## Role & mission

You are building the heart of ContentYou: the LangGraph.js graph in `apps/agent` that turns
one sentence from a creator into a **researched, critiqued, citation-backed plan** — and the
worker that runs it durably.

`PS.md` is unusually specific here, and the specificity is the point:

> *"the source of the plan should be verifiable, and should be done via searching through
> the internet, and finding the best and viral going content on the internet for the given
> idea"*

So the deliverable is not "an LLM writes a content plan." It is a plan where **every claim
traces to a URL that was actually fetched during this run**. A confident, unsourced plan is
a failed run, not a stylistic weakness. Build the graph so that is structurally enforced
rather than merely encouraged.

---

## Wave & siblings

Running **now, in parallel**: Stage 3 (auth) and Stage 6 (skills).

**Stage 6 is building the content-generation skills right now.** You do not wait for it. You
invoke skills through `SkillRegistryPort` and test against the **mock registry** from
`@contentyou/schemas/mocks`. You build the plan graph and the execute subgraph's
*orchestration*; Stage 6 builds what goes *inside* each skill.

You use the **real** `packages/ai` and `packages/db` — both completed in Wave 1.

---

## File ownership

- **Own (exclusive write):** `apps/agent/src/**` (except `src/memory/**` and
  `src/graphs/refine/**`, which are Stage 9's)
- **Read only:** `packages/schemas/**`, `packages/ai/**`, `packages/db/**`, `CLAUDE.md`, `docs/`
- **Must not touch:** `packages/skills/**` (Stage 6), `apps/web/**` (Stages 3, 8),
  `apps/agent/src/memory/**` and `apps/agent/src/graphs/refine/**` (Stage 9)

---

## Read first

1. `CLAUDE.md` — §1 (the two moats), **§3.1 (rate limits)**, §9 (never do this)
2. `docs/ARCHITECTURE.md` — **§5 (queue)**, **§6 (graphs)**, §9 (run sequence)
3. `packages/ai/src/index.ts` — the `LlmPort` surface and the research tools
4. `packages/db/src/queue.ts` — the claim primitive you consume
5. `PS.md` — paragraph 19 onwards, where the plan agent is described

---

## Context you can rely on

- **`packages/ai` handles all pacing, caching, retry and budget.** Call it and let it wait.
  Do not add your own rate limiting, and do not treat a pacing delay as an error.
- **A run takes minutes** and that is fine — this is an always-on worker, not a serverless
  function (`CLAUDE.md` §3.5).
- **MongoDB checkpointer**: every node boundary is a resume point. A crashed worker resumes
  mid-run rather than restarting. Wire this properly; it is most of the durability story.
- **`interrupt()` parks the run** for human plan review, freeing the worker entirely.
- **YouTube search costs 100 quota units.** Budget 2–3 per run (`CLAUDE.md` §3.3).

---

## Deliverables

### 1. Worker — `apps/agent/src/worker.ts`

Fastify service that:
- polls `claim()` from `packages/db` (jittered interval, so multiple workers don't sync up)
- runs the graph for a claimed run
- **heartbeats** while running
- **drains on SIGTERM**: stop claiming, release the current run so another worker resumes it
  from its last checkpoint
- exposes `GET /health` (host keep-alive) and `GET /runs/:id/events` (SSE)

### 2. Graph state — `apps/agent/src/graphs/plan/state.ts`

The `StateGraph` annotation. Every field Zod-typed from `@contentyou/schemas`. Reducers where
nodes append (`researchDocs`, `runEvents`) rather than overwrite.

Keep state **serializable** — it is checkpointed to Mongo. No class instances, no closures,
no live clients in state.

### 3. Nodes — `apps/agent/src/graphs/plan/nodes/`

Per `docs/ARCHITECTURE.md` §6.1. One file each, each independently testable:

| Node | Does | Notes |
|---|---|---|
| `normalizeIdea` | clean the raw idea, extract entities, derive search queries | cheap model |
| `loadProfile` | fetch `CreatorProfile`; sensible cold-start defaults | no LLM if profile exists |
| `groundedResearch` | Gemini grounding → `ResearchDoc[]` **with citationIds** | the verifiability foundation |
| `viralReferenceMining` | YouTube search → high-performing references in this niche | **max 2–3 searches**, cache-first |
| `trendSynthesis` | what is working *now*, and why | must cite |
| `audiencePsychology` | hooks, retention drivers, emotional levers for this audience | must cite |
| `planDraft` | assemble the structured `Plan` | every claim carries `citationIds` |
| `planCritic` | score against a rubric; route to revise or proceed | see below |

**`planCritic` is the quality mechanism, not a formality.** It must:
- **fail any claim with empty `citationIds`** — automatic, non-negotiable
- score specificity, actionability, audience fit, and grounding in the retrieved sources
- loop back to `planDraft` with concrete critique, **bounded** by env (`PLAN_CRITIC_MAX_REVISIONS`,
  default 2 — an unbounded loop will exhaust the daily quota on one run)
- after the bound, proceed with **explicitly flagged gaps** rather than looping or failing.
  A plan that says "I could not source this claim" is more useful than one that fabricates.

### 4. Human-in-the-loop — `apps/agent/src/graphs/plan/review.ts`

`interrupt()` after the critic passes. The run moves to `awaiting_review` and **leaves the
worker**.

Resume handles two paths:
- **approve** → execute subgraph
- **feedback** → back to `planDraft` with the user's words injected, preserving research
  (do **not** re-run grounded search — it is already paid for and cached)

Resume must be **idempotent**: a double-click on Approve must not run the pipeline twice.

### 5. Execute subgraph — `apps/agent/src/graphs/execute/`

**Orchestration only.** The skills themselves are Stage 6's.

Per `docs/ARCHITECTURE.md` §6.2: a **sequencer**, not a parallel fan-out. Parallel will 429
and kill the run (`CLAUDE.md` §3.1, §9).

For each of the six formats: resolve skill from `SkillRegistryPort` → generate → validate
against the artifact schema → critic → persist. A single format failing must **not** kill the
run — record the failure, continue, and report partial success. Losing five good artifacts
because the sixth failed is the worst possible outcome for a user who just spent their daily
quota.

### 6. Run events & SSE — `apps/agent/src/events/`

Append a `RunEvent` at every meaningful transition: node started/finished, source found,
**pacing wait** (so the UI shows "waiting 12s for rate limit" rather than appearing frozen),
critic revision, artifact completed, error.

SSE endpoint supports **replay from a sequence number** so a reconnecting browser doesn't
lose history. Events are schema-validated on the way out.

### 7. Checkpointer — `apps/agent/src/checkpointer.ts`

LangGraph's MongoDB checkpointer, `threadId = runId`. Verify resume actually works — this is
the difference between a durable worker and one that merely looks durable.

---

## Constraints & guardrails

- **Never fan out the six generators in parallel** (§9). Sequenced, `AI_MAX_CONCURRENCY=1`.
- **Never let a plan claim ship without a citation.** Structurally enforced in `planCritic`.
- **Never invent a statistic** (§9). Unsourced → flag the gap, do not fabricate.
- **Never re-run grounded search on a feedback loop** — reuse what's in state.
- **Bound every loop.** Unbounded critique will exhaust a day's quota in one run.
- **Keep graph state serializable.** No clients, classes or closures in state.
- **Do not implement the skills themselves** (Stage 6) or profile learning (Stage 9).
- Do not add rate limiting — `packages/ai` owns it.

---

## Acceptance criteria

Run each; paste actual output into `docs/checkpoints.md` under Stage 5's Evidence log.

```bash
pnpm typecheck --filter agent
pnpm lint --filter agent
pnpm test --filter agent
pnpm dev --filter agent     # /health returns 200
```

Tests use the fake provider from `packages/ai` and `mongodb-memory-server` — no network.

- [ ] **Full graph, fake provider**: idea in → plan out, every claim carrying ≥1 citationId.
- [ ] **Citation enforcement**: inject a draft with an uncited claim → `planCritic` **fails
      it** and routes to revise. Assert it does not pass through.
- [ ] **Critic bound**: a permanently-failing draft stops after `PLAN_CRITIC_MAX_REVISIONS`
      and proceeds with flagged gaps — it neither loops forever nor throws.
- [ ] **Interrupt/resume**: graph parks at review; `awaiting_review` persisted; resume with
      approve continues; resume with feedback re-drafts **without re-running search** (assert
      the search tool call count is unchanged).
- [ ] **Resume idempotence**: resuming twice executes the pipeline once.
- [ ] **Crash recovery**: kill mid-run, restart the worker, confirm it resumes from the last
      checkpoint rather than node 1. Paste the log showing which node it resumed at.
- [ ] **Sequencing**: assert the six generators execute serially, never overlapping.
- [ ] **Partial failure**: force format 3 to fail → other five persist, run reports partial.
- [ ] **YouTube budget**: a full run performs **≤3** searches; a repeated query hits cache.
- [ ] **SSE replay**: reconnect with `lastSeq` and receive only newer events, in order.
- [ ] **Graceful drain**: SIGTERM releases the claimed run; another worker picks it up and
      resumes.
- [ ] **State serializability**: round-trip the checkpointed state through JSON with no loss.

---

## Checkpoint update

Tick Stage 5's boxes in `docs/checkpoints.md`, paste evidence, run `pnpm checkpoints`. Write
**only** Stage 5's section.

---

## Out of scope

Skill prompts and rubrics (Stage 6) · scheduling and best-time (Stage 7) · UI (Stage 8) ·
profile learning and the refine graph (Stage 9) · tracing dashboards and evals (Stage 10).

---

## Harness notes

**Claude Code** — fetch LangGraph.js's current docs for `StateGraph`, `interrupt()` and the
MongoDB checkpointer before writing; the API changed across 0.x→1.0 and writing it from
memory will cost you more time than reading it. `superpowers:test-driven-development` suits
the critic and the resume logic.

**Antigravity** — no skills. In plain terms: read LangGraph.js's live documentation first,
then write the citation-enforcement and resume tests before their implementations.

**Both** — the crash-recovery checkbox needs a real process kill, not a mocked one. That test
is the whole point of the checkpointer; do not simulate it.
