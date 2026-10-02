import { describe, expect, it } from "vitest";
import { lintCta } from "@/lib/cta/lint";
import { generateOffline, rewriteOffline } from "@/lib/cta/offline";
import type { Brief } from "@/lib/cta/schema";
import { buildStrategy } from "@/lib/cta/strategy";
import { FORMAT_IDS, GOAL_IDS, LANGUAGE_IDS, SLOTS, TEMPERATURE_IDS } from "@/lib/cta/taxonomy";
import { TEMPLATES } from "@/lib/cta/templates";
import { charCount, wordCount } from "@/lib/cta/text";

const TOPIC = "5-minute desk stretches for people who sit all day";

const brief = (overrides: Partial<Brief> = {}): Brief => ({
  topic: TOPIC,
  goal: "saves",
  format: "reel",
  temperature: "warm",
  ...overrides,
});

const run = (b: Brief, seed = 1) => {
  const strategy = buildStrategy(b, []);
  return { strategy, candidates: generateOffline(b, strategy, seed) };
};

const templateOf = (candidateId: string) => TEMPLATES.find((t) => t.id === candidateId.split(":")[1]);

const combos = GOAL_IDS.flatMap((goal) =>
  FORMAT_IDS.flatMap((format) => TEMPERATURE_IDS.map((temperature) => ({ goal, format, temperature }))),
);

describe("generateOffline", () => {
  it.each(combos)("fills every slot within limits without risky lines: $goal/$format/$temperature", (combo) => {
    const b = brief(combo);
    const { strategy, candidates } = run(b);
    for (const slot of strategy.slots) {
      expect(candidates.some((c) => c.slot === slot), `no candidate for ${slot}`).toBe(true);
    }
    for (const c of candidates) {
      const spec = SLOTS[c.slot];
      expect(charCount(c.text), c.text).toBeLessThanOrEqual(spec.maxChars);
      if (spec.maxWords) expect(wordCount(c.text), c.text).toBeLessThanOrEqual(spec.maxWords);
      expect(lintCta({ text: c.text, slot: c.slot, temperature: b.temperature }).risk, c.text).not.toBe("risky");
      expect(c.text).not.toMatch(/[{}]/);
    }
  });

  it("returns at most three candidates per slot, each with different text", () => {
    const { strategy, candidates } = run(brief());
    for (const slot of strategy.slots) {
      const texts = candidates.filter((c) => c.slot === slot).map((c) => c.text);
      expect(texts.length).toBeLessThanOrEqual(3);
      expect(new Set(texts).size).toBe(texts.length);
    }
  });

  it("is deterministic for the same seed", () => {
    expect(run(brief(), 7).candidates).toEqual(run(brief(), 7).candidates);
  });

  it("changes at least one first pick across seeds", () => {
    const firstPicks = (seed: number) => {
      const { strategy, candidates } = run(brief(), seed);
      return strategy.slots.map((slot) => candidates.find((c) => c.slot === slot)?.text).join("|");
    };
    const seeds = [2, 3, 4, 5, 6].map(firstPicks);
    expect(seeds.some((picks) => picks !== firstPicks(1))).toBe(true);
  });

  it("leads each slot with the strategy's freshest angle when it has a template", () => {
    const { strategy, candidates } = run(brief());
    expect(candidates.find((c) => c.slot === "caption_close")?.angle).toBe(strategy.angles[0]);
  });

  it("never uses keyword templates without a keyword", () => {
    const { candidates } = run(brief({ goal: "leads" }));
    for (const c of candidates) expect(templateOf(c.id)?.needs ?? []).not.toContain("keyword");
  });

  it("uses the keyword when there is one", () => {
    const { candidates } = run(brief({ goal: "leads", linkMethod: "dm", keyword: "PLAN" }));
    expect(candidates.some((c) => c.text.includes("PLAN"))).toBe(true);
  });

  it("mentions the topic somewhere in the kit", () => {
    const { candidates } = run(brief());
    expect(candidates.some((c) => c.text.toLowerCase().includes(TOPIC.toLowerCase()))).toBe(true);
  });

  it("uses the audience when one is given", () => {
    const { candidates } = run(brief({ goal: "sales", audience: "new runners", topic: "trail shoes" }));
    expect(candidates.some((c) => c.text.includes("new runners"))).toBe(true);
  });

  it("lower-cases a capitalised topic inside a sentence", () => {
    const { candidates } = run(brief({ topic: "Desk stretches" }));
    expect(candidates.some((c) => c.text.includes("desk stretches"))).toBe(true);
  });

  it("copes with an emoji topic", () => {
    const { candidates } = run(brief({ topic: "☕ morning routine" }));
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) expect(c.text).not.toMatch(/[{}]/);
  });

  it("gives Story stickers a type and a label that matches the text", () => {
    const { candidates } = run(brief({ format: "story", goal: "conversation" }));
    const sticker = candidates.find((c) => c.slot === "story_sticker");
    expect(sticker?.sticker?.type).toBeDefined();
    expect(sticker?.sticker?.label).toBe(sticker?.text);
  });

  it("explains every pick", () => {
    for (const c of run(brief()).candidates) expect(c.why.length).toBeGreaterThan(10);
  });
});

describe("rewriteOffline", () => {
  it("returns a different, safe line for the same slot", () => {
    const b = brief();
    const original = run(b).candidates.find((c) => c.slot === "caption_close")!;
    const rewrite = rewriteOffline(b, original, "safer", 1);
    expect(rewrite?.slot).toBe("caption_close");
    expect(rewrite?.text).not.toBe(original.text);
    expect(lintCta({ text: rewrite!.text, slot: "caption_close", temperature: "warm" }).risk).toBe("safe");
  });

  it("switches angle when asked for something fresher", () => {
    const b = brief();
    const original = run(b).candidates.find((c) => c.slot === "caption_close")!;
    expect(rewriteOffline(b, original, "fresher", 1)?.angle).not.toBe(original.angle);
  });

  it("rewrites Hinglish kits in Hinglish", () => {
    const b = brief({ language: "hinglish" });
    const original = run(b).candidates.find((c) => c.slot === "caption_close")!;
    const rewrite = rewriteOffline(b, original, "fresher", 3)!;
    expect(templateOf(rewrite.id)?.lang).toBe("hinglish");
  });
});

describe("Hinglish templates", () => {
  it.each(combos)("fill every slot with a Hinglish first pick: $goal/$format/$temperature", (combo) => {
    const b = brief({ ...combo, language: "hinglish" });
    const { strategy, candidates } = run(b);
    for (const slot of strategy.slots) {
      const first = candidates.find((c) => c.slot === slot);
      expect(first, `no candidate for ${slot}`).toBeDefined();
      expect(templateOf(first!.id)?.lang, `${slot}: ${first!.text}`).toBe("hinglish");
    }
    for (const c of candidates) {
      const spec = SLOTS[c.slot];
      expect(charCount(c.text), c.text).toBeLessThanOrEqual(spec.maxChars);
      if (spec.maxWords) expect(wordCount(c.text), c.text).toBeLessThanOrEqual(spec.maxWords);
      expect(lintCta({ text: c.text, slot: c.slot, temperature: b.temperature }).risk, c.text).not.toBe("risky");
    }
  });

  it("keeps English kits in English", () => {
    for (const c of run(brief()).candidates) expect(templateOf(c.id)?.lang).toBeUndefined();
  });
});

const REGIONAL = ["hi", "bn", "mr", "te", "ta", "kn"] as const;
const SCRIPT: Record<(typeof REGIONAL)[number], RegExp> = {
  hi: /\p{Script=Devanagari}/u,
  mr: /\p{Script=Devanagari}/u,
  bn: /\p{Script=Bengali}/u,
  te: /\p{Script=Telugu}/u,
  ta: /\p{Script=Tamil}/u,
  kn: /\p{Script=Kannada}/u,
};

describe.each(REGIONAL)("%s templates", (language) => {
  it.each(combos)("fill every slot with a native-script first pick: $goal/$format/$temperature", (combo) => {
    const b = brief({ ...combo, language });
    const { strategy, candidates } = run(b);
    for (const slot of strategy.slots) {
      const first = candidates.find((c) => c.slot === slot);
      expect(first, `no candidate for ${slot}`).toBeDefined();
      expect(templateOf(first!.id)?.lang, `${slot}: ${first!.text}`).toBe(language);
      expect(first!.text, first!.text).toMatch(SCRIPT[language]);
    }
    for (const c of candidates) {
      const spec = SLOTS[c.slot];
      expect(charCount(c.text), c.text).toBeLessThanOrEqual(spec.maxChars);
      if (spec.maxWords) expect(wordCount(c.text), c.text).toBeLessThanOrEqual(spec.maxWords);
    }
  });

  it("uses the keyword in DM asks", () => {
    const { candidates } = run(brief({ goal: "leads", linkMethod: "dm", keyword: "PLAN", language }));
    expect(candidates.some((c) => c.text.includes("PLAN"))).toBe(true);
  });
});

describe("context from the post", () => {
  it("picks up a list count from the details", () => {
    const { candidates } = run(brief({ topic: "Oily skin routine", details: "A 3-step routine: cleanser, serum, sunscreen." }));
    expect(candidates.some((c) => c.text.includes("3 steps"))).toBe(true);
  });

  it("picks up a duration from the topic", () => {
    const { candidates } = run(brief({ topic: "10-minute desk workout" }));
    expect(candidates.some((c) => c.text.includes("10 minutes"))).toBe(true);
  });

  it("does not invent a count when there isn't one", () => {
    const { candidates } = run(brief({ topic: "Morning routine" }));
    for (const c of candidates) expect(c.text).not.toMatch(/\b\d+ (steps|minutes)\b/);
  });
});

describe("history and regeneration", () => {
  it("steers away from a line already used", () => {
    const b = brief();
    const first = run(b).candidates.find((c) => c.slot === "caption_close")!;
    const strategy = buildStrategy(b, []);
    const used = [{ text: first.text, usedAt: "2026-09-27T10:00:00.000Z" }];
    const next = generateOffline(b, strategy, 1, used).find((c) => c.slot === "caption_close")!;
    expect(next.text).not.toBe(first.text);
  });

  it("gives mostly new lines when regenerating with the next seed", () => {
    const b = brief();
    const texts = (seed: number) => run(b, seed).candidates.filter((c) => c.slot === "caption_close").map((c) => c.text);
    const before = texts(1);
    const after = texts(2);
    expect(after.filter((t) => !before.includes(t)).length).toBeGreaterThanOrEqual(2);
  });
});

describe("stress: awkward topics never break a kit", () => {
  const topics = [
    "☕🔥 chai",
    "सुबह की दिनचर्या",
    "A".repeat(80),
    "How I paid off ₹4,00,000 of debt in 18 months without a side hustle (really)",
    "SEO",
  ];
  it.each(topics.flatMap((topic) => combos.map((combo) => ({ topic, ...combo }))))(
    "$topic · $goal/$format/$temperature",
    ({ topic, ...combo }) => {
      for (const language of LANGUAGE_IDS) {
        const b = brief({ ...combo, topic, language });
        const { strategy, candidates } = run(b, 4);
        for (const slot of strategy.slots) expect(candidates.some((c) => c.slot === slot), slot).toBe(true);
        for (const c of candidates) {
          expect(c.text).not.toMatch(/[{}]|undefined|null/);
          expect(charCount(c.text)).toBeLessThanOrEqual(SLOTS[c.slot].maxChars);
          expect(lintCta({ text: c.text, slot: c.slot, temperature: b.temperature }).risk).not.toBe("risky");
        }
      }
    },
  );
});
