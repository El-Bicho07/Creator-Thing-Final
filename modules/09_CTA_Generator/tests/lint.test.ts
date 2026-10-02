import { describe, expect, it } from "vitest";
import { lintCta } from "@/lib/cta/lint";
import type { SlotId, Temperature } from "@/lib/cta/taxonomy";

const lint = (text: string, slot: SlotId = "caption_close", temperature: Temperature = "warm", avoid?: string[]) =>
  lintCta({ text, slot, temperature, avoid });

describe("lintCta reach risk", () => {
  it.each([
    "Tag a friend who needs this",
    "Double tap if you agree",
    "Like this if you're a morning person",
    "Comment YES if this is you",
    "Comment 1 for mornings, 2 for evenings",
    "Drop a 🔥 if you're in",
    "Share this so more people see it",
    "Help this go viral",
    "Giveaway! To enter, follow and comment",
    "Follow for follow",
    "अपने दोस्त को टैग करो",
    "உங்க ஃப்ரெண்டை டேக் பண்ணுங்க",
    "ఫ్రెండ్‌ని ట్యాగ్ చేయండి",
    "ಫ್ರೆಂಡ್‌ನ ಟ್ಯಾಗ್ ಮಾಡಿ",
    "বন্ধুকে ট্যাগ করুন",
    "मित्राला टॅग करा",
    "लाइक करो अगर सहमत हो",
  ])("flags %j as risky", (text) => {
    const result = lint(text);
    expect(result.risk).toBe("risky");
    expect(result.riskReasons.length).toBeGreaterThan(0);
  });

  it.each([
    "Comment GUIDE and I'll DM it to you",
    "Comment PLAN for the full list",
    "GUIDE comment karo, DM mein aa jayega",
    "GUIDE कमेंट करें, प्लान DM में आ जाएगा",
    "PLANனு கமெண்ட் பண்ணுங்க",
    "PLAN ಅಂತ ಕಾಮೆಂಟ್ ಮಾಡಿ",
    "Share this with a friend",
  ])("flags %j as watch", (text) => {
    expect(lint(text).risk).toBe("watch");
  });

  it("flags a hard sell to a cold audience as watch with a temperature issue", () => {
    const result = lint("DM me to buy the course", "caption_close", "cold");
    expect(result.risk).toBe("watch");
    expect(result.issues.map((i) => i.kind)).toContain("temperature");
  });

  it("allows the same hard sell for a hot audience", () => {
    expect(lint("DM me to buy the course", "caption_close", "hot").risk).toBe("safe");
  });

  it.each([
    "Save this for your next leg day",
    "Send this to the friend who always forgets water",
    "What's the one stretch you never skip?",
    "Tagging along? Here's part 2",
    "I like this if it's quick",
    "Comment below if you've tried this",
  ])("does not flag %j as risky", (text) => {
    expect(lint(text).risk).not.toBe("risky");
  });

  it("keeps only the risky reason when a line is both vote bait and a keyword ask", () => {
    const result = lint("Comment YES if this is you");
    expect(result.riskReasons).toHaveLength(1);
  });
});

describe("lintCta issues", () => {
  const kinds = (text: string, slot?: SlotId, temperature?: Temperature, avoid?: string[]) =>
    lint(text, slot, temperature, avoid).issues.map((i) => i.kind);

  it("flags text over the slot's character limit", () => {
    expect(kinds("This is far too long for on-screen text", "reel_onscreen")).toContain("length");
  });

  it("flags text over the slot's word limit", () => {
    expect(kinds("Save it now for later", "reel_onscreen")).not.toContain("length");
    expect(kinds("Save it now for later please", "reel_onscreen")).toContain("length");
  });

  it("flags three asks stacked in one caption line", () => {
    expect(kinds("Save, share and follow for more")).toContain("stacked");
  });

  it("flags two asks stacked in a short slot", () => {
    expect(kinds("Save it. Follow me.", "reel_onscreen")).toContain("stacked");
  });

  it("flags overused creator defaults", () => {
    expect(kinds("Save, share and follow for more")).toContain("overused");
    expect(kinds("Link in bio")).toContain("overused");
  });

  it("does not flag a link-in-bio line that gives a reason", () => {
    expect(kinds("The full 7-day plan is free at the link in my bio")).not.toContain("overused");
  });

  it("flags stock AI phrases", () => {
    expect(kinds("Let's dive in — this is a game-changer")).toContain("cliche");
  });

  it("flags more than two emoji", () => {
    expect(kinds("Save this 🔥🔥🔥")).toContain("emoji");
  });

  it("flags phrases from the voice profile's avoid list", () => {
    expect(kinds("Hey fam, save this one", "caption_close", "warm", ["hey fam"])).toContain("avoid");
  });

  it("returns no issues for a clean line", () => {
    expect(kinds("Save this for your next leg day")).toEqual([]);
  });
});
