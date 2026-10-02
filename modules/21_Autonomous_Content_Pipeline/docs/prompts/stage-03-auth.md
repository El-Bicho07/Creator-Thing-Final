# Stage 3 — Auth & Account Linking

> **Wave W2 · runs in parallel with Stage 5 and Stage 6.**
> Copy this entire file as the first message of a fresh session.

---

## Role & mission

You are building authentication for ContentYou with **Better Auth**, plus the social-account
linking layer that stores creators' third-party tokens.

The account-linking half matters more than the login half. `PS.md` wants the platform
"directly linked to the user's social platforms... read/watch them, analyze what type of
account they have." That means holding long-lived Instagram, YouTube, LinkedIn and X tokens
— which is exactly the thing you must not get wrong. **Tokens are encrypted at rest,
AES-256-GCM, with the key from env and never in git.**

---

## Wave & siblings

Running **now, in parallel**: Stage 5 (agent graph) and Stage 6 (skills).

Neither touches auth. You use the **real** `packages/db` from Stage 2 — it completed in
Wave 1. You own the Better Auth collections; Stage 2 deliberately left their shape to you.

---

## File ownership

- **Own (exclusive write):** `apps/web/lib/auth/**`, `apps/web/app/api/auth/**`,
  `apps/web/middleware.ts`, `packages/config/src/env/auth.ts`,
  `packages/db/src/collections/socialAccounts.ts` (**handed over from Stage 2 — you own the
  encryption**)
- **Read only:** `packages/schemas/**`, the rest of `packages/db/**`, `packages/ui/**`,
  `CLAUDE.md`, `docs/`
- **Must not touch:** `apps/agent/**` (Stage 5), `packages/skills/**` (Stage 6),
  `packages/ai/**`, application routes under `apps/web/app/(app)/**` (Stage 8)

---

## Read first

1. `CLAUDE.md` — §2 (why Better Auth), §3.4 (Meta constraints), §9 (never do this)
2. `docs/ARCHITECTURE.md` — §4 (`socialAccounts`)
3. `packages/schemas/src/` — `SocialAccount`, `CreatorProfile`
4. `packages/db/src/` — the client and repository patterns Stage 2 established

---

## Context you can rely on

**Better Auth was chosen over Clerk/Auth0 for one specific reason**: it runs in-process and
MongoDB-native, so the third-party social tokens live in *your* database next to the creator
profile. A hosted auth provider makes that awkward, and those tokens are the product's
connection to the creator's actual accounts.

**Meta is gated** (`CLAUDE.md` §3.4): Instagram needs a Business account + linked Facebook
Page + App Review. Wire the OAuth flow, **flag it off**, and make the UI honest about it.
Nothing here may block on Meta approval.

---

## Deliverables

### 1. Better Auth setup — `apps/web/lib/auth/`

- Email + password, and Google OAuth (Google is also the calendar provider later — Stage 7
  benefits if you request calendar scopes incrementally rather than up front)
- MongoDB adapter against the Stage 2 client
- Session strategy, secure cookie config, CSRF
- Server-side `getSession()` helper for Server Components and Server Actions

Verify Better Auth's **current** API against its live docs — it moves quickly, and its
config shape has changed across versions.

### 2. Route protection — `apps/web/middleware.ts`

Protect `/app/*`. Redirect unauthenticated users to sign-in **preserving the intended
destination**. Keep `/`, `/_preview` and auth routes public.

Middleware runs on every request — keep it cheap. No DB round-trip if the session cookie can
be validated without one.

### 3. Token encryption — `apps/web/lib/auth/crypto.ts`

AES-256-GCM. Key from env (base64, 32 bytes), **never in git**.

- Random IV per encryption, stored with the ciphertext
- Auth tag stored and **verified** on decrypt
- Include a `keyVersion` field on stored records so keys can be rotated later without a
  migration you cannot run
- Fail closed: a decryption failure is an error, never a silent empty string

Write this file carefully and test it directly. Everything downstream trusts it.

### 4. Social account linking — `apps/web/lib/auth/social/`

A `SocialAccountLinker` per platform behind one interface:

| Platform | Scope now | Note |
|---|---|---|
| YouTube / Google | read: channel + video stats | powers viral research and the creator's own analytics |
| Instagram / Meta | `instagram_business_basic` | **flag-gated off** until App Review |
| LinkedIn | basic profile + share | optional |
| X | basic | optional |

Each linker handles: OAuth initiation with state/PKCE, callback + token exchange, encrypted
persistence, **refresh before expiry**, revocation, and an `isExpired()` check.

### 5. Token refresh — `apps/web/lib/auth/social/refresh.ts`

A refresh function callable both on-demand (before use) and on a schedule. Long-lived tokens
expire — Meta's are ~60 days and must be refreshed *before* expiry or the user must re-link.

Idempotent and race-safe: two concurrent refreshes of the same account must not both consume
the refresh token.

### 6. Account analysis hook — `apps/web/lib/auth/social/analyze.ts`

A thin scaffold `PS.md` asks for: on link, fetch basic account metadata (follower count,
recent post cadence, dominant format) and seed `CreatorProfile`.

Keep this **shallow** — fetch and store. The interpretation ("generic vs specialised
account") is Stage 9's job. Do not build inference here.

### 7. Auth UI — `apps/web/app/(auth)/`

Sign-in, sign-up, forgot-password, and the account-linking settings panel. Compose
`packages/ui` components (Stage 1) — do not invent new primitives. If something is missing,
use a plain element and note it rather than editing `packages/ui`.

---

## Constraints & guardrails

- **Never store a raw token.** Encrypted at rest, always. Grep your own diff before finishing.
- **Never log a token, refresh token, or the encryption key** — including in error messages.
- **Never commit `.env`.** Add the keys to `.env.example` with placeholder values.
- **Meta stays flag-gated off** until Stage 11.
- Do not build the creator-profile *inference* (Stage 9).
- Do not add fields to the idea-capture screen (`CLAUDE.md` §7).
- Verify Better Auth's current API against live docs — do not write it from memory.
- Dependencies in the owning `package.json`, justified.

---

## Acceptance criteria

Run each; paste actual output into `docs/checkpoints.md` under Stage 3's Evidence log.

```bash
pnpm typecheck --filter web
pnpm lint --filter web
pnpm test --filter web
pnpm dev --filter web
```

- [ ] Sign up → sign out → sign in works end to end in a browser.
- [ ] Unauthenticated `/app` redirects to sign-in **and returns to `/app` after login**.
- [ ] **Encryption round-trip test**: encrypt → decrypt returns the original exactly.
- [ ] **Tamper test**: flipping one byte of ciphertext or auth tag makes decryption **throw**
      — it must not return garbage.
- [ ] **Key version** is persisted with each encrypted record.
- [ ] **DB inspection**: read a `socialAccounts` document directly from Mongo and confirm no
      plaintext token is visible. Paste the (redacted) document as evidence.
- [ ] **Log scan**: run a link flow with debug logging on, grep the output for the token
      value, confirm zero matches.
- [ ] Google OAuth link stores an encrypted token and reports correct expiry.
- [ ] **Concurrent refresh test**: two simultaneous refreshes → one token exchange, both
      callers get a valid token.
- [ ] Revocation clears the stored token and marks the account unlinked.
- [ ] Meta linking is **not reachable** with the flag off.
- [ ] Session survives a page reload; sign-out invalidates it server-side.

---

## Checkpoint update

Tick Stage 3's boxes in `docs/checkpoints.md`, paste evidence, run `pnpm checkpoints`. Write
**only** Stage 3's section.

---

## Out of scope

Application screens beyond auth + linking settings (Stage 8) · creator-profile inference
(Stage 9) · calendar OAuth scopes (Stage 7 — but leave the seam) · Instagram publishing
(Stage 11).

---

## Harness notes

**Claude Code** — `/security-review` over your diff before finishing is worth the minutes;
this stage handles credentials. `superpowers:test-driven-development` suits the crypto module
— write the tamper test before the implementation.

**Antigravity** — no skills. In plain terms: write the crypto tests first (round-trip and
tamper), then implement. Before claiming done, re-read your own diff specifically hunting for
plaintext token paths and token values in logs.

**Both** — fetch Better Auth's current documentation rather than relying on recalled API
shape. OAuth callback flows need a real browser; mark those boxes blocked if you have none.
