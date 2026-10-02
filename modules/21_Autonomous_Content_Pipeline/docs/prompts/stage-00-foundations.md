# Stage 0 — Foundations, Contracts & Scaffolding

> **Wave W0 · SOLO · BLOCKING.** No other stage may start until this one passes its gate.
> Copy this entire file as the first message of a fresh session.

---

## Role & mission

You are setting up the ContentYou monorepo from an empty repository. Your job is **the
skeleton and the contracts — no product behaviour**. Nine other stages will be implemented
**in parallel** on top of what you produce, several of them simultaneously in separate
worktrees. Every one of them depends on the interfaces you freeze here.

Take the contracts seriously. A sloppy schema here poisons nine downstream tracks; a good
one lets them all proceed without ever waiting on each other.

---

## Wave & siblings

You run **alone**. Nothing else is in flight. Nothing to mock — you are creating the mocks
that everyone else will use.

---

## File ownership

- **Own (exclusive write):** everything. The repo is empty.
- **Read only:** `PS.md`
- **Must not touch:** nothing exists yet.

---

## Read first

1. `CLAUDE.md` — especially §3 (hard constraints), §5 (conventions), §6 (parallel rules)
2. `docs/ARCHITECTURE.md` — §2 (layout), §3 (the keystone), §4 (data model)
3. `docs/DECISIONS.md` — ADR-001, ADR-005
4. `PS.md` — product intent

---

## Context you can rely on

- **TypeScript end-to-end.** `apps/web` = Next.js App Router. `apps/agent` = Node + Fastify
  hosting LangGraph.js. Two processes because Vercel Hobby caps functions at ~10s and a run
  takes minutes.
- **Gemini is the default LLM provider**, OpenAI optional. Do not install provider SDKs in
  this stage — Stage 4 owns that. You only define the *interface*.
- **MongoDB Atlas free tier** is the database and the job queue.
- **Parallelism is the design constraint of this stage.** Stage 6 must be buildable before
  Stage 4 finishes. Stage 8 must be buildable before Stage 5 finishes. That is only possible
  if you define the seams as ports with working mocks.

---

## Deliverables

### 1. Monorepo skeleton

pnpm workspaces + Turborepo.

```
apps/web                 Next.js App Router, TypeScript, Tailwind. Renders a placeholder page.
apps/agent               Fastify server with GET /health. Nothing else.
packages/schemas         ← the bulk of this stage
packages/config
packages/db              stub: exports types + a connect() that is not yet implemented
packages/ai              stub: exports the LlmPort type only
packages/skills          stub: empty registry
packages/scheduling      stub
packages/ui              stub: exports nothing yet
scripts/checkpoints.mjs
```

Root config: `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json` (**strict: true**),
`.eslintrc`, `.prettierrc`, `vitest.config.ts`, `.gitignore`, `.env.example`, `.editorconfig`.

Root `package.json` scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `checkpoints`.

**Stubs must typecheck and build.** A stub is a real module with real exported types and a
function that throws `new Error("not implemented: Stage N")` — not an empty file.

### 2. `packages/schemas` — entities

Zod schemas for every entity in `docs/ARCHITECTURE.md` §4. Types are **always**
`z.infer<typeof X>` — never hand-written next to a schema.

Required, at minimum:

- `Idea` — core text, optional refinement answers (target audience, inspiration links)
- `CreatorProfile` — niche, goals, audience, voice, workstyle, learned preferences
- `SocialAccount` — platform enum, encrypted token fields, scopes, expiry
- `PipelineRun` — status enum (`queued | running | awaiting_review | completed | failed | cancelled`),
  `threadId`, queue fields (`claimedAt`, `workerId`), timings, cost summary
- `RunEvent` — discriminated union by event type; this is the SSE payload, so it must be
  serializable and versioned
- `ResearchDoc` — url, title, snippet, retrievedAt, **`citationId`** (stable)
- `Plan` — versioned; sections; **every claim carries `citationIds: string[]`**
- `Artifact` — **discriminated union on `format`**: `yt-long | yt-shorts | ig-reel |
  linkedin | x-thread | captions`. Shared base (hook, body, hashtags, tags, suggested post
  time, production-tool suggestions, `provenance.planClaimIds`) plus per-format fields
  (e.g. reels carry edit/morph directions and audio suggestions)
- `ScheduleEntry` — what, where, when, status, calendar event id
- `Publication` — what went out + engagement samples over time
- `FeedbackEvent` — explicit (edit, rating) and implicit (engagement) variants
- `UsageRecord` — per user/day tokens, cost estimate, quota units

**Two validation rules that encode product promises — implement them as refinements:**
- A `Plan` claim with an empty `citationIds` array is **invalid**. Verifiable sourcing is not
  optional (`CLAUDE.md` §1).
- An `Artifact` of format `ig-reel` must carry a duration within Instagram Reels eligibility
  (9:16, 5–90s — `CLAUDE.md` §3.4).

### 3. `packages/schemas` — ports

TypeScript interfaces for each seam (see `docs/ARCHITECTURE.md` §3):

`LlmPort` · `UsageLedgerPort` · `ResearchCachePort` · `SkillRegistryPort` ·
`PublishingPort` · `AgentClientPort` · `ProfileMemoryPort`

Design each one from the **consumer's** point of view, not the implementer's. `LlmPort`
should express "give me a value matching this Zod schema from this prompt" — not "here is a
chat completion request." The consumer should not be able to tell whether it is talking to
Gemini, OpenAI, or a mock.

### 4. `packages/schemas/mocks` — a mock per port

Exported from `@contentyou/schemas/mocks`. Each must be:
- **deterministic** — same input, same output, every time (seed any randomness)
- **in-memory** — no network, no filesystem, no real clock
- **realistic in shape** — a mock `LlmPort` returns a valid instance of the requested Zod
  schema, so a consumer exercises its real parsing path
- **inspectable** — record calls so tests can assert on them

These are the single most important artifact of this stage. Nine tracks build against them.

### 5. `packages/config`

Zod-validated env, **composed from per-domain fragments** so parallel stages never edit one
shared file:

```
packages/config/src/env/core.ts      NODE_ENV, MONGODB_URI, APP_URL   (you write this)
packages/config/src/env/ai.ts        stub — Stage 4 fills it
packages/config/src/env/auth.ts      stub — Stage 3 fills it
packages/config/src/env/social.ts    stub — Stage 7/11 fill it
packages/config/src/env/index.ts     barrel that merges every fragment  (you write this)
```

Validates at import time and **fails fast** with a readable message naming the missing var.
Write `.env.example` with every key, a comment per key, and no real values.

### 6. `scripts/checkpoints.mjs` + `docs/checkpoints.md`

The script parses `- [ ]` / `- [x]` checkboxes per stage section in `docs/checkpoints.md`,
computes per-stage and overall percentages, and **rewrites the header block** (overall %,
ASCII progress bar, per-wave roll-up) in place. Run via `pnpm checkpoints`.

It must be **idempotent** — running twice produces identical output — and must not touch
anything outside the header block and the per-stage `%` cells.

`docs/checkpoints.md` may already exist with the full checklist. If so, **do not rewrite it**
— make your script match its format, and tick only Stage 0's boxes.

### 7. CI

GitHub Actions: install → typecheck → lint → test → build. Must pass on the initial commit.

---

## Constraints & guardrails

- **No product logic.** No LLM calls, no DB queries, no auth, no UI beyond a placeholder.
- **Do not install** `@langchain/*`, `@google/genai`, `openai`, `better-auth`, `mongodb`,
  `lenis`, or `motion`. Later stages own those and will justify them. You install only
  toolchain + `zod`.
- **Every dependency needs a one-line justification** in that package's `package.json`
  `"dependencyNotes"` field.
- **Pin versions.** No `^` or `~` in a new dependency — later stages must get what you tested.
- Dependencies go in the **owning package's** `package.json`, never the root (root gets
  toolchain only).
- `packages/schemas` may depend on **nothing** except `zod`. Check this; it is load-bearing.
- **Verify live before choosing versions.** Next.js, Turborepo and Zod major versions move.
  Check the current stable release rather than trusting any version number written here.

---

## Acceptance criteria

Run each; paste **actual output** into `docs/checkpoints.md` under Stage 0's Evidence log.

```bash
pnpm install                 # completes, no peer-dep errors
pnpm typecheck               # zero errors across every workspace
pnpm lint                    # zero errors
pnpm test                    # all green (incl. the port-mock tests below)
pnpm build                   # web + agent both build
pnpm dev                     # web serves a page; agent /health returns 200
pnpm checkpoints             # rewrites the header; running twice changes nothing
```

Plus, and these matter more than the commands:

- [ ] A test proves **every port has a mock**, and each mock satisfies its interface. Write
      this as a table-driven test so a future port without a mock fails CI.
- [ ] A test proves a `Plan` with an empty-`citationIds` claim **fails** validation.
- [ ] A test proves an out-of-range `ig-reel` duration **fails** validation.
- [ ] A round-trip test per entity: `parse(serialize(x))` deep-equals `x`.
- [ ] `packages/schemas/package.json` has no workspace dependency.
- [ ] Deliberately unset a required env var and confirm the process **exits with a message
      naming that variable** — not a stack trace.

---

## Checkpoint update

Tick Stage 0's boxes in `docs/checkpoints.md`, paste evidence under its Evidence log, and run
`pnpm checkpoints`. Write **only** Stage 0's section.

---

## Out of scope

Real DB (Stage 2) · real model gateway (Stage 4) · auth (Stage 3) · design system and Lenis
(Stage 1) · graphs (Stage 5) · skills (Stage 6) · scheduling (Stage 7) · UI (Stage 8) ·
deployment (Stage 10).

If you catch yourself implementing one of these, stop. Define the port instead.

---

## Harness notes

**Claude Code** — `superpowers:test-driven-development` fits the schema work well: write the
validation test, watch it fail, then write the refinement. The port-mock parity test is
worth writing before the mocks exist.

**Antigravity** — no Superpowers skills. The requirement in plain terms: for each validation
rule and each port, write the test first, confirm it fails for the right reason, then
implement until it passes.

**Both** — verify current stable versions of Next.js, Turborepo, Zod and Vitest against their
live docs before pinning. Do not trust version numbers from memory.

---

## Definition of done

The gate for Wave 0 — all three must hold before any Wave 1 session starts:

1. `pnpm build` passes from a clean clone.
2. Every port has a mock, proven by a test.
3. A developer can read `packages/schemas` and understand the whole data model without
   reading any other package.
