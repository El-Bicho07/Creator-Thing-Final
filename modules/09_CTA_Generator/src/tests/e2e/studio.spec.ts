import { expect, test } from "@playwright/test";
import { generateHindiKit } from "./helpers";

/**
 * Studio flow: "Try an example" fills the brief, picking a language works,
 * the form submits, and a CTA kit with multiple placement cards renders.
 */
test("try an example -> Hindi -> generate renders a CTA kit with 2+ cards", async ({ page }) => {
  await page.goto("/studio");

  await page.getByRole("button", { name: /try an example/i }).click();
  await expect(page.getByLabel("What's the post about?")).toHaveValue(/monsoon skincare/i);

  // The pill's icon sits visually over the sr-only radio input, so force the click.
  await page.getByRole("radio", { name: /^Hindi/ }).click({ force: true });
  await expect(page.getByRole("radio", { name: /^Hindi/ })).toBeChecked();

  await page.getByRole("button", { name: /generate cta kit/i }).click();

  const kitHeading = page.getByRole("heading", { name: /monsoon skincare/i });
  await expect(kitHeading).toBeVisible({ timeout: 10_000 });

  // One card-stack section per placement slot (on-screen text, spoken close, etc.)
  const slotCards = page.locator('section[aria-labelledby^="slot-"]');
  await expect(slotCards).not.toHaveCount(0);
  const count = await slotCards.count();
  expect(count).toBeGreaterThanOrEqual(2);

  // The kit shows the native-script Hindi chip.
  await expect(page.getByText("हिन्दी").first()).toBeVisible();
});
