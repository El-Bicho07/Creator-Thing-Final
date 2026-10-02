import { expect, test } from "@playwright/test";
import { generateHindiKit } from "./helpers";

/**
 * Deck interaction: chevrons, arrow keys and dots all flip through the
 * stacked CTA candidates and stay in sync with the "n of total" counter.
 */
test("arrow buttons, arrow keys and dots flip cards", async ({ page }) => {
  await generateHindiKit(page);

  // First stack that actually has multiple candidates (nav controls only render when n > 1).
  const deck = page.locator('[role="group"][aria-roledescription="card stack"]').filter({
    has: page.getByRole("button", { name: "Next option" }),
  }).first();
  await expect(deck).toBeVisible();

  const counter = deck.locator('span[aria-live="polite"]');
  const readCurrent = async () => {
    const text = (await counter.textContent()) ?? "";
    const match = text.match(/(\d+) of (\d+)/);
    if (!match) throw new Error(`Unexpected counter text: "${text}"`);
    return { current: Number(match[1]), total: Number(match[2]) };
  };

  const start = await readCurrent();
  expect(start.total).toBeGreaterThan(1);

  // Chevron: next
  await deck.getByRole("button", { name: "Next option" }).click();
  let after = await readCurrent();
  expect(after.current).toBe((start.current % start.total) + 1);

  // Chevron: prev, back to start
  await deck.getByRole("button", { name: "Previous option" }).click();
  after = await readCurrent();
  expect(after.current).toBe(start.current);

  // Arrow keys: focus something inside the deck so the keydown bubbles to the group.
  await deck.getByRole("button", { name: "Previous option" }).focus();
  await page.keyboard.press("ArrowRight");
  after = await readCurrent();
  expect(after.current).toBe((start.current % start.total) + 1);

  await page.keyboard.press("ArrowLeft");
  after = await readCurrent();
  expect(after.current).toBe(start.current);

  // Dots: jump straight to the last option.
  const dots = deck.getByRole("button", { name: /^Show option \d+$/ });
  const dotCount = await dots.count();
  expect(dotCount).toBe(start.total);
  await dots.nth(dotCount - 1).click();
  after = await readCurrent();
  expect(after.current).toBe(dotCount);
  await expect(dots.nth(dotCount - 1)).toHaveAttribute("aria-current", "true");
});
