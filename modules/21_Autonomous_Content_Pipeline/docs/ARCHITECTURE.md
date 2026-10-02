# ContentYou — Architecture

Companion to [`../CLAUDE.md`](../CLAUDE.md). That file holds the rules; this one holds the
shape. Rationale for each choice lives in [`DECISIONS.md`](DECISIONS.md).

---

## 1. Why two processes

A pipeline run performs grounded research, mines viral references, drafts a plan, critiques
it, waits for a human, then generates six artifacts. With free-tier rate limiting
(`CLAUDE.md` §3.1) that is **minutes of wall-clock**, most of it spent deliberately waiting
on a token bucket.

Vercel Hobby kills a function at ~10s. So the system splits:

```
┌──────────────────────────────┐        ┌───────────────────────────────┐
│  apps/web  (Vercel)          │        │  apps/agent  (Render/Railway) │
│                              │        │                               │
│  Next.js App Router          │        │  Fastify + LangGraph.js       │
│  - UI, auth, SSR             │        │  - queue consumer             │
│  - thin BFF / Server Actions │        │  - StateGraph execution       │
│  - SSE proxy to client       │        │  - ALL outbound AI + tool IO  │
│                              │        │                               │
│  never calls an LLM          │        │  always-on, no request timeout│
└──────────────┬───────────────┘        └───────────────┬───────────────┘
               │                                        │
               │        ┌───────────────────────┐       │
               └───────▶│   MongoDB Atlas (M0)  │◀──────┘
                        │  data + job queue +   │
                        │  LangGraph checkpoints│
                        └───────────────────────┘
```

Mongo is the only thing both processes touch. There is no direct RPC from web to agent for
starting work — the queue *is* the interface. (Web does open one HTTP connection to agent,
for SSE progress streaming; if agent is unreachable the UI degrades to polling `pipelineRuns`.)

---

## 2. Repository layout

```
contentyou/
├── apps/
│   ├── web/                 Next.js App Router
│   └── agent/               Fastify worker, LangGraph host
├── packages/
│   ├── schemas/             Zod entities + ports + mocks   ← keystone, frozen in Stage 0
│   ├── ai/                  model gateway, limiter, cache, budget governor
│   ├── skills/              one declarative module per content format
│   ├── db/                  Mongo client, collections, indexes, migrations
│   ├── scheduling/          best-time engine, PublishingPort adapters
│   ├── config/              Zod-validated env, composed from fragments
│   └── ui/                  design system, Lenis/Motion primitives, shadcn
├── docs/
│   ├── ARCHITECTURE.md      this file
│   ├── DECISIONS.md
│   ├── checkpoints.md       progress tracker
│   └── prompts/             stage-00 … stage-11
├── scripts/checkpoints.mjs
├── CLAUDE.md
└── PS.md
```

### Dependency direction

```
        ┌─────────────┐
        │   schemas   │   depends on nothing (except zod)
        └──────┬──────┘
   ┌───────┬───┴────┬─────────┬──────────┐
   ▼       ▼        ▼         ▼          ▼
 config   db       ai     scheduling    ui
           │        │         │
           └────┬───┴─────────┘
                ▼
             skills
                │
     ┌──────────┴──────────┐
     ▼                     ▼
  apps/agent           apps/web
```

Strictly acyclic. `schemas` never imports another workspace package. Nothing imports `apps/*`.

---

## 3. `packages/schemas` — the keystone

This package exists to make parallel development possible. It is frozen in Stage 0, before
any implementation, and contains three things:

**1. Entities** — the Zod schema for every persisted or transported object. Types are always
`z.infer<typeof X>`, never hand-written alongside.

**2. Port interfaces** — the seams between packages that different stages build simultaneously:

| Port | Defined for | Real impl lands in |
|---|---|---|
| `UsageLedgerPort` | `ai` records spend without importing `db` | Stage 2 |
| `ResearchCachePort` | `ai` caches search results without importing `db` | Stage 2 |
| `SkillRegistryPort` | graph (Stage 5) invokes skills built in parallel (Stage 6) | Stage 6 |
| `PublishingPort` | scheduling swaps manual export ↔ Instagram | Stage 7 / 11 |
| `AgentClientPort` | `web` talks to the agent; lets UI build against fixtures | Stage 5 |
| `LlmPort` | `skills` calls a model without importing `ai` | Stage 4 |
| `ProfileMemoryPort` | graph reads/writes creator memory | Stage 9 |

**3. A mock for every port**, exported from `@contentyou/schemas/mocks`. Deterministic,
in-memory, no network, no clock dependence. These are what let Stage 6 be written before
Stage 4 finishes and Stage 8 be written before Stage 5 finishes.

> **Rule.** If you find yourself blocked waiting on another package, you have found a
> missing port. Add the interface + mock to `schemas` and keep moving — do not import the
> other package's internals.

---

## 4. Data model

MongoDB, normalized, references over embedding except where a sub-document is never queried
independently.

| Collection | Holds | Key indexes |
|---|---|---|
| `users` | account identity (Better Auth owns the shape) | `email` unique |
| `sessions`, `accounts` | Better Auth session + OAuth identity | per Better Auth |
| `socialAccounts` | linked IG/YT/LI/X, **AES-256-GCM encrypted** tokens, scopes, expiry | `{userId, platform}` unique |
| `creatorProfiles` | niche, goals, audience, voice, workstyle, learned preferences | `userId` unique |
| `ideas` | raw core idea + optional refinement answers | `{userId, createdAt}` |
| `pipelineRuns` | run state machine, `threadId`, queue fields, timings, cost | `{status, claimedAt}`, `{userId, createdAt}` |
| `runEvents` | append-only progress log, streamed to UI over SSE | `{runId, seq}` |
| `researchDocs` | retrieved sources: url, title, snippet, retrievedAt, **citation id** | `{runId}` |
| `researchCache` | normalized-query → result, **TTL index** | `queryHash` unique, `expiresAt` TTL |
| `plans` | versioned plan, each claim carrying `citationIds`, critic scores | `{runId, version}` |
| `artifacts` | discriminated union by `format`, the generated content | `{runId, format}` |
| `scheduleEntries` | what posts where and when, status, calendar event id | `{userId, scheduledFor}` |
| `publications` | what actually went out + engagement samples over time | `{userId, publishedAt}` |
| `feedbackEvents` | explicit edits/ratings + implicit engagement signals | `{userId, createdAt}` |
| `usageLedger` | per-user per-day API spend and quota consumption | `{userId, day}` unique |
| `checkpoints` (LangGraph) | graph state snapshots | managed by the checkpointer |

Media never lives in Mongo (§3.6 of `CLAUDE.md`) — only references.

### The citation chain

This is the mechanism behind the verifiable-sourcing promise:

```
grounded search → researchDocs[] (each gets a stable citationId)
                     ↓
plan.sections[].claims[].citationIds ──▶ resolvable to researchDocs
                     ↓
artifact.provenance.planClaimIds ──────▶ resolvable back to the plan claim
```

Every generated assertion can be walked back to a URL that was actually fetched. A plan
claim with an empty `citationIds` array fails validation.

---

## 5. The job queue

No broker. Mongo is enough at this scale and keeps the free-tier footprint at zero.

**Enqueue** (`web`): insert a `pipelineRun` with `status: "queued"`.

**Claim** (`agent`): a single atomic operation, so N workers are safe:

```js
db.pipelineRuns.findOneAndUpdate(
  { status: "queued", claimedAt: { $lt: staleCutoff } },
  { $set: { status: "running", claimedAt: now, workerId } },
  { sort: { createdAt: 1 }, returnDocument: "after" }
)
```

**Heartbeat**: the worker refreshes `claimedAt` while running. A crashed worker's run passes
`staleCutoff` and is reclaimed — and because LangGraph checkpointed it, it **resumes from
the last completed node** rather than restarting.

**States**: `queued → running → awaiting_review → running → completed | failed | cancelled`.
`awaiting_review` is the `interrupt()` park; it consumes no worker.

---

## 6. Agent graphs

### 6.1 Plan graph (Stage 5)

```
normalizeIdea
     ↓
loadProfile ................ creator memory; cold-start defaults if new
     ↓
groundedResearch ........... Gemini Google Search grounding → researchDocs + citations
     ↓
viralReferenceMining ....... YouTube Data API, budgeted 2–3 searches, cached
     ↓
trendSynthesis ............. what is working right now, and why
     ↓
audiencePsychology ......... hooks, retention, emotional drivers for this niche
     ↓
planDraft .................. structured Plan, every claim carrying citationIds
     ↓
planCritic ◀──────┐ ........ scores against a rubric; missing citations = automatic fail
     │            │
     └── revise ──┘ ......... BOUNDED loop, max N (env), then proceed with flagged gaps
     ↓
interrupt() ................ park for human review; run leaves the worker
     ↓
[approve] → execute subgraph      [feedback] → planDraft with feedback injected
```

### 6.2 Execute subgraph (Stage 6)

The six formats are generated through a **sequencer**, not a parallel fan-out — parallel
would 429 immediately on free tier (`CLAUDE.md` §3.1):

```
plan → sequencer ─▶ yt-long ─▶ yt-shorts ─▶ ig-reel ×3 ─▶ linkedin ─▶ x-thread ─▶ captions
                       │           │            │             │           │           │
                       └───────────┴──── each: generate → validate → critic → persist ─┘
                                              ↑
                              token-bucket pacing + 429 backoff + cache
```

Concurrency is a single env knob (`AI_MAX_CONCURRENCY`, default `1`) so it can be raised on
a paid tier without touching graph code.

### 6.3 Refine graph (Stage 9)

`feedbackEvents` (explicit edits/ratings + engagement pulled from `publications`) →
`creatorProfiles` update → available to the next run's `loadProfile`. This is the loop that
closes `PS.md`'s *Refine*.

---

## 7. The model gateway (`packages/ai`)

Every outbound model call goes through one path. Ordered, because the order is the point:

```
request
  → budget governor ....... per-user daily cap; reject early, don't half-run a pipeline
  → cache lookup .......... sha256(provider + model + prompt + schema) → stored response
  → rate limiter .......... per-model token bucket; AWAITS rather than failing
  → provider adapter ...... Gemini (default) | OpenAI (optional, env-selected)
  → structured output ..... Zod schema → provider-native structured output, parse + retry
  → 429 / 5xx handler ..... exponential backoff + jitter; then failover to fallback model
  → usage ledger .......... record tokens, cost estimate, quota units consumed
response
```

Two properties that matter:
- **The limiter waits, it doesn't throw.** On free tier, pacing is normal operation, not an
  error condition.
- **The cache is content-addressed**, so a re-run of an unchanged node costs nothing. This is
  what makes iterating on a single downstream prompt affordable.

Tools are wrapped the same way: `groundedSearch` (Gemini grounding, returns citations) and
`youtubeSearch` (quota-accounted at 100 units/search, cache-first).

---

## 8. Frontend

App Router. Server Components by default; client components only where interaction demands.

```
/                         landing
/app                      ONE text box. Nothing else.
/app/idea/[id]            optional refinement questions (after capture, never before)
/app/run/[runId]          live timeline over SSE
/app/run/[runId]/plan     plan review: approve / edit / send feedback  (the interrupt UI)
/app/artifacts/[runId]    the six outputs, editable, exportable
/app/calendar             month/week schedule view
/app/analytics            what performed, per format
/app/settings             profile, linked accounts, calendar provider, theme
```

**Motion** (`packages/ui`, Stage 1): Lenis smooth scroll plus reusable primitives —
`<ScrollReveal>`, `<ScrollProgress>`, `<MagneticButton>`, `<TiltCard>`, `<NumberTicker>`,
view transitions. Each one respects `prefers-reduced-motion`, and Lenis must be verified
against the three traps: anchor links, focus-on-scroll, and modal scroll-lock.

**SSE**: `web` proxies the agent's event stream so the browser holds one same-origin
connection. Events are `RunEvent` (schema-validated both ends). Fallback is polling
`pipelineRuns` + `runEvents`.

---

## 9. Sequence of one run

```
user types idea
   │
   ▼
web: create idea + pipelineRun{queued}        ── returns immediately, no LLM call
   │
   ▼
agent: claim run ──▶ LangGraph start (threadId = runId)
   │                    │
   │                    ├─ each node: checkpoint written, RunEvent appended
   │                    │
   ▼                    ▼
web: SSE stream ◀───── runEvents          ── user watches research land in real time
   │
   ▼
agent: planCritic passes ──▶ interrupt()  ── run parked, worker freed
   │
   ▼
user reviews plan at /app/run/:id/plan
   │
   ├─ feedback ──▶ resume(feedback) ──▶ planDraft ──▶ critic ──▶ interrupt() again
   │
   └─ approve ───▶ resume(approved)
                      │
                      ▼
              execute subgraph: 6 artifacts, sequenced
                      │
                      ▼
              scheduling: best-time engine → scheduleEntries → calendar sync → notify
                      │
                      ▼
              run{completed}  ── user exports assets + captions + .ics
```

---

## 10. Deployment

| Piece | Host | Free-tier caveat |
|---|---|---|
| `apps/web` | Vercel | ~10s function cap — the reason agent is separate |
| `apps/agent` | Render / Railway / Fly | free instances sleep; queue claim makes that safe (work resumes from checkpoint) |
| MongoDB | Atlas M0 | 512MB; TTL on `researchCache`; no media blobs |
| Secrets | host env only | never in git; `packages/config` validates at boot |

`apps/agent` must expose `/health` for the host's keep-alive, and drain gracefully on
SIGTERM — releasing its claimed run so another worker resumes it from the last checkpoint.
