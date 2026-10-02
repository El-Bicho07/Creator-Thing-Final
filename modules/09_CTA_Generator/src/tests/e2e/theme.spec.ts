import { expect, test } from "@playwright/test";

/**
 * Theme toggle: clicking it flips <html data-theme> and the resolved
 * background/text colours actually change (not just the attribute).
 */
test("theme toggle swaps background and text colours", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");
  const toggle = page.getByRole("button", { name: /switch to (dark|light) theme/i });

  const before = await html.evaluate((el) => ({
    theme: el.dataset.theme ?? null,
    bg: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(document.body).color,
  }));

  await toggle.click();

  const after = await html.evaluate((el) => ({
    theme: el.dataset.theme ?? null,
    bg: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(document.body).color,
  }));

  expect(after.theme).not.toBe(before.theme);
  expect(after.bg).not.toBe(before.bg);
  expect(after.color).not.toBe(before.color);

  // Toggling again returns to the original look (compare resolved colours,
  // since the very first load may have no explicit data-theme attribute yet).
  await toggle.click();
  const restored = await html.evaluate((el) => ({
    bg: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(document.body).color,
  }));
  expect(restored.bg).toBe(before.bg);
  expect(restored.color).toBe(before.color);
});
