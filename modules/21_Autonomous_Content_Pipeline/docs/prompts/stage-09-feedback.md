# Stage 9 — Feedback Loop & Personalization

> **Wave W3 · runs in parallel with Stage 7 and Stage 8.**
> Copy this entire file as the first message of a fresh session.

---

## Role & mission

You are closing the loop. `PS.md`'s flow is **Idea → Research → Plan → Execute → Refine**,
and you build *Refine* — the part that makes run #20 better than run #1.

> *"the planning needs to be automatically refined based on feedback from the user, and
> should be able to correct itself... information about the user, their goals, and their
> niche, their type of content they prefer, their workstyle, what type of content is working
> for them, the workflow should be stored, which would be used to make the platform get more
> personalised and better, and works well for them, which makes them the platform hard to
> leave."*

That last clause is the business case. This stage is one of the two moats named in
`CLAUDE.md` §1. Everything else in ContentYou could be rebuilt by a competitor in a month;
a creator's accumulated profile could not.

The hard part is not storage. It is **learning the right things** — not overfitting to one
bad day, not drifting into a caricature of the creator, and staying explainable enough that
a user can see and correct what the system believes about them.

---

## Wave & siblings

Running **now, in parallel**: Stage 7 (scheduling) and Stage 8 (frontend).

Stage 7 writes the `publications` records you learn from; Stage 8 captures the explicit
feedback you consume. **Neither blocks you** — both write through schemas frozen in Stage 0,
so build against fixtures.

---

## File ownership

- **Own (exclusive write):** `apps/agent/src/memory/**`, `apps/agent/src/graphs/refine/**`,
  `packages/db/src/repositories/feedback.ts`
- **Read only:** `packages/schemas/**`, the rest of `packages/db/**`, `packages/ai/**`,
  `packages/skills/**`, `apps/agent/src/graphs/plan/**`, `CLAUDE.md`, `docs/`
- **Must not touch:** `apps/agent/src/graphs/plan/**` (Stage 5 — you *read* it and extend via
  `ProfileMemoryPort`), `apps/web/**` (Stage 8), `packages/scheduling/**` (Stage 7)

---

## Read first

1. `CLAUDE.md` — **§1 (the two moats)**, §3.1 (quota — learning must be cheap), §9
2. `docs/ARCHITECTURE.md` — §4 (`creatorProfiles`, `feedbackEvents`, `publications`), §6.3
3. `packages/schemas/src/ports/profile.ts` — `ProfileMemoryPort`, which you implement
4. `apps/agent/src/graphs/plan/nodes/loadProfile.ts` — the consumer of your work

---

## Context you can rely on

- **`loadProfile` already exists** (Stage 5) and reads `CreatorProfile`. You are making what
  it reads progressively richer and more accurate. **Do not modify Stage 5's node** — extend
  through `ProfileMemoryPort`.
- **Quota is scarce** (`CLAUDE.md` §3.1). Prefer deterministic aggregation over LLM calls.
  Use a model only where genuine synthesis is needed, and batch it — do not spend a call per
  feedback event.
- **Never invent engagement statistics** (§9). You learn from *recorded* data or nothing.

---

## Deliverables

### 1. Feedback capture — `apps/agent/src/memory/capture.ts`

Normalize two kinds of signal into `FeedbackEvent`:

**Explicit** — plan edits (**diff what the user changed, which is the highest-signal event in
the entire product** — it is the creator telling you precisely what was wrong), ratings,
rejected suggestions, free-text feedback, artifacts they never exported.

**Implicit** — engagement from `publications` (views, likes, comments, saves, watch-through),
time-to-publish (a piece published in 20 minutes fit them; one that took three days did not),
which formats they actually use.

Weight explicit above implicit. An edit is intent; engagement is noisy.

### 2. Profile memory — `apps/agent/src/memory/profile.ts`

`MongoProfileMemory implements ProfileMemoryPort`. Maintains `CreatorProfile`:

| Dimension | Learned from |
|---|---|
| niche / sub-niche | linked account analysis + topic history |
| voice & tone | plan edits, published copy |
| preferred formats | which artifacts get exported and published |
| workstyle | time-to-publish, edit volume, session rhythm |
| what performs | engagement by format / topic / hook style / post time |
| constraints | blackout windows, production capability, tool preferences |

Four properties this must have, and they matter more than the dimension list:

- **Confidence-weighted.** Every learned value carries a confidence and a sample size.
  `loadProfile` must be able to ignore a belief held from two data points.
- **Decaying.** Recent signal outweighs old. A creator who pivoted niche six months ago is
  not who they were.
- **Explainable.** Every belief stores *why* — which events produced it. Stage 8 will show
  this, and a user must be able to look at "prefers punchy hooks" and see the three edits
  that taught it.
- **Correctable.** A user override wins and is **sticky** — never silently re-learned away.
  Nothing destroys trust faster than a system that quietly reverts a correction.

### 3. Aggregation — `apps/agent/src/memory/aggregate.ts`

Deterministic, **no LLM**: engagement rollups by format/topic/hour, edit-distance on plan
diffs, format usage rates, publish latency.

This is most of the learning, and it is free. Reserve the model for synthesis only.

### 4. Synthesis — `apps/agent/src/memory/synthesize.ts`

The one place a model is justified: turning accumulated signal into qualitative profile
fields (voice description, workstyle summary, what-works narrative).

- **Batched and scheduled** (after N new events, or daily) — never per-event
- grounded strictly in the aggregated data passed in; no speculation beyond it
- output is schema-validated and **diffed against the previous profile**, so a wild swing is
  visible rather than silently applied

### 5. Refine graph — `apps/agent/src/graphs/refine/`

A small graph run after publication data arrives:

```
collectFeedback → aggregate → [enough new signal?] → synthesize → updateProfile → notify
                                      │
                                      └─ no → stop (cheap exit, most runs end here)
```

The early exit is important: most invocations should cost nothing.

### 6. Replan with feedback — `apps/agent/src/memory/replan.ts`

When a user sends feedback at plan review (Stage 5's `interrupt()`), inject it into the
re-draft **and** record it for long-term learning. Feedback should improve *this* plan
immediately and *future* plans gradually.

**Do not re-run grounded search** — research is already paid for and cached.

### 7. "What worked for you" retrieval — `apps/agent/src/memory/retrieve.ts`

The read path stages 5 and 6 consume: given a new idea, retrieve this creator's most relevant
past performance — similar topics, hooks that worked, formats that landed, times that
performed.

Must degrade gracefully to **cold-start defaults** for a brand-new user with no history. The
first run must be good, not apologetic.

---

## Constraints & guardrails

- **Never invent engagement data** (§9). Learn from recorded data or output nothing.
- **Never overwrite a user's explicit override** with a learned value.
- **Never let a single event swing the profile** — confidence and sample size gate every
  update.
- **Never spend an LLM call per feedback event.** Batch; prefer deterministic aggregation.
- **Never modify Stage 5's `loadProfile`** — extend via the port.
- **Never re-run grounded search** on a feedback replan.
- Every learned belief carries its evidence. An unexplainable profile is a bug.
- Cold-start must be handled explicitly, not as an error path.

---

## Acceptance criteria

Run each; paste actual output into `docs/checkpoints.md` under Stage 9's Evidence log.

```bash
pnpm typecheck --filter agent
pnpm lint --filter agent
pnpm test --filter agent
```

- [ ] **Plan-edit diffing** extracts what changed and stores it as a `FeedbackEvent`.
- [ ] **Confidence gating**: a belief from 2 data points is marked low-confidence and
      `loadProfile` ignores it; at N points it becomes active.
- [ ] **Decay**: a 6-month-old signal weighs measurably less than a recent one.
- [ ] **Override stickiness**: user sets voice explicitly → 20 contradicting events →
      **the override still holds**. Assert this directly; it is the trust-critical case.
- [ ] **Explainability**: every learned field returns the evidence that produced it.
- [ ] **No-LLM aggregation**: the aggregation path makes **zero** provider calls (assert the
      fake provider was never invoked).
- [ ] **Batched synthesis**: 50 feedback events produce **one** synthesis call, not 50.
- [ ] **Early exit**: below the signal threshold, the refine graph exits without an LLM call.
- [ ] **Profile diff**: a synthesis that would wildly change the profile is flagged for
      review rather than silently applied.
- [ ] **Cold start**: a brand-new user yields usable defaults and no errors.
- [ ] **Replan preserves research**: feedback replan makes **zero** new search calls.
- [ ] **Retrieval relevance**: given a fixture history, a new idea retrieves the topically
      related past performance, not the most recent.
- [ ] **End-to-end learning**: simulate 10 runs where short hooks outperform → the profile
      reflects it → the next plan's prompt context includes it. Paste the before/after
      profile as evidence.

---

## Checkpoint update

Tick Stage 9's boxes in `docs/checkpoints.md`, paste evidence, run `pnpm checkpoints`. Write
**only** Stage 9's section.

---

## Out of scope

Profile-editing **UI** (Stage 8) · engagement *collection* from platform APIs (Stage 7 writes
`publications`; you read them) · skill prompt changes (Stage 6) · eval harness (Stage 10).

---

## Harness notes

**Claude Code** — `superpowers:test-driven-development` fits the confidence/decay/override
logic well; these are pure functions with sharp edges and are much easier to get right
test-first.

**Antigravity** — no skills. In plain terms: write the override-stickiness and confidence
tests before implementing, using fixed timestamps rather than `now()` so decay is
deterministic.

**Both** — the end-to-end learning checkbox needs a simulated multi-run fixture. Build that
fixture early; it is also what Stage 10's eval harness will reuse.
