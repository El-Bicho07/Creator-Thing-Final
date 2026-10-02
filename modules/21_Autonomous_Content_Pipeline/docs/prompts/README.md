# Stage Prompts — ContentYou

Twelve self-contained implementation prompts. Each is designed to be **copy-pasted whole**
into a fresh Claude Code or Antigravity session that has never seen this project.

Read [`../../CLAUDE.md`](../../CLAUDE.md) first. It holds the constraints every stage must
respect.

---

## The stages

| # | Wave | Stage | File |
|---|---|---|---|
| 0 | W0 | Foundations, contracts & scaffolding | [`stage-00-foundations.md`](stage-00-foundations.md) |
| 1 | W1 | Design system, theme & motion | [`stage-01-design-system.md`](stage-01-design-system.md) |
| 2 | W1 | Data layer & schema | [`stage-02-data-layer.md`](stage-02-data-layer.md) |
| 4 | W1 | Model gateway & budget governor | [`stage-04-model-gateway.md`](stage-04-model-gateway.md) |
| 3 | W2 | Auth & account linking | [`stage-03-auth.md`](stage-03-auth.md) |
| 5 | W2 | Agent architecture: Research → Plan | [`stage-05-agent-graph.md`](stage-05-agent-graph.md) |
| 6 | W2 | Skill-based content generation | [`stage-06-skills.md`](stage-06-skills.md) |
| 7 | W3 | Scheduling, calendar & publishing port | [`stage-07-scheduling.md`](stage-07-scheduling.md) |
| 8 | W3 | Frontend application | [`stage-08-frontend.md`](stage-08-frontend.md) |
| 9 | W3 | Feedback loop & personalization | [`stage-09-feedback.md`](stage-09-feedback.md) |
| 10 | W4 | Integration, observability, eval & deploy | [`stage-10-integration.md`](stage-10-integration.md) |
| 11 | — | Instagram Graph API publishing *(deferred)* | [`stage-11-instagram.md`](stage-11-instagram.md) |

Stage numbers are **identities, not an order**. Execution order is by wave. Stage 4 runs
before Stage 3 — that is intentional, because Stage 4 blocks two Wave-2 stages and Stage 3
blocks none.

---

## Execution order

```
W0   ┌─────────────────┐
     │   Stage 0       │   SOLO. Blocking. Freezes the contracts.
     └────────┬────────┘
              │  gate: contracts frozen, mocks green, pnpm build passes
     ┌────────┼────────┬──────────────┐
W1   │ Stage 1│ Stage 2│   Stage 4    │   3 sessions in parallel
     │ ui     │ db     │   ai         │
     └────────┴────┬───┴──────────────┘
              │  gate: pnpm typecheck passes across all packages
     ┌────────┼────────┬──────────────┐
W2   │ Stage 3│ Stage 5│   Stage 6    │   3 sessions in parallel
     │ auth   │ graph  │   skills     │
     └────────┴────┬───┴──────────────┘
              │  gate: real impls swapped for mocks; port contract tests pass
     ┌────────┼────────┬──────────────┐
W3   │ Stage 7│ Stage 8│   Stage 9    │   3 sessions in parallel
     │ sched  │ web    │   feedback   │
     └────────┴────┬───┴──────────────┘
              │  gate: one end-to-end run against a live Atlas dev DB
W4   ┌────────┴────────┐
     │   Stage 10      │   SOLO. Wires everything, deploys.
     └─────────────────┘

later  Stage 11 — only after Meta App Review approval
```

---

## Running a wave in parallel

**1. One worktree per track.** Do not run three sessions in one working directory.

```bash
git worktree add ../cy-stage-01 -b stage-01-design-system
git worktree add ../cy-stage-02 -b stage-02-data-layer
git worktree add ../cy-stage-04 -b stage-04-model-gateway
```

**2. One session per worktree.** Paste that stage's prompt file as the first message.

**3. Trust the ownership table.** Every prompt opens with *own / read-only / must-not-touch*.
If a stage needs to change a file it does not own, that is a **design bug** — stop and raise
it rather than editing across the boundary. The usual correct fix is a missing port in
`packages/schemas`.

**4. Merge in any order.** Ownership is disjoint, so the merges should not conflict. A
conflict means an ownership boundary was crossed; find out which and why before resolving.

**5. Run the gate before opening the next wave.** Mocks passing is not evidence the system
works — only the gate is.

---

## Definition of done

A stage is done when **all four** hold. This is deliberately strict, because the failure
mode of agentic implementation is confident completion claims.

1. Every deliverable file exists and does what the prompt says.
2. Every acceptance-criteria command has been **run**, and its **actual output pasted** into
   the stage's Evidence log in [`../checkpoints.md`](../checkpoints.md).
3. Every checkbox in that stage's `checkpoints.md` section is ticked — and no box is ticked
   without its evidence.
4. `pnpm checkpoints` has been run to refresh the roll-up.

> **Never claim a stage is complete from expected output.** Run the command. Paste what it
> actually printed. If something fails, say so with the failure text — a stage at 80% with
> an honest blocker is more useful than one reported done that isn't.

---

## Harness notes

**Claude Code**
- Paste the prompt file's contents as the first message of a fresh session.
- `CLAUDE.md` loads automatically; the prompt's *Read first* list is still worth following.
- Relevant skills exist and are worth invoking when the prompt points at them —
  `superpowers:test-driven-development` (stages 2, 4, 6), `frontend-design:frontend-design`
  (stages 1, 8), `superpowers:using-git-worktrees` (setting up a wave).
- Let it run the acceptance commands itself; that is where the evidence comes from.

**Antigravity**
- Give it the repository root so it can read `CLAUDE.md` and `docs/`.
- It has no Superpowers skills. Where a prompt names one, the prompt also states the
  underlying requirement in plain terms — follow that instead.
- Confirm it can execute shell commands before starting; a stage cannot be completed without
  running its acceptance criteria.

**Either**
- If the session has no network access, stages 4, 5, 6 and 11 cannot be fully verified.
  Implement against mocks, and mark the live-call checkpoints blocked rather than ticked.
- Verify every quoted limit (rate limits, quotas, model IDs) against live docs when you
  implement. The numbers in these documents are snapshots from 2026-09-28 and they move.
