/**
 * Generated-TypeScript-contract verification.
 *
 * `lib/studio-contracts.ts` is generated from the live OpenAPI document by
 * `scripts/generate_studio_contracts.py`. Phase 2-4 verification flagged that
 * "typecheck passed" is *not* evidence those types are current: `tsc` happily
 * compiles a client written against a stale contract as long as that client is
 * internally consistent.
 *
 * These tests assert the chain the architecture depends on:
 *
 *     API schema -> generated TypeScript types -> frontend imports -> real usage
 *
 * The first two links are also checked in Python by
 * `tests/unit/test_studio_contract_generation.py`, which compares the committed file
 * against a live regeneration. These tests cover the links that file cannot see:
 * that the frontend actually consumes the generated module, and does not restate a
 * schema by hand.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(webRoot, rel), "utf8");

describe("generated contracts", () => {
  it("ships the generated contract module", () => {
    const contracts = read("lib/studio-contracts.ts");
    assert.ok(contracts.length > 0);
    assert.match(contracts, /TodayItemStatus/, "Today item types are missing");
    assert.match(contracts, /ProducerRecommendation/, "Producer types are missing");
  });

  it("declares itself as generated, so nobody hand-edits it", () => {
    const contracts = read("lib/studio-contracts.ts");
    assert.match(contracts, /generated/i, "no generated-file banner to discourage edits");
  });

  it("is what the Today/Producer client imports its types from", () => {
    const client = read("lib/today-api.ts");

    assert.match(
      client,
      /from\s+"@\/lib\/studio-contracts"/,
      "today-api.ts must source its types from the generated module",
    );
    assert.match(
      client,
      /GENERATED from the live OpenAPI spec/,
      "the provenance comment was dropped",
    );
  });

  it("does not restate a schema by hand in the client", () => {
    const client = read("lib/today-api.ts");

    // An inline `interface TodayItem` or a hand-written status union would be a
    // second source of truth that drifts silently.
    assert.ok(!/interface\s+TodayItem\b/.test(client), "client re-declares TodayItem");
    assert.ok(!/type\s+TodayItemStatus\s*=/.test(client), "client re-declares the status union");
  });

  it("covers all five Today item states the UI renders", () => {
    const contracts = read("lib/studio-contracts.ts");
    for (const status of ["planned", "in_progress", "completed", "skipped", "blocked"]) {
      assert.match(contracts, new RegExp(`"${status}"`), `contract lost the ${status} state`);
    }
  });
});
