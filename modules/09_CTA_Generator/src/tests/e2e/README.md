# Cue — E2E tests

Fast Playwright tests for the critical user journeys in the Cue Instagram CTA
generator. Full suite runs in well under 60s (~25-30s locally, 4 parallel
workers, single Chromium browser + one mobile-viewport project).

## Run

From `cue/` (the Next.js app root):

```bash
npm run dev            # in one terminal — app must be running on :3000
npm run test:e2e       # in another — runs the whole suite headless
npm run test:e2e:ui    # interactive UI mode, for debugging one spec at a time
```

`playwright.config.ts` also has a `webServer` block that will start
`npm run dev` for you if nothing is already listening on `:3000`
(`reuseExistingServer: true`, so it won't fight an already-running dev
server).

No `ANTHROPIC_API_KEY` is required — with none set, `/api/generate` returns
`no_key` and the app falls back to its offline template engine, which is
fast and deterministic enough for these tests. If a key *is* set in your
`.env`, the tests still work off the same offline templates in practice
(AI responses pass the same schema/assertions), but expect slower runs.

## Files

- `helpers.ts` — shared `generateHindiKit(page)` helper: opens `/studio`,
  clicks "Try an example", switches language to Hindi, submits, and waits
  for the kit to render. Used by every test that needs a populated kit.
- `landing.spec.ts` — hero renders (heading, CTA, shader fallback), and the
  floating nav pill's tone flips from `tone-dark` (over the hero) to page
  colours once you scroll to "How it works".
- `studio.spec.ts` — "Try an example" fills the brief, Hindi can be picked,
  the form submits, and the kit renders 2+ placement card-stacks.
- `deck.spec.ts` — the chevron buttons, `ArrowRight`/`ArrowLeft` keys, and
  the dot indicators all flip a card stack and stay in sync with the
  "n of total" counter.
- `save-history.spec.ts` — "Save picks" writes to the local history store,
  and the entry shows up on `/history`. Since `HistoryEntry` doesn't carry
  a separate `language` field, "correct language tag" is verified by
  checking the saved CTA text is in Devanagari script (Hindi), which is
  what the offline templates produce for `language: "hi"` — i.e. the
  language choice round-tripped into what got saved.
- `theme.spec.ts` — the theme toggle flips `<html data-theme>` and the
  *resolved* background/text colours actually change, then toggling back
  restores the original colours.
- `mobile.spec.ts` — at a 390px viewport: no horizontal page overflow, the
  2xl-only sidebar preview is hidden, and the "Preview" pill in the
  placement-jump nav scrolls to the preview as the last card in the track
  (per `src/components/Studio.tsx`'s `KitView`).

## Notes for whoever runs these next

- The language radio pills (`Choices` in `Studio.tsx`) render their icon on
  top of a visually-hidden (`sr-only`) `<input type="radio">`, so Playwright
  sometimes reports the icon "intercepts pointer events" on a plain
  `.click()`. Tests that pick a language use `.click({ force: true })` for
  that reason — this is a real (minor) a11y/hit-target quirk in the
  component, not a test bug. Worth a look if you're touching `Choices`.
- `deck.spec.ts` targets the first card stack that actually has multiple
  candidates (`n > 1`, so its nav controls render) rather than hard-coding
  a specific slot, since which slot has 2+ options can vary by seed/topic.
- `mobile.spec.ts` runs only in the `mobile` Playwright project (390×844,
  `chromium` project ignores it) — see `playwright.config.ts`. WebKit isn't
  installed in this environment, so the mobile project deliberately reuses
  the Chromium engine with a phone-sized viewport rather than
  `devices["iPhone 13"]` (which defaults to WebKit).
- Tests assume the offline/template engine (no API key). If you add a real
  `ANTHROPIC_API_KEY`, generation still produces a schema-valid kit, but
  timing becomes network-dependent — bump `timeout` in
  `playwright.config.ts` if you see flakiness with a live key.
