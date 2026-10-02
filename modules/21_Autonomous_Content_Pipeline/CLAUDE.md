# CLAUDE.md — ContentYou

Guidance for Claude Code / Antigravity sessions working in this repository.

> **Read this file first, every session.** It contains decisions that were expensive to
> derive and that you must not silently re-litigate. If you believe a decision here is
> wrong, say so explicitly and ask — do not quietly do something else.

---

## 1. What this is

**ContentYou** is an autonomous content pipeline. A creator types **one core idea** into a
single text box. The system then runs, with minimal further input:

```
Idea → Research → Plan → Execute → Refine
```

and produces a YouTube script, 3 Instagram Reels, a LinkedIn post, an X thread, captions,
and a populated publishing calendar.

The source specification is [`PS.md`](PS.md). It is the product owner's words and is
authoritative on **intent**. Where this file deviates from it, the deviation is listed in
§8 with a reason. Nowhere else may deviate silently.

Instagram is the first target platform. YouTube is next. The product is a web app now,
cross-platform later.

### The two things that make this defensible

Everything else is commodity. Protect these two:

1. **Verifiable sourcing.** Every claim in a generated plan carries a citation to a real
   source found at runtime. A plan that asserts "hooks under 3 seconds perform best" with
   no source is a bug, not a style preference.
2. **Per-creator memory.** The creator's niche, goals, workstyle, voice, and *what actually
   performed for them* accumulate in `creatorProfiles` and feed every subsequent run. This
   is what makes the product hard to leave.

---

## 2. Locked decisions

These were decided with the product owner. Do not change them without asking.

| Decision | Choice | Why |
|---|---|---|
| Language | **TypeScript end-to-end** | One language across web + agent; Zod artifact schemas shared by both. LangGraph.js reached parity with Python (1.0 GA, Oct 2025) including the MongoDB checkpointer. |
| LLM provider | **Gemini-first, OpenAI optional** | Gemini has a genuinely free tier; OpenAI does not (see §8.1). |
| Agent runtime | **Separate always-on Node worker**, not a Next.js route | Vercel Hobby caps functions at ~10s; a run takes minutes (§3.5). |
| Orchestration | **LangGraph.js only** — no Inngest/Trigger.dev | LangGraph's checkpointer + `interrupt()` already give durability and human-in-the-loop. A second orchestrator would duplicate it. |
| Instagram publishing | **Manual-export first**, Graph API later behind a flag | Meta App Review takes 2–4 weeks and can reject. Nothing in stages 0–10 may block on it. |
| Database | **MongoDB Atlas free tier**, normalized | From `PS.md`. |
| Auth | **Better Auth** | Runs in-process, MongoDB-native, and holds third-party social tokens — which a hosted auth provider makes awkward. |
| Parallelism | **Contract-first + exclusive file ownership** | Lets multiple stages be implemented simultaneously in separate sessions (§6). |

---

## 3. Hard constraints

These are physical limits of the free-tier services. Violating them does not make the app
slow — it makes it **fail**. Every number here carries its source and must be
**re-verified against live docs at implementation time**; free-tier quotas move.

### 3.1 Gemini free tier is rate-limited, not token-billed
Approx. Flash-Lite 15 RPM / 1,000 RPD; Flash 10 RPM / 250 RPD. Pro moved behind billing in
May 2026 — the free tier is Flash-only. **Requests past the limit fail rather than bill.**

One full pipeline run is ~10–14 LLM calls → roughly **20–30 runs/day** on free tier.

**Consequence, and this is the important one:** the six content generators **must not** fan
out in parallel. They run through a rate-limit-aware sequencer with token-bucket pacing,
429 backoff, and a response cache. This is why `packages/ai` (Stage 4) is built *before*
any agent graph.
Source: https://ai.google.dev/gemini-api/docs/rate-limits

### 3.2 Gemini Google Search grounding — ~5,000 free searches/month on 3.x, with citations
This is the primary research tool. It satisfies the verifiable-sourcing requirement with no
extra vendor. Tavily/Exa are optional secondaries only.
Source: https://ai.google.dev/gemini-api/docs/google-search

### 3.3 YouTube Data API — `search` costs 100 units of a 10,000/day cap
≈100 searches/day total, and extra quota is **granted by application, not purchasable**.
Budget 2–3 searches per run, cache per normalized topic with a TTL.
Source: https://developers.google.com/youtube/v3/determine_quota_cost

### 3.4 Instagram requires Meta App Review
Publishing needs a **Business** account (Creator accounts are not supported), a linked
Facebook Page, and approved `instagram_business_content_publish`. Review takes 2–4 weeks.
Hashtag research (`ig_hashtag_search` → `top_media`) needs the harder **Public Content
Access** approval and is capped at 30 unique hashtags / 7 days and 200 req/hr.
Reels eligibility: 9:16, 5–90 seconds. Publishing is a two-step container → publish call.
Source: https://developers.facebook.com/docs/instagram-platform/content-publishing

### 3.5 Vercel Hobby caps a function at ~10s (≈60s with Fluid Compute)
`apps/web` therefore **never** calls an LLM and **never** runs long work. It enqueues and
streams. All AI work lives in `apps/agent`.
Source: https://vercel.com/docs/functions/limitations

### 3.6 MongoDB Atlas free tier (M0) — 512MB, shared CPU
Do not store media blobs in Mongo. Store references. Keep `researchCache` on a TTL index.

---

## 4. Architecture

```
apps/web       Next.js App Router on Vercel. UI + thin BFF. No LLM calls, no long work.
apps/agent     Node + Fastify, always-on (Render/Railway free tier).
               Owns LangGraph.js, the queue consumer, and every outbound AI/tool call.

packages/schemas     Zod entities + PORT INTERFACES + MOCKS.  <- the keystone
packages/ai          Model gateway: providers, rate limiter, cache, budget governor.
packages/skills      One declarative module per content format.
packages/db          Mongo client, collections, indexes, migrations.
packages/scheduling  Best-time engine, ScheduleEntry generation, PublishingPort adapters.
packages/config      Zod-validated env, composed from per-domain fragments.
packages/ui          Design system, Lenis/Motion primitives, shadcn components.
```

**Run lifecycle.** `web` writes a `pipelineRun` with status `queued` → `agent` claims it via
an atomic `findOneAndUpdate` → LangGraph executes against the MongoDB checkpointer,
appending `RunEvent`s → `web` streams progress over SSE → `interrupt()` at plan review parks
the graph until the user approves or gives feedback → resume → artifacts and schedule
entries persisted.

Full detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
Rationale per choice: [`docs/DECISIONS.md`](docs/DECISIONS.md).

---

## 5. Working in this repo

### Commands
```bash
pnpm install              # install all workspaces
pnpm dev                  # web + agent together (turbo)
pnpm dev --filter web     # just the Next.js app
pnpm dev --filter agent   # just the agent worker
pnpm typecheck            # tsc --noEmit across all packages
pnpm lint
pnpm test                 # vitest
pnpm build
pnpm checkpoints          # recompute docs/checkpoints.md progress roll-up
```

### Conventions
- **TypeScript strict.** No `any`. No non-null `!` assertions without a comment saying why.
- **Zod is the source of truth for every boundary.** Types are `z.infer<>`, never
  hand-written in parallel with a schema.
- **Env access only through `packages/config`.** No bare `process.env` outside it. Config
  validates at boot and fails fast with a readable message.
- **Ports over direct imports** across package boundaries where stages may be built in
  parallel. Depend on the interface in `packages/schemas`; take the implementation by
  injection.
- **Files stay focused.** A file past ~300 lines is usually doing too much; split it.
- **Every dependency is justified** with a one-line reason in that package's
  `package.json` `"dependencyNotes"` field.
- Small, focused commits. Conventional commit prefixes.

---

## 6. Parallel execution rules

Multiple stages are designed to be implemented **simultaneously** in separate sessions or
git worktrees. Three rules make that safe. Follow them exactly.

**1. Contract-first.** `packages/schemas` is frozen in Stage 0 before anything else exists:
all entities, all port interfaces, and a **mock implementation of every port**. No track
ever waits on another track's implementation — it codes against the interface and tests
against the mock.

**2. Exclusive file ownership.** Every stage prompt declares *own / read-only / must-not-touch*.
Ownership is package-scoped. Never edit a file another in-flight stage owns. Contention on
shared files is designed out, not merged:
- Dependencies go in each package's **own** `package.json` — never the root.
- Env vars go in `packages/config/env/<domain>.ts` fragments that a barrel composes. No
  track edits one monolithic env file.
- `docs/checkpoints.md` is **append-only per stage section**; a stage writes only its own.

**3. Waves.** Within a wave, tracks are disjoint and concurrent. A wave ends with an
integration gate before the next opens.

| Wave | Parallel stages | Gate |
|---|---|---|
| W0 | **0** (solo, blocking) | Contracts frozen, mocks green, `pnpm build` passes |
| W1 | **1 · 2 · 4** | Cross-package typecheck |
| W2 | **3 · 5 · 6** | Real impls swapped for mocks; port tests pass |
| W3 | **7 · 8 · 9** | End-to-end run against a live Atlas dev DB |
| W4 | **10** (solo) | Deployed, evals green |
| later | **11** | Needs Meta App Review approval |

Prompts: [`docs/prompts/`](docs/prompts/). Progress: [`docs/checkpoints.md`](docs/checkpoints.md).

---

## 7. Design language

Two palettes come from `PS.md`. **The light one is not a light theme** — see §8.2.

**Dark mode** — a correct bg→text ramp, use as given:
`#06141B` `#11212D` `#253745` `#4A5C6A` `#9BA8AB` `#CCD0CF`

**Brand / accent ramp** (`PS.md` calls this "light mode"):
`#800021` `#881144` `#243A66` `#C24366` `#FF69B4`

Motion is part of the design system, not decoration: **Lenis** smooth scroll plus **Motion**
primitives (scroll-reveal, scroll-linked progress, magnetic/tilt hover, number ticker, view
transitions), each a reusable component in `packages/ui`. Every one of them must:
- respect `prefers-reduced-motion` (reduce to an instant, non-animated state),
- not break anchor links, focus-on-scroll, or modal scroll-lock (the classic Lenis traps).

The entry screen is **one text box**. Optional refinement questions come *after* the idea is
captured, never before. Do not add fields to the first screen.

---

## 8. Deviations from PS.md — read before "fixing" anything

**8.1 — LLM provider: Gemini-first, not OpenAI-first.**
`PS.md` says "OpenAI API, for now, as to use free-tier services." The premise is incorrect:
OpenAI has **no usable perpetual free API tier** in 2026 — a paid balance is effectively
required. Google Gemini does have a real free tier. The product owner confirmed the switch.
OpenAI remains implemented and selectable via env; it is simply not the default.
**Do not "restore" OpenAI as the default.**

**8.2 — The "light mode" palette is an accent ramp, not a light theme.**
All five colors (`#800021 #881144 #243A66 #C24366 #FF69B4`) are dark and saturated. There
are **no light neutrals** — no page background, no surface, no border color. Used literally
as a light theme they produce unreadable text on dark-red surfaces and fail WCAG AA badly.
Treatment: derive neutral light surfaces, and use these five as brand/accent/data colors
over them. The five hex values are preserved exactly as accents.
**Do not set `--background: #800021`.**

**8.3 — Instagram auto-publishing is deferred to Stage 11.**
`PS.md` implies end-to-end autonomy including posting. Meta App Review (§3.4) makes that
unschedulable. Stages 0–10 ship a `PublishingPort` whose `ManualExportAdapter` produces an
asset bundle, the caption, and an `.ics` calendar entry — genuinely useful on day one. The
real adapter lands behind a feature flag after approval.

---

## 9. Never do this

- **Never call an LLM from `apps/web`.** It will time out on Vercel Hobby (§3.5).
- **Never fan out the six content generators in parallel.** It will 429 and fail (§3.1).
- **Never hardcode a model ID, rate limit, quota, or price** from memory or from this file.
  Read it from env, and verify against live docs when implementing.
- **Never invent an engagement number, benchmark, or "best time to post" statistic.** If it
  isn't grounded in a retrieved source or the user's own data, it does not go in a plan.
- **Never store secrets, tokens, or `.env` files in git.** Social tokens are AES-256-GCM
  encrypted at rest.
- **Never store media blobs in MongoDB** (§3.6). Store references.
- **Never edit a file owned by another in-flight stage** (§6).
- **Never tick a checkpoint box without pasting the evidence** into that stage's log.
- **Never scrape Instagram** to route around App Review. Use approved APIs, or the manual
  path.

---

## 10. Status

Pre-Stage-0. The repository currently contains specification and planning documents only —
no application code has been written yet. Start at
[`docs/prompts/stage-00-foundations.md`](docs/prompts/stage-00-foundations.md).
