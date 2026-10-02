# Stage 7 — Scheduling, Calendar & Publishing Port

> **Wave W3 · runs in parallel with Stage 8 and Stage 9.**
> Copy this entire file as the first message of a fresh session.

---

## Role & mission

You are building `packages/scheduling`: the layer that decides **when** each artifact should
go out, writes it to the creator's calendar, notifies them, and hands them everything needed
to actually post it.

`PS.md`:

> *"when finalised, the planned dates should automatically be noted in the preferred
> calendar choice (set by user at the start), and should be notified in the app."*

The important constraint shaping this stage: **Instagram auto-publishing is not available
yet** (Meta App Review — `CLAUDE.md` §3.4, ADR-004). So you define `PublishingPort` and ship
a **`ManualExportAdapter`** that is genuinely excellent — asset bundle, caption ready to
paste, calendar entry, reminder. Stage 11 adds the real adapter behind a flag after approval.

Treat the manual path as the product, not a placeholder. It is what every user will use for
the foreseeable future, and the hard part of this product was never the HTTP POST.

---

## Wave & siblings

Running **now, in parallel**: Stage 8 (frontend) and Stage 9 (feedback).

Stage 8 will render your calendar data; you meet at the schemas. Stage 9 consumes
`publications` engagement data that you write. Neither blocks you.

---

## File ownership

- **Own (exclusive write):** `packages/scheduling/**`,
  `packages/config/src/env/social.ts` (calendar + publishing keys),
  `apps/agent/src/publishing/**` (the worker-side hook)
- **Read only:** `packages/schemas/**`, `packages/db/**`, `packages/ai/**`, `CLAUDE.md`, `docs/`
- **Must not touch:** `apps/web/app/**` (Stage 8), `apps/agent/src/memory/**` and
  `apps/agent/src/graphs/**` (Stages 5, 9), `packages/skills/**` (Stage 6)

---

## Read first

1. `CLAUDE.md` — **§3.4 (Meta gating)**, §8.3 (the deferral), §9
2. `docs/DECISIONS.md` — **ADR-004**
3. `docs/ARCHITECTURE.md` — §4 (`scheduleEntries`, `publications`)
4. `packages/schemas/src/ports/publishing.ts` — the port you implement

---

## Context you can rely on

- **Artifacts arrive with a suggested post time** from Stage 6. You **decide and persist**
  the actual schedule — resolving conflicts, applying the creator's constraints, and
  converting to their timezone.
- **Never invent a "best time to post" statistic** (`CLAUDE.md` §9). Derive it from the
  creator's own `publications` history where it exists; where it does not, use the plan's
  cited audience research; where neither exists, say the recommendation is a default and
  explain why. An honest default beats a fabricated benchmark.
- **Instagram publishing is flag-gated off.** The UI must be honest about what is automated
  and what is not.

---

## Deliverables

### 1. Best-time engine — `packages/scheduling/src/best-time/`

Three tiers, in priority order, and the tier used must be **reported** so the UI can explain
the recommendation:

1. **Creator's own data** — per-format, per-weekday, per-hour engagement from `publications`.
   Requires a minimum sample size (env) before it is trusted; below that, fall through.
2. **Plan's cited audience research** — from the run's `ResearchDoc`s.
3. **Documented defaults** — clearly labelled as generic, with the reasoning shown.

All timezone-aware. Store UTC, present in the creator's zone, and **handle DST transitions**
— a naive local-time schedule will silently shift by an hour twice a year.

### 2. Schedule generation — `packages/scheduling/src/planner.ts`

Turn a run's artifacts into `ScheduleEntry[]`:
- spread across days per the plan's cadence (do not dump seven posts on one morning)
- respect per-platform minimum gaps (env)
- respect creator blackout windows (weekends, holidays) from `CreatorProfile`
- deterministic and **re-runnable**: regenerating after a plan edit must not duplicate entries

### 3. `PublishingPort` — `packages/scheduling/src/publishing/`

**`ManualExportAdapter`** (the real deliverable):
- asset bundle per entry — scripts, shot lists, edit/morph directions, audio suggestions
- caption + hashtags formatted **ready to paste**, per platform
- **`.ics` calendar file** (valid RFC 5545 — verify it imports into a real calendar app)
- a checklist the creator ticks as they publish, which writes back a `Publication`

**`InstagramGraphAdapter`** — stub only, flag-gated, throwing a clear "requires Meta App
Review" error. Stage 11 implements it. Get the interface right so Stage 11 is a drop-in.

### 4. Calendar sync — `packages/scheduling/src/calendar/`

Provider abstraction; **Google Calendar** first (the creator likely linked Google in Stage 3
— request incremental calendar scope rather than at sign-up). `.ics` download is the
universal fallback and must always work, even with no provider linked.

- create / update / delete events, storing the provider event id on the `ScheduleEntry`
- **idempotent**: re-syncing must not duplicate events
- **degrade gracefully**: a calendar API failure must never fail the run. The schedule is in
  our DB; calendar is a convenience.

### 5. Notifications — `packages/scheduling/src/notify/`

In-app notifications (persisted, so Stage 8 can render a centre): schedule created, post due
soon, post overdue, token expiring.

Respect quiet hours from `CreatorProfile`. Keep the transport behind an interface so email
or push can be added later without touching callers.

### 6. Worker hook — `apps/agent/src/publishing/`

Wire scheduling into the end of a run: artifacts complete → generate schedule → sync
calendar → notify. Failures here are **non-fatal** — a run that produced six good artifacts
but failed to sync a calendar is a success with a warning, not a failed run.

---

## Constraints & guardrails

- **Never invent a best-time statistic.** Report which tier produced the recommendation.
- **Never fail a run** because calendar sync or notification failed.
- **Instagram adapter stays stubbed and flag-gated.** Do not implement Graph API publishing.
- **Store UTC**, present local, handle DST.
- **Idempotence everywhere** — regeneration and re-sync must not duplicate.
- Do not build UI (Stage 8) or the engagement-learning loop (Stage 9).
- Dependencies in the owning `package.json`, justified.

---

## Acceptance criteria

Run each; paste actual output into `docs/checkpoints.md` under Stage 7's Evidence log.

```bash
pnpm typecheck --filter @contentyou/scheduling
pnpm lint --filter @contentyou/scheduling
pnpm test --filter @contentyou/scheduling
```

- [ ] **Tier selection**: with rich history → tier 1; with thin history → falls through to
      tier 2; with neither → tier 3, and each result **reports its tier**.
- [ ] **Minimum sample size** is enforced before trusting creator data.
- [ ] **Timezone correctness**: a creator in IST gets IST-correct times; stored values are UTC.
- [ ] **DST test**: a schedule spanning a DST boundary keeps the intended *local* time.
- [ ] **Spacing**: six artifacts are not scheduled within one hour; per-platform gaps hold.
- [ ] **Blackout windows** excluded.
- [ ] **Regeneration idempotence**: regenerate twice → no duplicate entries.
- [ ] **`.ics` validity**: generated file parses as RFC 5545 **and imports into a real
      calendar app**. Paste the file's head as evidence.
- [ ] **Manual export bundle** contains, for one entry: assets, edit directions, audio
      suggestion, paste-ready caption + hashtags, and the calendar entry.
- [ ] **Calendar idempotence**: syncing the same entry twice creates one event.
- [ ] **Calendar failure is non-fatal**: with the calendar API stubbed to fail, the run still
      completes and the schedule persists.
- [ ] **Instagram adapter** throws a clear "requires Meta App Review" error and is
      unreachable with the flag off.
- [ ] **Quiet hours** suppress a notification that would fall inside them.
- [ ] **Publish checklist** writes back a `Publication` record.

---

## Checkpoint update

Tick Stage 7's boxes in `docs/checkpoints.md`, paste evidence, run `pnpm checkpoints`. Write
**only** Stage 7's section.

---

## Out of scope

Calendar/analytics **UI** (Stage 8) · learning from engagement (Stage 9) · real Instagram
publishing (Stage 11) · email/push transports (interface only).

---

## Harness notes

**Claude Code** — `superpowers:test-driven-development` suits the best-time engine and the
DST cases; timezone bugs are exactly the kind that pass a casual read and fail in production.

**Antigravity** — no skills. In plain terms: write the timezone and DST tests before the
implementation, using fixed instants rather than `now()`.

**Both** — verify `.ics` output by importing it into an actual calendar application. A file
that parses is not the same as a file that imports correctly.
