# Stage 4 — Model Gateway & Budget Governor

> **Wave W1 · runs in parallel with Stage 1 and Stage 2.**
> Copy this entire file as the first message of a fresh session.

---

## Role & mission

You are building `packages/ai`: the single path through which every outbound model call and
every research tool call in ContentYou travels.

**This is the stage that makes the free tier survivable.** Gemini's free tier is
*rate-limited, not token-billed* — requests past the limit **fail**, they do not bill. A
naive implementation does not run slowly; it 429s and the pipeline dies mid-run. Stages 5
and 6 are both blocked on getting this right, which is why it is built before either.

Two design properties carry most of the weight, and they are easy to get subtly wrong:
**the limiter waits rather than throwing** (pacing is normal operation here, not an error),
and **the cache is content-addressed** (so iterating on one downstream prompt doesn't re-pay
for every upstream node).

---

## Wave & siblings

Running **now, in parallel**: Stage 1 (`packages/ui`) and Stage 2 (`packages/db`).

Stage 2 is writing the real `UsageLedgerPort` and `ResearchCachePort`. **You use the mocks**
from `@contentyou/schemas/mocks` and take both ports by **constructor injection**. Never
import `packages/db`. Stage 10 swaps the mocks for the real implementations and nothing in
your code changes.

---

## File ownership

- **Own (exclusive write):** `packages/ai/**`, `packages/config/src/env/ai.ts`
- **Read only:** `packages/schemas/**`, `CLAUDE.md`, `docs/`
- **Must not touch:** `packages/db/**` (Stage 2), `packages/ui/**` (Stage 1),
  `packages/skills/**` (Stage 6), `apps/**`, root `package.json`

---

## Read first

1. `CLAUDE.md` — **§3.1, §3.2, §3.3 (the quota constraints)** and §9 (never do this)
2. `docs/ARCHITECTURE.md` — **§7 (the model gateway)**
3. `docs/DECISIONS.md` — ADR-002
4. `packages/schemas/src/ports/` — `LlmPort`, `UsageLedgerPort`, `ResearchCachePort`

---

## Context you can rely on

**Gemini is the default provider. OpenAI is implemented but off by default** (ADR-002 —
`PS.md` asked for OpenAI believing it had a free tier; it does not).

The constraints you are engineering around, all of which **you must re-verify against live
docs before implementing** — these are 2026-09-28 snapshots and they move:

| Limit | Approx. value | Consequence for your code |
|---|---|---|
| Gemini Flash-Lite | ~15 RPM / 1,000 RPD | the pacing target for cheap nodes |
| Gemini Flash | ~10 RPM / 250 RPD | ~20–30 full pipeline runs/day |
| Gemini Pro | **not on free tier** since May 2026 | free tier is Flash-only; write prompts for a Flash-class model |
| Google Search grounding | ~5,000 free searches/month on 3.x | the primary research tool, **returns citations** |
| YouTube `search` | **100 quota units** of 10,000/day | ~100 searches/day total, not purchasable |

A full run is ~10–14 LLM calls. Over-limit requests **fail rather than bill**.

---

## Deliverables

Build the pipeline in this order — the order is the design (ARCHITECTURE §7):

```
request
  → budget governor → cache lookup → rate limiter → provider adapter
  → structured output → 429/5xx handler → usage ledger → response
```

### 1. Provider adapters — `packages/ai/src/providers/`

`GeminiProvider` (default) and `OpenAiProvider` (optional), behind one internal interface.

**Model IDs come from env. Never hardcode one** (`CLAUDE.md` §9) — they change, and a
hardcoded id is a silent production break.

Each adapter exposes: text generation, **structured output against a Zod schema** using the
provider's native structured-output mechanism, and token-usage reporting.

### 2. Budget governor — `packages/ai/src/budget.ts`

Runs **first**, before the cache. Checks the per-user daily cap via `UsageLedgerPort` and
rejects **early** — the point is to refuse before starting a pipeline rather than abandoning
one half-finished, which wastes the quota already spent and leaves a confusing partial run.

Caps are env-configured, per user per day, across both token spend and tool quota units.
Surface a structured `BudgetExceededError` carrying what was exceeded and when it resets, so
the UI can say something useful.

### 3. Response cache — `packages/ai/src/cache.ts`

Content-addressed: `sha256(provider + model + prompt + schemaHash + temperature)`. Backed by
`ResearchCachePort` (mock for now).

This is what makes development affordable: re-running a graph after editing one downstream
prompt should re-pay for **only** the changed node. Include a `bypassCache` escape hatch for
deliberate regeneration.

### 4. Rate limiter — `packages/ai/src/limiter.ts`

Per-model **token bucket**, configured from env (RPM and RPD per model).

**It awaits; it does not throw.** On free tier, waiting is correct behaviour, not failure.

- Per-minute *and* per-day buckets — they have different refill semantics, and the daily one
  cannot be waited out within a run.
- A concurrency gate, default **`AI_MAX_CONCURRENCY=1`**. Stage 6 relies on this to sequence
  the six generators. Raising it on a paid tier must require no code change.
- When a wait would exceed a sane ceiling, fail with a clear error rather than hanging — a
  run blocked for an hour is worse than one that fails honestly.
- Emit a wait event so the UI can show "pacing, N seconds" instead of appearing frozen.

### 5. Failure handling — `packages/ai/src/retry.ts`

Exponential backoff **with jitter** on 429 and 5xx. Honour `Retry-After` when present.
Bounded attempts, then failover to the configured fallback model, then fail.

Distinguish **retryable** (429, 503, timeout) from **terminal** (400, 401, safety block,
schema-parse failure after retries). Retrying a terminal error just burns quota.

### 6. Structured output — `packages/ai/src/structured.ts`

`generate<T>(schema: ZodSchema<T>, prompt, opts): Promise<T>`.

Uses the provider's native structured-output support, parses through Zod, and on parse
failure retries **once** with the validation error fed back into the prompt. This single
repair attempt is worth far more than a larger model — Flash-class models mostly fail schemas
in small, self-correctable ways.

### 7. Research tools — `packages/ai/src/tools/`

**`groundedSearch`** — Gemini Google Search grounding. Returns results **with citations**,
mapped into `ResearchDoc` shape with stable `citationId`s. This is the mechanism behind the
product's verifiable-sourcing promise (`CLAUDE.md` §1); citations are not optional metadata.

**`youtubeSearch`** — YouTube Data API v3. **Each search costs 100 quota units.** Therefore:
cache-first on a normalized query, accounted through `UsageLedgerPort`, with a hard per-run
cap (env, default 3). Returns video metadata + statistics for viral-reference mining.

**`webSearch`** (optional, off by default) — Tavily/Exa behind the same interface, as a
secondary when grounding is insufficient.

### 8. The public surface — `packages/ai/src/index.ts`

Export a single `createAiClient({ usageLedger, researchCache, config })` implementing
`LlmPort`. Consumers (stages 5, 6) see **only** the port. They must not be able to tell
which provider is behind it — that is what makes ADR-002 reversible.

---

## Constraints & guardrails

- **Never import `packages/db`.** Ports by injection, always.
- **Never hardcode** a model id, rate limit, quota cost, or price. All env-driven.
- **Re-verify every quota number above against live docs** before you implement. If reality
  differs from this file, follow reality and note the discrepancy in your evidence.
- **The limiter waits, it does not throw.** Do not "fix" this by failing fast.
- **Default `AI_MAX_CONCURRENCY` to 1.** Stage 6 depends on it.
- No LLM call anywhere may bypass this pipeline.
- Log every call: model, tokens, cost estimate, cache hit/miss, wait time, retries. Stage 10
  builds observability on these.
- Dependencies in `packages/ai/package.json`, justified.

---

## Acceptance criteria

Run each; paste actual output into `docs/checkpoints.md` under Stage 4's Evidence log.

```bash
pnpm typecheck --filter @contentyou/ai
pnpm lint --filter @contentyou/ai
pnpm test --filter @contentyou/ai
```

All tests run against a **fake provider** — no network, no API key, deterministic.

- [ ] **Limiter paces**: 20 requests at RPM=10 take >60s of simulated time and **all 20
      succeed**. None throws. (Use fake timers.)
- [ ] **Daily cap**: past RPD, requests fail with a clear reset time rather than waiting.
- [ ] **Concurrency gate**: with `AI_MAX_CONCURRENCY=1`, two concurrent calls are observably
      serialized.
- [ ] **Cache hit costs nothing**: identical request twice → one provider call, one ledger
      entry.
- [ ] **Cache key sensitivity**: changing the schema or temperature misses the cache.
- [ ] **429 backoff**: a provider failing twice then succeeding → the call succeeds, with
      increasing delays and jitter.
- [ ] **Terminal vs retryable**: a 400 is **not** retried.
- [ ] **Failover**: primary model exhausted → fallback model is used.
- [ ] **Structured repair**: provider returns schema-invalid JSON once → one retry carrying
      the validation error → success.
- [ ] **Budget governor rejects early**: over-cap user is refused **before** any provider
      call (assert the provider was never invoked).
- [ ] **Ledger concurrency**: 50 concurrent calls produce exactly 50 ledger increments.
- [ ] **YouTube quota accounting**: one search records exactly 100 units; the per-run cap is
      enforced; a repeat query hits cache and records **0**.
- [ ] **Grounded search returns citations**: every `ResearchDoc` has a non-empty stable
      `citationId` and a resolvable url.
- [ ] **Provider opacity**: a consumer holding `LlmPort` cannot reach provider internals
      (assert the exported type surface).

**Optional, if you have a real API key**: one live smoke call per provider. If you do not,
mark those boxes blocked — do not tick them from the fake provider.

---

## Checkpoint update

Tick Stage 4's boxes in `docs/checkpoints.md`, paste evidence, run `pnpm checkpoints`. Write
**only** Stage 4's section.

---

## Out of scope

Graph orchestration (Stage 5) · prompts and skill definitions (Stage 6) · real ledger/cache
persistence (Stage 2) · UI (Stage 8) · tracing dashboards and evals (Stage 10).

You provide the mechanism. You do not decide *what* to prompt.

---

## Harness notes

**Claude Code** — invoke the `claude-api` skill before writing provider adapters; it carries
current model ids, pricing and structured-output specifics, and this stage must not be
written from memory. `superpowers:test-driven-development` suits the limiter and cache well.

**Antigravity** — no skills. In plain terms: before writing each adapter, fetch the
provider's current docs for model ids, structured output and rate-limit headers. Do not rely
on recalled model names.

**Both** — fake timers are essential; do not write tests that actually sleep for 60 seconds.
