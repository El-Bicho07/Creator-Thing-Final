# Stage 2 — Data Layer & Schema

> **Wave W1 · runs in parallel with Stage 1 and Stage 4.**
> Copy this entire file as the first message of a fresh session.

---

## Role & mission

You are building `packages/db`: the MongoDB Atlas layer for ContentYou — collections,
indexes, migrations, repositories, and the job-queue claim primitive that the agent worker
depends on.

Two parts of this stage are load-bearing beyond ordinary CRUD. The **atomic queue claim** is
what makes crashed runs recoverable rather than lost. And you implement the real
`UsageLedgerPort` and `ResearchCachePort` that Stage 4 is, right now, building against as
mocks — so they must match the frozen interfaces exactly.

---

## Wave & siblings

Running **now, in parallel**: Stage 1 (`packages/ui`) and Stage 4 (`packages/ai`).

Stage 4 codes against the **mock** `UsageLedgerPort` and `ResearchCachePort` from
`@contentyou/schemas/mocks`. Your real implementations must satisfy the same interfaces, so
the swap in Stage 10 is a one-line change. **Do not coordinate with Stage 4 and do not edit
`packages/ai`** — the interface is the coordination.

---

## File ownership

- **Own (exclusive write):** `packages/db/**`, `packages/config/src/env/core.ts` (Mongo keys
  only)
- **Read only:** `packages/schemas/**`, `CLAUDE.md`, `docs/`
- **Must not touch:** `packages/ai/**` (Stage 4), `packages/ui/**` (Stage 1),
  `apps/**`, root `package.json`

---

## Read first

1. `CLAUDE.md` — §3.6 (Atlas M0 limits), §5 (conventions), §6 (parallel rules)
2. `docs/ARCHITECTURE.md` — **§4 (data model)** and **§5 (the job queue)**
3. `packages/schemas/src/**` — the entities and ports you are implementing against

---

## Context you can rely on

- **MongoDB Atlas M0**: 512MB, shared CPU. No media blobs — store references only.
  `researchCache` needs a TTL index or it will eat the whole tier.
- **Mongo is also the job queue.** No broker. Correctness rests on one atomic
  `findOneAndUpdate` (see §5 of ARCHITECTURE).
- **Zod is the source of truth.** Schemas are frozen in `packages/schemas`. If one is wrong,
  raise it — **do not fork or redefine it here.**
- **Normalized, references over embedding**, except sub-documents never queried
  independently.

---

## Deliverables

### 1. Connection — `packages/db/src/client.ts`

Singleton client with pooling sized for M0 (small — the free tier has a low connection cap),
retry on transient failure, graceful close on SIGTERM, and a `ping()` health check the agent
worker can expose.

### 2. Collections — `packages/db/src/collections/`

One module per collection from `docs/ARCHITECTURE.md` §4:

`users` · `socialAccounts` · `creatorProfiles` · `ideas` · `pipelineRuns` · `runEvents` ·
`researchDocs` · `researchCache` · `plans` · `artifacts` · `scheduleEntries` ·
`publications` · `feedbackEvents` · `usageLedger`

Each module exports its typed collection accessor and its index definitions. **Every
document is validated through its Zod schema on write.** A write that bypasses validation is
a bug — there is no "trusted" path.

Leave Better Auth's collections (`users`, `sessions`, `accounts`) to Stage 3; define only
what you need to reference them by id.

### 3. Indexes & migrations — `packages/db/src/migrations/`

Idempotent, ordered, re-runnable migrations. A migration that has already run must be a
no-op, and re-running the whole set must be safe. Track applied versions in a `_migrations`
collection.

Indexes at minimum:

| Collection | Index | Why |
|---|---|---|
| `pipelineRuns` | `{status: 1, claimedAt: 1}` | the queue claim query |
| `pipelineRuns` | `{userId: 1, createdAt: -1}` | user's run history |
| `runEvents` | `{runId: 1, seq: 1}` | ordered SSE replay |
| `researchCache` | `{queryHash: 1}` unique | cache lookup |
| `researchCache` | `{expiresAt: 1}` **TTL** | M0 survival |
| `usageLedger` | `{userId: 1, day: 1}` unique | daily budget check |
| `socialAccounts` | `{userId: 1, platform: 1}` unique | one account per platform |
| `artifacts` | `{runId: 1, format: 1}` | artifact workspace |
| `scheduleEntries` | `{userId: 1, scheduledFor: 1}` | calendar view |

Justify each index with the query it serves. On M0 an unused index is wasted budget.

### 4. Queue primitive — `packages/db/src/queue.ts`

This is the most important file in the package. Implement:

- `enqueue(run)` — insert with `status: "queued"`
- `claim(workerId, staleCutoff)` — the atomic `findOneAndUpdate` from ARCHITECTURE §5.
  Must be safe with N concurrent workers: **two workers must never claim the same run.**
- `heartbeat(runId, workerId)` — refresh `claimedAt`; must fail if the run was reclaimed
- `release(runId)` — graceful drain on SIGTERM, returning the run to `queued`
- `complete(runId, result)` / `fail(runId, error)`

State machine: `queued → running → awaiting_review → running → completed | failed | cancelled`.
Enforce legal transitions in code — reject an illegal one rather than writing it.

### 5. Repositories — `packages/db/src/repositories/`

Thin, intention-revealing query methods. No business logic — that belongs to the agent.
Include the real port implementations:

- **`MongoUsageLedger implements UsageLedgerPort`** — atomic per-user-per-day increments
  (use `$inc` with upsert; a read-modify-write will race and over-spend the budget)
- **`MongoResearchCache implements ResearchCachePort`** — content-addressed by normalized
  query hash, TTL-driven expiry

### 6. Seed & fixtures — `packages/db/src/seed.ts`

Realistic dev data: a user, a creator profile, a completed run with plan + six artifacts +
schedule entries. Stage 8 will want this to build UI against, and Stage 10 to smoke-test.

---

## Constraints & guardrails

- **Do not redefine schemas.** Import from `@contentyou/schemas`. If one is wrong, raise it.
- **Do not store media blobs.** References only (§3.6).
- **Do not implement auth.** Stage 3 owns Better Auth. Reference user ids only.
- **Do not put business logic in repositories.** No plan-building, no scoring, no scheduling.
- **No `any`.** Mongo's driver types are awkward; solve that with generics, not escapes.
- Every write path validates through Zod first.
- Dependencies go in `packages/db/package.json`, justified.

---

## Acceptance criteria

Run each; paste actual output into `docs/checkpoints.md` under Stage 2's Evidence log.

```bash
pnpm typecheck --filter @contentyou/db
pnpm lint --filter @contentyou/db
pnpm test --filter @contentyou/db
```

Tests should run against **`mongodb-memory-server`** so CI needs no live Atlas.

- [ ] **Concurrent claim test**: 10 simultaneous `claim()` calls against 1 queued run →
      exactly one succeeds, nine get null. This is the correctness heart of the queue —
      write it first.
- [ ] **Stale reclaim test**: a claimed run whose `claimedAt` is older than the cutoff is
      reclaimable; a fresh one is not.
- [ ] **Heartbeat test**: `heartbeat()` fails after the run has been reclaimed by another
      worker.
- [ ] **Illegal transition test**: `completed → running` is rejected.
- [ ] **Migration idempotence**: run the full set twice; second run is a no-op and the index
      list is identical.
- [ ] **TTL index exists** on `researchCache.expiresAt`, verified by reading back
      `listIndexes()` output.
- [ ] **Ledger concurrency test**: 50 concurrent increments → the total is exactly 50 (proves
      `$inc`, not read-modify-write).
- [ ] **Port conformance test**: `MongoUsageLedger` and `MongoResearchCache` pass the same
      test suite as their mocks from `@contentyou/schemas/mocks`. Write the suite once, run
      it against both — this is what guarantees the Stage 10 swap works.
- [ ] Zod validation rejects a malformed document on every write path.

---

## Checkpoint update

Tick Stage 2's boxes in `docs/checkpoints.md`, paste evidence, run `pnpm checkpoints`. Write
**only** Stage 2's section.

---

## Out of scope

Auth collections' shape (Stage 3) · LLM usage accounting *policy* — you store, Stage 4
decides (Stage 4) · graph checkpointer wiring (Stage 5) · calendar sync (Stage 7) · UI
queries (Stage 8).

---

## Harness notes

**Claude Code** — `superpowers:test-driven-development` fits this stage unusually well. Write
the concurrent-claim test first and watch it fail; a queue claim that looks correct and is
not is the classic way this breaks.

**Antigravity** — no skills. In plain terms: write each concurrency test before the
implementation, confirm it fails for the right reason, then implement.

**Both** — `mongodb-memory-server` keeps this stage offline-capable. You should not need a
live Atlas cluster to finish or verify it.
