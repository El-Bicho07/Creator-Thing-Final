# Frontend functional tests

Added during Phase 2–4 consolidated verification. Before this, the frontend had
**no functional tests at all** — only `npm run typecheck` and `npm run build`,
neither of which can detect a client that calls the wrong endpoint, drops the auth
header, or mis-handles an error.

## Running

```bash
npm test          # builds .test-build/ then runs node --test
npm run test:build  # build only
```

## No new dependencies

The task asked not to introduce a heavyweight browser framework unless necessary.
This harness adds **zero** dependencies:

| Need | Satisfied by |
|---|---|
| Test runner | Node 24's built-in `node --test` |
| Component rendering | `react-dom/server` `renderToStaticMarkup` (already a Next dependency) |
| Type stripping / compilation | the `typescript` package already in `devDependencies` |
| Path alias resolution | `tests/build.mjs` rewrites `@/` specifiers after `tsc` emits |

## How it works

1. `tests/tsconfig.json` compiles `lib/**` plus the Today, Studio, and root page
   components to `.test-build/` as ES modules.
2. `tests/build.mjs` rewrites the `@/*` path alias into relative specifiers. `tsc`
   resolves the alias for typechecking but emits it verbatim, so without this Node
   would look for a package literally named `@/lib/api`.
3. `next/navigation` is stubbed. It exists only inside the Next bundler, and the
   pages import it for `useRouter` / `useSearchParams`.

## What is NOT covered — read this before trusting a green run

**`react-dom/server` renders the initial markup only. `useEffect` does not run.**

So these tests verify:

- that the components render at all, without throwing;
- the pre-fetch presentation (loading, empty, error regions);
- every API client behaviour (all of it is plain async code, fully exercised).

They do **not** verify post-interaction behaviour:

- clicking "Run the Producer" and seeing recommendations appear;
- a status change round-tripping through the UI;
- the Studio handoff navigating and resuming a session;
- refresh persistence from the UI's point of view.

Covering those needs a DOM — `jsdom` / `happy-dom` for component interaction, or
Playwright for real browser flows. Neither is installed, and the task said not to
add a browser framework for this work. **This is a known, deliberate gap**, not an
accident, and it should be closed before anyone claims the Today workflow is
end-to-end verified in a browser.

Backend coverage of the same behaviour does exist and is strong: see
`apps/api/tests/integration/test_today_lifecycle.py` and
`test_cross_phase_journey.py`, which drive the real HTTP API.
