# Stage 10 — Integration, Observability, Eval & Deploy

> **Wave W4 · SOLO.** Every other stage (except 11) is complete and merged.
> Copy this entire file as the first message of a fresh session.

---

## Role & mission

Nine stages were built in parallel against **mocks**. Your job is to make them a real system:
swap every mock for its implementation, prove the whole thing works end to end, make it
observable, build the eval harness that keeps output quality measurable, and deploy it.

Be sceptical here. Mocks passing is **not** evidence the system works — it is evidence each
piece works against an idealised version of its neighbours. The failures you are hunting
for live precisely in the gaps between: a port whose real implementation has different
latency, ordering, or error semantics than its mock.

Assume there are integration bugs. Go find them.

---

## Wave & siblings

**Solo.** Stages 0–9 are merged. Stage 11 remains deferred pending Meta App Review.

---

## File ownership

- **Own:** cross-cutting — wiring, observability, evals, deployment config, CI.
- **Read only:** everything else.
- **Modify other packages only to fix a genuine integration bug.** When you do, note it in
  your evidence with the failing behaviour that justified it. Do not refactor, do not
  improve, do not tidy. Other stages' authors made their choices deliberately.

---

## Read first

1. `CLAUDE.md` — all of it, especially §3 (constraints) and §9
2. `docs/ARCHITECTURE.md` — §10 (deployment) and the whole run sequence
3. `docs/checkpoints.md` — every stage's Evidence log. **Read what actually happened**,
   including anything marked blocked. That is your bug list.
4. Every stage prompt's "Out of scope" section — the seams between them are where bugs are.

---

## Context you can rely on

- **Every port has a real implementation now**: `UsageLedgerPort` and `ResearchCachePort`
  (Stage 2), `LlmPort` (Stage 4), `SkillRegistryPort` (Stage 6), `PublishingPort` (Stage 7),
  `ProfileMemoryPort` (Stage 9).
- **Free tier is the deployment target.** ~20–30 runs/day (§3.1). Your load testing must
  respect that — you cannot hammer this system, and trying will simply exhaust the day.
- **Instagram publishing remains stubbed** (ADR-004). Do not implement it.

---

## Deliverables

### 1. Dependency wiring — `apps/agent/src/container.ts`, `apps/web/lib/container.ts`

One composition root per app. Every port resolved to its real implementation, injected at
startup. **Mocks remain available for tests** but must be impossible to select in
production — assert this at boot.

### 2. Integration test suite — `tests/integration/`

Real Mongo (`mongodb-memory-server` or a dev Atlas), fake LLM provider, full graph:

- idea → research → plan → interrupt → approve → six artifacts → schedule → notify
- the feedback path: plan feedback → re-draft → approve
- the failure paths: provider 429, provider terminal error, single-skill failure, calendar
  failure, worker crash mid-run
- **the citation chain end to end**: artifact → plan claim → researchDoc → a real URL. This
  is the product's core promise; test it as such.

### 3. Eval harness — `evals/`

This is the deliverable that keeps the product good after you leave, and it is worth more
than the dashboards.

- **Golden set**: 10–20 diverse ideas (different niches, formats, difficulty), fixed.
- **Rubric scoring**: reuse the rubrics from `packages/skills` — they were written to be
  machine-scorable.
- **Automatic checks**: citation coverage (what % of claims are sourced), schema validity,
  validator pass rate, reel distinctness, fabricated-statistic flags.
- **Report**: per-skill scores, run cost, wall-clock, quota consumed.
- **Regression detection**: compare against a stored baseline and fail on a material drop.

Make it runnable as `pnpm eval` and cheap enough to actually run — a suite too expensive for
the free tier will never be run, and an eval nobody runs is worthless. Support sampling.

### 4. Observability — `packages/config/src/telemetry.ts` + per-app wiring

- **Structured JSON logs** with `runId` correlation across both processes. Being able to
  `grep` one runId across web and agent is the single most useful debugging property here.
- **Redaction**: tokens, keys and PII never reach logs. Test this.
- Per-run trace: nodes, durations, model calls, cache hits, **pacing waits**, retries, cost.
- Metrics: run success rate, p50/p95 duration, cache hit rate, quota consumption vs cap,
  429 rate, critic revision counts.
- `/health` (liveness) and `/ready` (Mongo reachable, config valid) on the agent.
- Optional LangSmith behind an env flag — useful, but never required to operate.

### 5. Resilience testing — `tests/chaos/`

The scenarios that will actually happen on free tier:

- **429 storm**: provider rate-limits every call → the limiter paces, the run completes
  slowly, **nothing fails**. This is normal operation, not an outage.
- **Daily quota exhaustion** mid-run → clean failure with a clear reset time, partial results
  preserved.
- **Worker killed mid-run** → restart → resumes from last checkpoint. Verify which node.
- **Mongo connection drop** → reconnects, run survives.
- **Free-tier host sleep** → run reclaimed after `staleCutoff`, resumes.
- **Two workers, one run** → exactly one claim.

### 6. Security pass

- No secret in git — scan the **full history**, not just the working tree.
- Social tokens encrypted at rest; verify by direct DB inspection.
- No token, key or PII in logs — verify by grepping a real run's output.
- Auth on every `/app` route and every API route.
- Rate limiting on public endpoints.
- Dependency audit clean.

### 7. Deployment

| Piece | Host | Must have |
|---|---|---|
| `apps/web` | Vercel | env configured, build passing, preview deployments |
| `apps/agent` | Render / Railway / Fly | `/health` keep-alive, **graceful SIGTERM drain**, restart policy |
| MongoDB | Atlas M0 | indexes created, TTL verified live, IP allowlist, backup noted |

Plus: `docs/RUNBOOK.md` — how to deploy, roll back, rotate a key, read logs, and diagnose the
five most likely failures. Write it for someone who did not build this.

### 8. CI/CD

Typecheck → lint → test → build → integration tests → deploy on main. Evals run nightly or
on demand (not per-commit; too expensive for the free tier).

---

## Constraints & guardrails

- **Do not refactor other stages.** Fix integration bugs only, and justify each with the
  failing behaviour.
- **Do not implement Instagram publishing** (Stage 11).
- **Do not exceed free-tier quotas while testing.** Use the fake provider for everything
  except a handful of deliberate live smoke tests.
- **Do not make mocks selectable in production.**
- **Do not weaken a test to make it pass.** A failing integration test is information — that
  is the entire point of this stage.

---

## Acceptance criteria

Run each; paste actual output into `docs/checkpoints.md` under Stage 10's Evidence log.

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm test:integration
pnpm test:chaos
pnpm eval --sample 5
```

- [ ] **Full E2E, fake provider**: idea → six artifacts → schedule → calendar → notification.
- [ ] **Full E2E, real provider, one live run**: paste the run trace, total cost and quota
      consumed. This is the single most important piece of evidence in the project.
- [ ] **Citation chain**: pick one artifact from the live run and walk it back to a real URL.
      Paste the chain.
- [ ] **No mock reachable in production config** — asserted at boot.
- [ ] **429 storm**: run completes, nothing fails, pacing visible in the trace.
- [ ] **Quota exhaustion**: clean failure, clear reset time, partial results kept.
- [ ] **Crash recovery**: kill the worker mid-run, restart, resume from checkpoint. Paste the
      log showing the resumed node.
- [ ] **Two workers, one run**: exactly one claim.
- [ ] **Secret scan over full git history**: zero findings.
- [ ] **Log redaction**: grep a real run's logs for token values → zero matches.
- [ ] **DB inspection**: `socialAccounts` shows no plaintext token.
- [ ] **Eval baseline stored**; a deliberately degraded prompt is **caught** by the
      regression check.
- [ ] **Deployed**: web and agent both live, health checks green, one real run completed in
      production.
- [ ] `docs/RUNBOOK.md` complete.
- [ ] **Every stage's blocked checkboxes** from earlier waves are now resolved or explicitly
      carried forward with a reason.

---

## Checkpoint update

Tick Stage 10's boxes, paste evidence, run `pnpm checkpoints`. This should take the project
to its final percentage — verify the roll-up is correct.

---

## Out of scope

Instagram Graph API publishing (Stage 11) · new features · refactoring other stages'
internals · cross-platform mobile apps.

---

## Harness notes

**Claude Code** — `/security-review` over the whole repo before deploying.
`superpowers:verification-before-completion` is the right discipline for this stage
specifically: every claim here needs pasted evidence, and this is the stage where a false
completion claim is most costly.

**Antigravity** — no skills. In plain terms: run every command and paste real output. Do not
report a check as passing because it should pass.

**Both** — the live-run checkboxes need real API keys and real deployments. If you do not
have them, mark those boxes blocked and say so plainly rather than ticking them from the
fake provider. A project at 90% with an honest blocker is more useful than one reported
complete that has never made a real API call.
