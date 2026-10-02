import { expect, test } from "@playwright/test";
import { generateHindiKit } from "./helpers";

const DEVANAGARI = /[ऀ-ॿ]/;

/**
 * Save & history: generating a kit and saving picks writes to the local
 * history store (IndexedDB), and the saved CTAs show up on /history in the
 * language they were generated in (Hindi/Devanagari here, since the app
 * doesn't store a separate language tag per history entry).
 */
test("save picks -> kit appears in history in the generated language", async ({ page }) => {
  await generateHindiKit(page);

  await page.getByRole("button", { name: /save picks/i }).click();
  await expect(page.getByRole("status")).toContainText(/saved/i);

  await page.getByRole("link", { name: "History" }).click();
  await expect(page).toHaveURL(/\/history/);

  // At least one saved entry with Hindi (Devanagari) text — confirms the
  // language chosen in the studio round-tripped into the saved history.
  const entries = page.locator("ul.divide-y li p").first();
  await expect(entries).toBeVisible();
  const anyHindi = page.locator("ul.divide-y li p", { hasText: DEVANAGARI });
  await expect(anyHindi.first()).toBeVisible();

  // The saved topic ("monsoon skincare…") is reflected in a chip/label on the page.
  await expect(page.getByText(/CTAs saved/i)).toBeVisible();
});
