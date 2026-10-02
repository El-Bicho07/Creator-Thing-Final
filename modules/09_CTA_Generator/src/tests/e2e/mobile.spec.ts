import { expect, test } from "@playwright/test";
import { generateHindiKit } from "./helpers";

/**
 * Mobile (390px): the kit's card track never causes horizontal page
 * overflow, and the Instagram preview appears as a swappable tab at the end
 * of the card track (the sidebar preview is 2xl+ only).
 */
test.use({ viewport: { width: 390, height: 844 } });

test("studio kit renders without horizontal overflow, preview as a track tab", async ({ page }) => {
  await generateHindiKit(page);

  // No horizontal scrollbar on the page itself (the card track scrolls internally instead).
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  // The sidebar preview (2xl+ only) is hidden at 390px.
  const sidebarPreview = page.getByRole("complementary", { name: "Instagram preview" });
  await expect(sidebarPreview).toBeHidden();

  // The "Preview" pill in the placement-jump nav is visible and scrolls the
  // track to the preview section, which sits inline as the last card.
  const previewTab = page.getByRole("button", { name: "Preview", exact: true });
  await expect(previewTab).toBeVisible();
  await previewTab.click();

  const previewSection = page.locator('section[aria-labelledby="slot-preview"]');
  await expect(previewSection).toBeVisible();
  const box = await previewSection.boundingBox();
  expect(box).not.toBeNull();
});
