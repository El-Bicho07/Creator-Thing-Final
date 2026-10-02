import { describe, expect, it } from "vitest";
import type { Brief, HistoryEntry } from "@/lib/cta/schema";
import { buildStrategy, overusedPhrases } from "@/lib/cta/strategy";

const brief = (overrides: Partial<Brief> = {}): Brief => ({
  topic: "5-minute desk stretches",
  goal: "saves",
  format: "reel",
  temperature: "warm",
  ...overrides,
});

let seq = 0;
const used = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => {
  seq++;
  return {
    id: `h${seq}`,
    text: `Some earlier line ${seq}`,
    slot: "caption_close",
    angle: "utility",
    mechanism: "save_later",
    goal: "saves",
    format: "reel",
    topic: "stretches",
    usedAt: new Date(Date.UTC(2026, 8, 1, 0, seq)).toISOString(),
    ...overrides,
  };
};

describe("buildStrategy", () => {
  it("uses the format's slots in order", () => {
    expect(buildStrategy(brief(), []).slots).toEqual([
      "reel_spoken",
      "reel_onscreen",
      "caption_opener",
      "caption_close",
    ]);
  });

  it("keeps a cold audience soft and never uses urgency", () => {
    const strategy = buildStrategy(brief({ temperature: "cold", goal: "sales" }), []);
    expect(strategy.intensity).toBe("soft");
    expect(strategy.angles).not.toContain("urgency");
  });

  it("lets a hot audience be direct", () => {
    expect(buildStrategy(brief({ temperature: "hot" }), []).intensity).toBe("direct");
  });

  it("leads with the goal's natural angle when there is no history", () => {
    expect(buildStrategy(brief(), []).angles[0]).toBe("utility");
  });

  it("moves the most recently used angle to the back", () => {
    const history = [used({ angle: "series" }), used({ angle: "utility" })];
    const { angles } = buildStrategy(brief(), history);
    expect(angles[0]).not.toBe("utility");
    expect(angles).not.toContain("utility");
  });

  it("returns at most five angles", () => {
    expect(buildStrategy(brief(), []).angles.length).toBeLessThanOrEqual(5);
  });

  it("adds the comment-keyword mechanism and a reach note for keyword_dm leads", () => {
    const strategy = buildStrategy(brief({ goal: "leads", linkMethod: "keyword_dm", keyword: "GUIDE" }), []);
    expect(strategy.mechanisms[0]).toBe("comment_keyword");
    expect(strategy.notes.join(" ")).toMatch(/recommend/i);
  });

  it("uses the link sticker, not the bio, for Story link taps", () => {
    const strategy = buildStrategy(brief({ goal: "clicks", format: "story" }), []);
    expect(strategy.mechanisms).toContain("link_sticker");
    expect(strategy.mechanisms).not.toContain("link_bio");
  });

  it("drops sticker prompts outside Stories", () => {
    expect(buildStrategy(brief({ goal: "conversation", format: "post" }), []).mechanisms).not.toContain(
      "sticker_prompt",
    );
  });

  it("only offers caption links when the creator has them", () => {
    expect(buildStrategy(brief({ goal: "clicks" }), []).mechanisms).not.toContain("caption_link");
    expect(buildStrategy(brief({ goal: "clicks", linkMethod: "caption_link" }), []).mechanisms[0]).toBe(
      "caption_link",
    );
  });

  it("avoids phrases the creator keeps repeating and their voice avoid list", () => {
    const history = [1, 2, 3, 4].map((n) => used({ text: `Save this for leg day number ${n}` }));
    const strategy = buildStrategy(brief(), history, {
      samples: [],
      emoji: "light",
      tone: "casual",
      avoid: ["hey fam"],
      updatedAt: "2026-09-28T00:00:00.000Z",
    });
    expect(strategy.avoid).toContain("save this for");
    expect(strategy.avoid).toContain("hey fam");
  });
});

describe("overusedPhrases", () => {
  it("ignores phrases used fewer than three times", () => {
    const history = [used({ text: "Send this to your sister" }), used({ text: "Send this to your sister" })];
    expect(overusedPhrases(history)).toEqual([]);
  });

  it("ignores phrases made only of filler words", () => {
    const history = [1, 2, 3].map((n) => used({ text: `this is for you ${n}` }));
    expect(overusedPhrases(history).map((p) => p.phrase)).not.toContain("this is for");
  });

  it("keeps the longer phrase instead of its fragments", () => {
    const history = [1, 2, 3].map((n) => used({ text: `Save this for trip ${n}` }));
    const phrases = overusedPhrases(history).map((p) => p.phrase);
    expect(phrases).toContain("save this for");
    expect(phrases).not.toContain("save this");
  });
});
