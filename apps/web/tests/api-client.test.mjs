/**
 * Functional tests for the Today + Producer + Studio API clients.
 *
 * These exercise the real client code against a stubbed `fetch`, so they catch the
 * failures `tsc` cannot: a wrong path, a missing auth header, a dropped error
 * branch, or a request that leaks an owner id to the browser.
 *
 * The most important test here is `no client call ever sends a user_id`. Ownership
 * is derived from the JWT and enforced by RLS; a client that sent `user_id` would
 * be relying on something the server ignores -- or worse, something a future server
 * change might start trusting.
 */
import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

const { todayApi, producerApi } = await import("../.test-build/lib/today-api.js");
const { studioApi } = await import("../.test-build/lib/studio-api.js");
const { listGoals, createGoal, provideFeedback, listLearnings } = await import("../.test-build/lib/coach-api.js");
const { ApiError } = await import("../.test-build/lib/api.js");

process.env.NEXT_PUBLIC_API_URL = "https://api.test.local";

/** Records every call and replies with a queued response. */
function stubFetch(responses) {
  const calls = [];
  const queue = [...responses];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url, init });
    const next = queue.length > 1 ? queue.shift() : queue[0];
    const status = next.status ?? 200;
    const body = next.body === undefined ? {} : next.body;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  };
  return calls;
}

const token = async () => "jwt-abc";

beforeEach(() => {
  // Health probes bypass `request`, so they get their own default.
  stubFetch([{ status: 200, body: { ok: true } }]);
});

describe("Today client", () => {
  it("reads the plan from GET /api/today", async () => {
    const calls = stubFetch([{ body: { date: "2026-03-10", items: [], counts: {} } }]);
    await todayApi.getPlan(undefined, token);

    assert.equal(calls[0].url, "https://api.test.local/api/today");
    assert.equal(calls[0].init.method, "GET");
  });

  it("passes an explicit date as a query parameter", async () => {
    const calls = stubFetch([{ body: { date: "2026-03-10", items: [], counts: {} } }]);
    await todayApi.getPlan("2026-03-10", token);

    assert.match(calls[0].url, /\/api\/today\?date=2026-03-10$/);
  });

  it("attaches the Supabase JWT as a bearer token", async () => {
    const calls = stubFetch([{ body: {} }]);
    await todayApi.getPlan(undefined, token);

    assert.equal(calls[0].init.headers.Authorization, "Bearer jwt-abc");
    assert.equal(calls[0].init.headers["Content-Type"], "application/json");
  });

  it("omits the Authorization header when there is no session", async () => {
    const calls = stubFetch([{ body: {} }]);
    await todayApi.getPlan(undefined, async () => null);

    assert.equal(calls[0].init.headers.Authorization, undefined);
  });

  it("never sends a user_id: ownership comes from the JWT, not the browser", async () => {
    const calls = stubFetch([{ body: {} }]);

    await todayApi.getPlan(undefined, token);
    await todayApi.createPlan({ time_budget_minutes: 120 }, token);
    await todayApi.addItem({ title: "task" }, token);
    await todayApi.updateItem("11111111-1111-1111-1111-111111111111", { title: "x" }, token);
    await todayApi.setStatus("11111111-1111-1111-1111-111111111111", "completed", token);
    await todayApi.carryover(token);
    await producerApi.recommend({}, token);
    await producerApi.execute({ item_id: "abc" }, token);

    for (const call of calls) {
      const sent = `${call.url}${call.init.body ?? ""}`;
      assert.ok(!/user_id|userId|owner/i.test(sent),
        `client leaked an owner field: ${sent}`);
    }
  });

  it("creates a plan with the budget the creator chose", async () => {
    const calls = stubFetch([{ body: {} }]);
    await todayApi.createPlan({ time_budget_minutes: 45, asynchronous: false }, token);

    assert.equal(calls[0].url, "https://api.test.local/api/today/plan");
    assert.equal(calls[0].init.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      time_budget_minutes: 45,
      asynchronous: false,
    });
  });

  it("routes a status change to the dedicated transition endpoint", async () => {
    const calls = stubFetch([{ body: {} }]);
    const id = "11111111-1111-1111-1111-111111111111";
    await todayApi.setStatus(id, "in_progress", token);

    assert.equal(calls[0].url, `https://api.test.local/api/today/items/${id}/status`);
    assert.equal(calls[0].init.method, "PATCH");
    assert.deepEqual(JSON.parse(calls[0].init.body), { status: "in_progress" });
  });

  it("maps a structured API error onto ApiError with its code", async () => {
    stubFetch([{
      status: 409,
      body: { error: { code: "INVALID_TRANSITION", message: "cannot move to completed" } },
    }]);

    await assert.rejects(
      () => todayApi.setStatus("x", "completed", token),
      (err) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.status, 409);
        assert.equal(err.code, "INVALID_TRANSITION");
        assert.equal(err.message, "cannot move to completed");
        return true;
      },
    );
  });

  it("falls back to a FastAPI `detail` message when there is no error envelope", async () => {
    stubFetch([{ status: 404, body: { detail: "Today item not found" } }]);

    await assert.rejects(
      () => todayApi.updateItem("missing", { title: "x" }, token),
      (err) => {
        assert.equal(err.status, 404);
        assert.equal(err.message, "Today item not found");
        return true;
      },
    );
  });

  it("still produces a readable error when the body is not JSON", async () => {
    stubFetch([{ status: 500, body: undefined }]);
    globalThis.fetch = async () => ({
      ok: false,
      status: 502,
      json: async () => { throw new SyntaxError("Unexpected token <"); },
    });

    await assert.rejects(
      () => todayApi.getPlan(undefined, token),
      (err) => {
        assert.equal(err.status, 502);
        assert.match(err.message, /502/);
        return true;
      },
    );
  });

  it("treats 204 No Content as success with no body", async () => {
    globalThis.fetch = async () => ({ ok: true, status: 204, json: async () => null });

    const result = await todayApi.deleteItem("11111111-1111-1111-1111-111111111111", token);

    assert.equal(result, undefined);
  });
});

describe("Producer client", () => {
  it("previews recommendations without persisting anything", async () => {
    const calls = stubFetch([{ body: { recommendations: [], has_action: false } }]);
    await producerApi.recommend({ plan_date: "2026-03-10" }, token);

    assert.equal(calls[0].url, "https://api.test.local/api/producer/recommend");
    assert.equal(calls[0].init.method, "POST");
    assert.deepEqual(JSON.parse(calls[0].init.body), { plan_date: "2026-03-10" });
  });

  it("hands a Today item to Studio rather than generating content", async () => {
    const calls = stubFetch([{
      body: {
        item_id: "abc",
        studio_session_id: "sess",
        capability: "idea",
        input: { topic: "launch timing" },
      },
    }]);

    const handoff = await producerApi.execute(
      { item_id: "abc", studio_session_id: null },
      token,
    );

    assert.equal(calls[0].url, "https://api.test.local/api/producer/execute");
    // The handoff response carries capability + session, and no generated body.
    assert.equal(handoff.capability, "idea");
    assert.equal(handoff.studio_session_id, "sess");
    assert.equal(handoff.output, undefined);
    assert.ok(!("output_text" in handoff));
  });
});

describe("Studio client", () => {
  it("starts a session and keeps it addressable", async () => {
    const calls = stubFetch([{ body: { id: "sess-1", title: "reel" } }]);
    await studioApi.createSession({ title: "reel", brief: "launch timing" }, token);

    assert.equal(calls[0].url, "https://api.test.local/api/studio/sessions");
    assert.equal(calls[0].init.method, "POST");
  });

  it("generates through the platform, not a provider SDK", async () => {
    const calls = stubFetch([{ body: { generation_id: "g1", version: 1 } }]);
    await studioApi.generate({
      session_id: "sess-1",
      capability: "idea",
      input: { topic: "launch timing", count: 3 },
    }, token);

    assert.equal(calls[0].url, "https://api.test.local/api/studio/generate");
    // The browser talks only to the platform origin. A provider hostname or SDK
    // path here would mean a key shipped to the client.
    const { hostname, pathname } = new URL(calls[0].url);
    assert.equal(hostname, "api.test.local");
    assert.ok(!/(openai|anthropic|generativelanguage|mistral|cohere)/i.test(pathname));
  });
});

describe("Coach client", () => {
  it("fetches goals from GET /api/coach/goals", async () => {
    const calls = stubFetch([{ body: [] }]);
    await listGoals(token);

    assert.equal(calls[0].url, "https://api.test.local/api/coach/goals");
    assert.equal(calls[0].init.method, "GET");
  });

  it("posts new goal to /api/coach/goals", async () => {
    const calls = stubFetch([{ body: { id: "g-1", title: "Hook practice", category: "hook_retention" } }]);
    await createGoal(token, { title: "Hook practice", category: "hook_retention" });

    assert.equal(calls[0].url, "https://api.test.local/api/coach/goals");
    assert.equal(calls[0].init.method, "POST");
  });

  it("requests feedback from /api/coach/feedback", async () => {
    const calls = stubFetch([{ body: { id: "f-1", observation: "Good hook" } }]);
    await provideFeedback(token, { session_topic: "Hook critique" });

    assert.equal(calls[0].url, "https://api.test.local/api/coach/feedback");
    assert.equal(calls[0].init.method, "POST");
  });

  it("fetches learnings from /api/learning", async () => {
    const calls = stubFetch([{ body: [] }]);
    await listLearnings(token);

    assert.equal(calls[0].url, "https://api.test.local/api/learning");
    assert.equal(calls[0].init.method, "GET");
  });
});

describe("health probes", () => {
  it("reports liveness for both new surfaces without a token", async () => {
    stubFetch([{ body: { status: "ok" } }]);
    const today = await todayApi.health();
    const producer = await producerApi.health();

    assert.equal(today.status, "ok");
    assert.equal(producer.status, "ok");
  });
});
