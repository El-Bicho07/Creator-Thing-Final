/**
 * Sign-out must leave the authenticated page.
 *
 * Regression test for a defect found by runtime audit: `signOut()` cleared the
 * Supabase session but never navigated, so the creator stayed on `/today` with
 * their already-fetched plan still rendered. The nav flipped to "Sign In" while
 * the page kept displaying that creator's private task list — on a shared
 * machine the previous user's data stayed on screen after signing out.
 *
 * Clearing a session is not the same as leaving the page: the fetched data lives
 * in React state, not in the session.
 *
 * Scope: the `next/navigation` stub records navigation calls, so these tests
 * assert that the code under test *requests* the redirect. It cannot perform a
 * real client-side transition, so this deliberately asserts intent, not a
 * rendered result.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

const { AuthProvider, useAuth } = await import("../.test-build/lib/auth-context.js");
const { supabase } = await import("../.test-build/lib/supabase.js");
const { __navigations, __resetNavigations } = await import(
  "../.test-build/__stubs__/next-navigation.js"
);

/** Render the real `AuthProvider` and return the context it publishes. */
async function renderAuthContext() {
  const { createElement } = await import("react");
  const { renderToReadableStream } = await import("react-dom/server.edge");

  let captured;
  function Probe() {
    captured = useAuth();
    return null;
  }

  const stream = await renderToReadableStream(
    createElement(AuthProvider, null, createElement(Probe)),
  );
  await stream.allReady;
  return captured;
}

describe("sign-out navigation", () => {
  let signOutCalled = false;

  beforeEach(() => {
    __resetNavigations();
    signOutCalled = false;
    // Stub only the Supabase call; the navigation is the real production path.
    supabase.auth.signOut = async () => {
      signOutCalled = true;
      return { error: null };
    };
  });

  it("clears the Supabase session when signing out", async () => {
    const ctx = await renderAuthContext();
    await ctx.signOut();
    assert.equal(signOutCalled, true, "supabase.auth.signOut() must be called");
  });

  it("navigates away from the authenticated page on sign-out", async () => {
    const ctx = await renderAuthContext();
    await ctx.signOut();

    const pushed = __navigations.filter((n) => n.method === "push");
    assert.ok(
      pushed.length > 0,
      "signOut() must navigate; otherwise the signed-out creator stays on the page " +
        "with their previously fetched data still rendered",
    );
    assert.equal(pushed.at(-1).href, "/login", "sign-out must land on the login page");
  });

  it("refreshes the router so cached authenticated HTML is dropped", async () => {
    const ctx = await renderAuthContext();
    await ctx.signOut();
    assert.ok(
      __navigations.some((n) => n.method === "refresh"),
      "sign-out must call router.refresh() so no cached view of the page survives",
    );
  });
});