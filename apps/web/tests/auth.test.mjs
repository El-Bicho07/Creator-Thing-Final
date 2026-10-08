import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { getSupabaseToken } = await import("../.test-build/lib/supabase.js");
const { todayApi } = await import("../.test-build/lib/today-api.js");
const { studioApi } = await import("../.test-build/lib/studio-api.js");
const { listGoals } = await import("../.test-build/lib/coach-api.js");

process.env.NEXT_PUBLIC_API_URL = "https://api.test.local";

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

const mockTokenProvider = async () => "real-supabase-jwt-123";

describe("Supabase Authentication Integration", () => {
  it("getSupabaseToken returns null when window/session is undefined/null", async () => {
    const token = await getSupabaseToken();
    assert.equal(token, null);
  });

  it("API client attaches real Supabase JWT token as Bearer header", async () => {
    const calls = stubFetch([{ body: { date: "2026-10-08", items: [] } }]);
    await todayApi.getPlan(undefined, mockTokenProvider);

    assert.equal(calls[0].init.headers.Authorization, "Bearer real-supabase-jwt-123");
  });

  it("Coach API client attaches real token and never uses mock_jwt_token", async () => {
    const calls = stubFetch([{ body: [] }]);
    await listGoals(mockTokenProvider);

    assert.equal(calls[0].init.headers.Authorization, "Bearer real-supabase-jwt-123");
    assert.notEqual(calls[0].init.headers.Authorization, "Bearer mock_jwt_token");
  });

  it("Studio API client attaches real token", async () => {
    const calls = stubFetch([{ body: { sessions: [] } }]);
    await studioApi.listSessions(mockTokenProvider);

    assert.equal(calls[0].init.headers.Authorization, "Bearer real-supabase-jwt-123");
  });
});
