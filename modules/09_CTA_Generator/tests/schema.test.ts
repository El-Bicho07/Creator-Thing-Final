import { describe, expect, it } from "vitest";
import { BriefSchema } from "@/lib/cta/schema";
import { FORMATS, GOALS, SLOTS } from "@/lib/cta/taxonomy";
import { charCount, emojiCount, firstWords, normalize, wordCount } from "@/lib/cta/text";

const base = {
  topic: "5-minute desk stretches",
  goal: "saves",
  format: "reel",
  temperature: "warm",
} as const;

describe("BriefSchema", () => {
  it("accepts a minimal valid brief", () => {
    expect(BriefSchema.safeParse(base).success).toBe(true);
  });

  it("trims and upper-cases the keyword", () => {
    expect(BriefSchema.parse({ ...base, keyword: "guide " }).keyword).toBe("GUIDE");
  });

  it("treats an empty keyword as no keyword", () => {
    expect(BriefSchema.parse({ ...base, keyword: "  " }).keyword).toBeUndefined();
  });

  it("rejects a topic shorter than 3 characters", () => {
    expect(BriefSchema.safeParse({ ...base, topic: "ab" }).success).toBe(false);
  });

  it("rejects a topic longer than 80 characters", () => {
    expect(BriefSchema.safeParse({ ...base, topic: "a".repeat(81) }).success).toBe(false);
  });

  it("requires a keyword when the link method is keyword_dm", () => {
    const result = BriefSchema.safeParse({ ...base, linkMethod: "keyword_dm" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["keyword"]);
  });

  it("requires a keyword when the link method is dm", () => {
    expect(BriefSchema.safeParse({ ...base, linkMethod: "dm" }).success).toBe(false);
  });

  it("rejects keywords with spaces or symbols", () => {
    expect(BriefSchema.safeParse({ ...base, keyword: "free guide!" }).success).toBe(false);
  });
});

describe("taxonomy", () => {
  it("defines every slot a format uses", () => {
    for (const format of Object.values(FORMATS)) {
      for (const slot of format.slots) expect(SLOTS[slot]).toBeDefined();
    }
  });

  it("gives every goal at least one mechanism", () => {
    for (const goal of Object.values(GOALS)) expect(goal.mechanisms.length).toBeGreaterThan(0);
  });
});

describe("text helpers", () => {
  it("counts an emoji as one character", () => {
    expect(charCount("hi 👋🏽")).toBe(4);
  });

  it("counts words separated by any whitespace", () => {
    expect(wordCount("  save   this\nfor later ")).toBe(4);
  });

  it("counts emoji, including sequences, once each", () => {
    expect(emojiCount("Save this 🔥🔥 👩‍💻")).toBe(3);
  });

  it("normalizes case, punctuation and emoji away", () => {
    expect(normalize("Save THIS — for later! 🔥")).toBe("save this for later");
  });

  it("returns the first n normalized words", () => {
    expect(firstWords("Save this, friend. Please", 3)).toBe("save this friend");
  });
});
