import { describe, expect, it } from "vitest";
import { freshness, trigramSimilarity } from "@/lib/cta/freshness";

const entry = (text: string, usedAt = "2026-09-20T10:00:00.000Z") => ({ text, usedAt });

describe("trigramSimilarity", () => {
  it("is 1 for identical text", () => {
    expect(trigramSimilarity("Save this for later", "Save this for later")).toBe(1);
  });

  it("ignores case, punctuation and emoji", () => {
    expect(trigramSimilarity("Save THIS!! 🔥", "save this")).toBe(1);
  });

  it("is 0 when either side is empty", () => {
    expect(trigramSimilarity("", "save this")).toBe(0);
  });
});

describe("freshness", () => {
  it("scores 100 when there is no history", () => {
    expect(freshness("Save this for your next leg day", []).score).toBe(100);
  });

  it("scores 0 for a CTA already used word for word", () => {
    const used = entry("Save this for your next leg day");
    const result = freshness("save this for your next leg day!", [used]);
    expect(result.score).toBe(0);
    expect(result.similarTo).toEqual(used);
  });

  it("scores an unrelated line at 80 or more", () => {
    const result = freshness("Send this to the friend who always forgets water", [
      entry("Comment GUIDE and I'll DM you the checklist"),
    ]);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("takes 15 points off for reusing the same three-word opener", () => {
    const used = entry("Save this for your next leg day");
    const text = "Save this for the long drive home";
    const base = Math.round((1 - trigramSimilarity(text, used.text)) * 100);
    const result = freshness(text, [used]);
    expect(result.sameOpener).toEqual(used);
    expect(result.score).toBe(Math.max(0, base - 15));
  });

  it("only compares against the 200 most recent entries", () => {
    const recent = Array.from({ length: 200 }, (_, i) =>
      entry(`Unrelated line number ${i} about sourdough`, `2026-09-2${i % 8}T10:00:00.000Z`),
    );
    const ancient = entry("Save this for your next leg day", "2025-01-01T00:00:00.000Z");
    expect(freshness("Save this for your next leg day", [ancient, ...recent]).score).toBeGreaterThan(50);
  });
});
