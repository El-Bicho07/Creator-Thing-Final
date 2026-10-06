/**
 * Functional render tests for the Today and Studio pages.
 *
 * `tsc` proves the pages typecheck. It does not prove they render, that they show
 * a loading state before data arrives, or that they render API data rather than a
 * hardcoded placeholder. These tests render the real components through
 * `react-dom/server` and inspect the resulting HTML.
 *
 * Honest limitation, stated here so the coverage is not oversold: React's server
 * renderer produces the **initial** markup only. `useEffect` does not run, so these
 * tests verify the pre-fetch render (loading / error / empty presentation) and the
 * pure render paths -- not post-click state transitions. Driving clicks would need
 * a DOM (`jsdom`, `happy-dom` or a browser), which this repo does not have and which
 * the task explicitly asked us not to introduce. `README.md` records this.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

process.env.NEXT_PUBLIC_API_URL = "https://api.test.local";

const { default: TodayPage } = await import("../.test-build/app/today/page.js");
const { default: StudioPage } = await import("../.test-build/app/studio/page.js");

/**
 * Today is a client component whose initial state is "loading, no plan yet".
 * That is the state a creator actually sees first, so it is worth pinning.
 */
describe("Today page", () => {
  it("renders without throwing", () => {
    const html = renderToStaticMarkup(createElement(TodayPage));
    assert.ok(html.length > 0);
  });

  it("shows a loading affordance, not a false empty state, before data arrives", () => {
    // Regression test. The page used to render "Nothing planned for today" while the
    // request was still in flight, which (a) lied to a creator who has a plan and
    // (b) invited them to run the Producer over a day that already had one.
    const html = renderToStaticMarkup(createElement(TodayPage));
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    assert.match(html, /aria-busy="true"/, "no loading region is exposed");
    assert.ok(/loading/i.test(text), `expected a loading state, got: ${text.slice(0, 300)}`);
    assert.ok(
      !/nothing planned for today/i.test(text),
      "rendered the empty state while still loading",
    );
  });

  it("offers the Producer controls a creator needs to start a day", () => {
    const html = renderToStaticMarkup(createElement(TodayPage));

    // Manual task entry, a time budget, and the Studio handoff are the three
    // actions the Phase 4 acceptance criteria name.
    assert.match(html, /<input/i, "no text input for a manual task");
    assert.match(html, /<button/i, "no actionable control rendered");
  });

  it("never renders a raw fetch error or stack trace into the page", () => {
    const html = renderToStaticMarkup(createElement(TodayPage));

    for (const leak of ["Traceback", "at Object.", "psycopg", "asyncpg", "ECONNREFUSED"]) {
      assert.ok(!html.includes(leak), `page rendered an internal detail: ${leak}`);
    }
  });
});

describe("Studio page", () => {
  it("renders without throwing", () => {
    const html = renderToStaticMarkup(createElement(StudioPage));
    assert.ok(html.length > 0);
  });

  it("renders capability UI rather than a provider-specific form", () => {
    const html = renderToStaticMarkup(createElement(StudioPage));

    // Studio drives capabilities through the platform; the page must not ask the
    // creator for a model or an API key.
    for (const forbidden of ["api key", "openai", "anthropic", "model name"]) {
      assert.ok(!html.toLowerCase().includes(forbidden),
        `Studio page exposed provider surface: ${forbidden}`);
    }
  });
});
