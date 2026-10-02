# Stage 11 — Instagram Graph API Publishing

> **DEFERRED.** Do not start this stage until Meta App Review has **approved**
> `instagram_business_content_publish` for the app.
> Copy this entire file as the first message of a fresh session.

---

## Prerequisites — verify all before starting

Stop and confirm each. If any is missing, this stage cannot proceed, and that is expected
rather than a problem — Stages 0–10 ship a complete product without it (ADR-004).

- [ ] Stage 10 complete and deployed
- [ ] Meta Developer App created, in Live mode
- [ ] **Instagram Business account** — Creator accounts are **not supported** for API publishing
- [ ] Instagram account linked to a Facebook Page
- [ ] **`instagram_business_content_publish` approved** via App Review
- [ ] `instagram_business_basic` approved
- [ ] Publicly reachable HTTPS media hosting (Meta fetches media by URL — it cannot be given
      a file upload, and a localhost or signed-private URL will fail)
- [ ] *(Optional, for hashtag research)* **Public Content Access** approved — a separate and
      harder review

---

## Role & mission

You are implementing the real `InstagramGraphAdapter` behind the `PublishingPort` that
Stage 7 defined and stubbed. When done, a scheduled Reel publishes itself.

The interface already exists and the manual path already works. **Manual export stays** — it
is the fallback for unlinked accounts, unsupported media, and any publish failure. You are
adding an automation path, not replacing the product's existing behaviour.

---

## File ownership

- **Own (exclusive write):** `packages/scheduling/src/publishing/instagram/**`,
  `apps/agent/src/publishing/instagram/**`, `packages/config/src/env/social.ts` (Meta keys)
- **Read only:** everything else
- **Must not touch:** `ManualExportAdapter` (it remains the fallback), the `PublishingPort`
  interface itself (if it needs changing, that is a design bug — raise it)

---

## Read first

1. `CLAUDE.md` — **§3.4 (the Meta constraints)**, §8.3, §9
2. `docs/DECISIONS.md` — **ADR-004**
3. `packages/scheduling/src/publishing/` — the port and the stub you are replacing
4. Meta's **current** Content Publishing documentation. Read it live. This API's details
   change, and it is the one part of this project where writing from memory is guaranteed to
   fail.

---

## Context you can rely on

Confirmed constraints as of 2026-09-28 — **re-verify every one against live docs**:

| Constraint | Value |
|---|---|
| Account type | **Business only** (Creator not supported) |
| Flow | Two-step: `POST /{ig-user-id}/media` → `POST /{ig-user-id}/media_publish` |
| Media source | **Public HTTPS URL** that Meta fetches — no direct upload |
| Reels eligibility | **9:16, 5–90 seconds** (outside this, it posts as a video, not a Reel) |
| Container processing | **Asynchronous** — poll `status_code` before publishing |
| Publishing limit | ~25 posts per 24h per account (verify) |
| Hashtag search | 30 unique tags / 7 days, 200 req/hr, needs Public Content Access |

---

## Deliverables

### 1. Graph API client — `packages/scheduling/src/publishing/instagram/client.ts`

Typed client: container creation, **status polling**, publish, account info, media insights.

Handle Meta's error taxonomy properly — it distinguishes transient from permanent far less
clearly than most APIs, and retrying a permanent error wastes the daily publish limit. Map
each error to retryable / terminal / requires-relink, and carry the subcode.

### 2. Media hosting — `packages/scheduling/src/publishing/instagram/media.ts`

Meta fetches media from a URL, so media must be publicly reachable over HTTPS for the
duration of the fetch.

- upload to object storage (free tier: Cloudflare R2, Backblaze B2 or similar)
- **time-limited public URL** — long enough for Meta to fetch, short enough not to be a
  permanent public asset
- clean up after successful publish
- **never store media in MongoDB** (`CLAUDE.md` §3.6)

### 3. Pre-flight validation — `packages/scheduling/src/publishing/instagram/validate.ts`

Validate **before** creating a container — a failed container still consumes quota:

- aspect ratio **9:16**, duration **5–90s** for Reels
- codec, container format, file size within Meta's limits
- caption length, hashtag count
- account is Business, token valid and unexpired, permission granted

Fail with a message that tells the creator **what to change**, and fall back to manual export
rather than dead-ending them.

### 4. The adapter — `.../instagram/adapter.ts`

`InstagramGraphAdapter implements PublishingPort`. Full flow:

```
validate → upload media → create container → poll status → publish → record Publication
                                                   │
                                        (any failure at any point)
                                                   │
                                                   ▼
                                    fall back to manual export + notify
```

**Idempotency is critical here.** A double-publish is user-visible, embarrassing, and
unfixable by us — the creator has to delete a duplicate post from their own feed. Use an
idempotency key per `ScheduleEntry` and check before every publish call, including after a
crash-resume.

### 5. Scheduled publisher — `apps/agent/src/publishing/instagram/scheduler.ts`

Worker loop: find due `ScheduleEntry`s → publish → record → notify.

- **respect the daily publish limit**; queue the overflow rather than failing it
- exponential backoff on transient failure, with a bounded attempt count
- after final failure → manual export + notify. The creator must never discover this by
  finding nothing was posted.
- crash-safe: a run interrupted between container creation and publish must resume without
  duplicating

### 6. Engagement collection — `.../instagram/insights.ts`

Pull insights for published posts on a schedule → `publications`. This feeds Stage 9's
learning loop, which is where the real long-term value is.

Respect rate limits; batch; this is background work with no deadline.

### 7. *(Optional)* Hashtag research — `.../instagram/hashtag.ts`

**Only if Public Content Access was approved.** `ig_hashtag_search` → `top_media` for
Instagram-native viral references, feeding Stage 5's `viralReferenceMining`.

Hard-budget it: **30 unique hashtags per 7 days** is very little. Cache aggressively, track
the rolling window, and degrade to YouTube-only mining when exhausted.

### 8. Feature flag

`FEATURE_INSTAGRAM_PUBLISH`, default **off**. Per-user opt-in. Manual export remains
available at all times, for everyone.

---

## Constraints & guardrails

- **Never scrape Instagram** (`CLAUDE.md` §9). Approved APIs only.
- **Never publish without an idempotency check.** Duplicates are unfixable by us.
- **Never remove or bypass manual export.** It is the fallback, permanently.
- **Never store media in MongoDB.**
- **Never leave media publicly hosted** after a successful publish.
- **Never exceed the daily publish limit** — queue instead.
- **Never retry a terminal error** — it burns the publish quota.
- Verify every limit in this document against live Meta docs before implementing.

---

## Acceptance criteria

Run each; paste actual output into `docs/checkpoints.md` under Stage 11's Evidence log.

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm test:integration --filter instagram
```

- [ ] **Validation rejects** a 4s reel, a 120s reel, and a 16:9 reel, each with an actionable
      message.
- [ ] **Container status polling** handles `IN_PROGRESS` → `FINISHED` and `ERROR`.
- [ ] **Idempotency**: publishing the same `ScheduleEntry` twice → **one** post. Assert this
      hard, including across a simulated crash between container and publish.
- [ ] **Daily limit**: the 26th post in 24h is queued, not failed.
- [ ] **Terminal vs transient**: a permission error is not retried; a transient one is.
- [ ] **Fallback**: a forced publish failure produces a manual-export bundle and a
      notification.
- [ ] **Media cleanup**: the public URL is unreachable after a successful publish.
- [ ] **Token expiry**: an expired token produces a clear relink prompt, not a generic error.
- [ ] **Flag off** → adapter unreachable, manual export used.
- [ ] **Insights collection** writes `publications` records consumable by Stage 9.
- [ ] *(If approved)* hashtag research respects the 30/7-day window and degrades cleanly.
- [ ] **One real publish to a real test account.** Paste the resulting permalink. Nothing
      else substitutes for this.

---

## Checkpoint update

Tick Stage 11's boxes, paste evidence, run `pnpm checkpoints`.

---

## Out of scope

Other platforms' publishing APIs (YouTube, LinkedIn, X — later stages if wanted) · new
content formats · changes to the `PublishingPort` interface.

---

## Harness notes

**Claude Code** — fetch Meta's current Content Publishing docs before writing any code.
`/security-review` over the token-handling paths.

**Antigravity** — no skills. In plain terms: read Meta's live documentation first, then
review your own diff for token handling and idempotency before claiming done.

**Both** — use a **dedicated test Instagram Business account**, never a real creator's. The
final checkbox publishes an actual post to an actual public feed; be certain the account is
one you are authorized to post to, and that the content is something you are content to
leave visible.
