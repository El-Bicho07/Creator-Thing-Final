import { describe, expect, it } from "vitest";
import { kitFileName, kitToMarkdown } from "@/lib/cta/markdown";
import { generateOffline } from "@/lib/cta/offline";
import { buildKit } from "@/lib/cta/rank";
import type { Brief, Candidate } from "@/lib/cta/schema";
import { buildStrategy } from "@/lib/cta/strategy";

function makeKit(brief: Brief, extra: Candidate[] = []) {
  const strategy = buildStrategy(brief, []);
  const candidates = [...generateOffline(brief, strategy, 1), ...extra];
  return buildKit({ brief, strategy, candidates, history: [], engine: "offline" });
}

const reel: Brief = { topic: "Monsoon skincare | oily skin", goal: "saves", format: "reel", temperature: "cold" };

describe("kitToMarkdown", () => {
  it("starts with the topic as the title and lists the brief", () => {
    const md = kitToMarkdown(makeKit(reel), {});
    expect(md.startsWith("# Instagram CTA kit: Monsoon skincare \\| oily skin")).toBe(true);
    expect(md).toContain("**Goal:** Get saves (drives Saves)");
    expect(md).toContain("**Format:** Reel");
  });

  it("puts the picked CTA for each placement in the summary table", () => {
    const kit = makeKit(reel);
    const second = kit.slots[0].candidates[1];
    const md = kitToMarkdown(kit, { [kit.slots[0].slot]: second.id });
    expect(md).toContain(`| Say it | ${second.text} |`);
  });

  it("defaults to the top option when nothing is picked", () => {
    const kit = makeKit(reel);
    expect(kitToMarkdown(kit, {})).toContain(`| Say it | ${kit.slots[0].candidates[0].text} |`);
  });

  it("marks the picked option in the full list", () => {
    const kit = makeKit(reel);
    expect(kitToMarkdown(kit, {})).toContain(`1. **${kit.slots[0].candidates[0].text}** (picked)`);
  });

  it("escapes pipes inside table cells", () => {
    const brief: Brief = { ...reel, topic: "a | b" };
    const kit = makeKit(brief, [
      { id: "x", slot: "caption_close", text: "Save this | for later", angle: "utility", mechanism: "save_later", why: "Because it helps." },
    ]);
    const md = kitToMarkdown(kit, { caption_close: "x" });
    expect(md).toContain("| Caption close | Save this \\| for later |");
  });

  it("includes Story sticker type and poll options", () => {
    const story: Brief = { topic: "Sunday reset", goal: "follows", format: "story", temperature: "warm" };
    const md = kitToMarkdown(makeKit(story), {});
    expect(md).toMatch(/Sticker type: (poll|question)/);
  });

  it("explains reach risk for watch lines", () => {
    const leads: Brief = { topic: "Budget travel", goal: "leads", format: "post", temperature: "warm", linkMethod: "keyword_dm", keyword: "TRIP" };
    const md = kitToMarkdown(makeKit(leads), {});
    expect(md).toContain("Reach risk: Watch");
    expect(md).toMatch(/Instagram has said asking for a specific word/);
  });

  it("ends with a ready-to-paste prompt for another AI", () => {
    const md = kitToMarkdown(makeKit(reel), {});
    expect(md).toContain("## Use this kit with another AI");
    expect(md).toMatch(/character limit/i);
  });
});

describe("kitFileName", () => {
  it("slugs the topic and dates the file", () => {
    const kit = makeKit({ ...reel, topic: "Monsoon Skincare: Oily Skin!" });
    expect(kitFileName(kit)).toMatch(/^cue-kit-monsoon-skincare-oily-skin-\d{4}-\d{2}-\d{2}\.md$/);
  });
});
