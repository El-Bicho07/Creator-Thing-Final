# Stage 8 — Frontend Application

> **Wave W3 · runs in parallel with Stage 7 and Stage 9.**
> Copy this entire file as the first message of a fresh session.

---

## Role & mission

You are assembling ContentYou's application screens in `apps/web` from the design system
Stage 1 built: idea capture, the live run timeline, plan review, the artifact workspace, the
calendar, analytics and settings.

The product's whole promise lives or dies on one screen:

> *"I don't want the webapp to ask the user a lot of options while starting out. Just a
> simple text box, that asks what's the core Idea."*

One text box. Nothing beside it. Refinement questions come **after** the idea is captured,
never before (`CLAUDE.md` §7). Resist every instinct to add a dropdown to that screen.

The second thing to get right: **a run takes minutes**. A spinner for four minutes is a
broken product. The run timeline must make waiting feel like watching research happen — show
sources as they are found, show the critic revising, and show pacing waits explicitly
("waiting 12s for rate limit") rather than appearing frozen.

---

## Wave & siblings

Running **now, in parallel**: Stage 7 (scheduling) and Stage 9 (feedback).

**You do not wait for either.** You consume `AgentClientPort` (frozen in Stage 0) and build
against **recorded SSE fixtures** — a captured event stream replayed on demand. This is
better than a live agent for UI work anyway: deterministic, instant, and you can replay the
failure cases on demand.

`packages/ui` (Stage 1), `packages/db` (Stage 2) and auth (Stage 3) are all done.

---

## File ownership

- **Own (exclusive write):** `apps/web/app/(app)/**`, `apps/web/app/page.tsx`,
  `apps/web/components/**`, `apps/web/lib/api/**`, `apps/web/app/api/runs/**` (SSE proxy)
- **Read only:** `packages/ui/**`, `packages/schemas/**`, `packages/db/**`,
  `packages/scheduling/**`, `apps/web/lib/auth/**`, `CLAUDE.md`, `docs/`
- **Must not touch:** `packages/ui/**` (Stage 1 — if a component is missing, compose locally
  and note it), `apps/web/lib/auth/**` (Stage 3), `apps/agent/**` (Stages 5, 7, 9),
  `packages/scheduling/**` (Stage 7)

---

## Read first

1. `CLAUDE.md` — **§7 (design language and the one-text-box rule)**, §3.5, §9
2. `docs/ARCHITECTURE.md` — **§8 (frontend)** and **§9 (run sequence)**
3. `apps/web/app/_preview` — the Stage 1 gallery. **Everything you need should be there.**
4. `packages/schemas/src/` — `RunEvent`, `Plan`, `Artifact`

---

## Context you can rely on

- **`apps/web` never calls an LLM and never runs long work** (`CLAUDE.md` §3.5, §9). Vercel
  Hobby kills functions at ~10s. You enqueue and you stream.
- **Motion primitives already exist** in `packages/ui` — Lenis, `ScrollReveal`,
  `NumberTicker`, `TiltCard`, etc. Use them; do not rebuild them, and do not add a second
  animation library.
- **The plan review screen is a LangGraph `interrupt()`.** Approving or sending feedback
  resumes a parked graph. Resume is idempotent server-side, but the UI must still prevent
  double-submit.

---

## Deliverables

### 1. Landing — `apps/web/app/page.tsx`

Public. Explains the product honestly — including that publishing is currently assisted
rather than automatic (ADR-004). Do not imply automation that does not exist.

### 2. Idea capture — `apps/web/app/(app)/page.tsx`

**One text box.** `IdeaBox` from `packages/ui`, centred, autofocused. No dropdowns, no
toggles, no "advanced options" — not collapsed, not anywhere.

Submit → create idea + `pipelineRun` → redirect to the run view. This must feel instant; the
work happens in the agent.

### 3. Refinement — `apps/web/app/(app)/idea/[id]/page.tsx`

**After** capture. Optional, skippable in one click, and clearly marked optional: target
audience, inspiration links (reel / Short / article / video), tone, constraints.

Skipping must be as easy as answering. The default path is "type idea, press enter, done."

### 4. Run timeline — `apps/web/app/(app)/run/[runId]/page.tsx`

The screen that carries the multi-minute wait. Live over SSE, using `Timeline` from
`packages/ui`:

- each node as it starts and finishes
- **sources appearing as they are found**, with title and domain, clickable — this is the
  verifiability promise made visible, and it is the most reassuring thing on the screen
- **pacing waits shown explicitly** ("waiting 12s — free tier rate limit"), never a bare
  spinner
- critic revisions, with what is being improved
- artifacts completing one by one

**Reconnect with replay** from the last sequence number. **Fall back to polling** if SSE
fails. A closed laptop lid must not lose the run.

### 5. Plan review — `apps/web/app/(app)/run/[runId]/plan/page.tsx`

The human-in-the-loop gate, and the most information-dense screen in the app:

- the plan, sectioned, **every claim showing its citations inline** — clickable through to
  the source. A claim without a citation should look visibly wrong.
- flagged gaps surfaced honestly where the critic could not source something
- **Approve** → resume and execute
- **Send feedback** → free-text, resumes re-drafting with research preserved
- **Edit inline** → the edit is captured as a `FeedbackEvent` for Stage 9

Prevent double-submit. Show clearly that approving starts minutes of generation.

### 6. Artifact workspace — `apps/web/app/(app)/artifacts/[runId]/page.tsx`

The six outputs, tabbed by format. Per artifact: the content, edit/morph directions, audio
suggestions, hashtags, suggested post time, production-tool suggestions, and
**provenance** — which plan claims it came from.

Copy-to-clipboard per field (this is how people will actually use it), inline editing, and
export.

### 7. Calendar — `apps/web/app/(app)/calendar/page.tsx`

Month and week views from `packages/ui`'s `Calendar`. Scheduled entries by platform,
drag-to-reschedule, per-entry manual-export bundle download, and the publish checklist.

Be honest in the UI about what is automated (calendar, reminders, bundles) and what the
creator does themselves (the actual posting).

### 8. Analytics — `apps/web/app/(app)/analytics/page.tsx`

What performed, by format and over time. Use `NumberTicker` for headline figures.

**Empty state matters more than the charts here** — most users will have no data for weeks.
Say what will appear and when, rather than showing zeroes.

### 9. Settings — `apps/web/app/(app)/settings/page.tsx`

Profile and niche, linked social accounts (Stage 3's panel), calendar provider, quiet hours,
theme, and **usage/budget** — how many runs remain today under the free-tier cap. That last
one prevents the worst experience in the product: starting a run that cannot finish.

### 10. SSE proxy — `apps/web/app/api/runs/[runId]/events/route.ts`

Proxy the agent's stream so the browser holds one same-origin connection. Auth-checked,
schema-validated, pass-through only. **No business logic, no LLM calls** — this is a pipe.

---

## Constraints & guardrails

- **Never add a field to the idea-capture screen** (`CLAUDE.md` §7).
- **Never call an LLM from `apps/web`** (§9). Every AI operation goes through the agent.
- **Never do long work in a route handler** — ~10s cap.
- **Do not edit `packages/ui`.** Missing something? Compose locally and note it.
- **Do not add a second animation library.**
- Server Components by default; `"use client"` only where interaction requires it.
- Every screen needs a real loading, empty and error state. Empty states are not optional
  polish in a product where a new user has nothing.
- Keyboard-navigable throughout; visible focus; WCAG AA (Stage 1's contrast table holds).
- Works at 375px with no horizontal scroll.

---

## Acceptance criteria

Run each; paste actual output into `docs/checkpoints.md` under Stage 8's Evidence log.

```bash
pnpm typecheck --filter web
pnpm lint --filter web
pnpm test --filter web
pnpm build --filter web      # must succeed — catches Server/Client boundary errors
pnpm dev --filter web
```

- [ ] **Idea screen contains exactly one input.** Assert it in a test — this is the rule
      most likely to erode over time.
- [ ] Idea → run creation → redirect works; the response is fast (no agent call in the path).
- [ ] Refinement is skippable in one click.
- [ ] **Timeline renders a full recorded fixture stream** end to end.
- [ ] **Sources appear progressively** and link to real URLs.
- [ ] **Pacing waits are shown as pacing**, not as a generic spinner.
- [ ] **SSE reconnect**: kill the connection mid-stream → reconnects and replays from
      `lastSeq` with no duplicates and no gaps.
- [ ] **Polling fallback** works with SSE disabled.
- [ ] **Plan review shows citations inline**, each resolving to its source.
- [ ] **Double-click Approve submits once.**
- [ ] Feedback submission is captured as a `FeedbackEvent`.
- [ ] Artifact workspace shows all six formats with provenance; copy-to-clipboard works.
- [ ] Calendar renders entries, drag-to-reschedule persists.
- [ ] Every screen has loading, empty and error states — **screenshot the empty states** as
      evidence.
- [ ] Settings shows remaining daily run budget.
- [ ] **375px**: no horizontal scroll on any screen.
- [ ] **Keyboard-only**: complete idea → run → plan review without a mouse.
- [ ] Unauthenticated access to any `/app` route redirects to sign-in.

---

## Checkpoint update

Tick Stage 8's boxes in `docs/checkpoints.md`, paste evidence, run `pnpm checkpoints`. Write
**only** Stage 8's section.

---

## Out of scope

Design system components (Stage 1) · agent logic (Stage 5) · scheduling logic (Stage 7) ·
personalization logic (Stage 9) · deployment (Stage 10).

---

## Harness notes

**Claude Code** — invoke `frontend-design:frontend-design` before laying out the timeline and
plan-review screens; they are the two that carry the product. `design:accessibility-review`
before ticking the a11y boxes.

**Antigravity** — no skills. In plain terms: make deliberate layout and hierarchy choices for
the timeline and plan review rather than stacking default cards, and run a keyboard +
contrast + focus pass before claiming done.

**Both** — record an SSE fixture early (a JSON array of `RunEvent`s, including a pacing wait,
a critic revision and an error). It makes this entire stage deterministic and lets you build
the hardest screen without a running agent.
