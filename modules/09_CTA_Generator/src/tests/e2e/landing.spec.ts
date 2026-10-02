import { expect, test } from "@playwright/test";

/**
 * Landing page: hero renders, the shader backdrop mounts, and the floating
 * nav pill switches its tone (dark over the hero, page colours over
 * "How it works") as you scroll.
 */
test.describe("Landing page", () => {
  test("hero loads with heading, CTA and shader backdrop", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("link in bio");
    await expect(page.getByRole("link", { name: /open the studio/i }).first()).toBeVisible();

    // Shader backdrop: CSS fallback gradient is always in the DOM; the WebGL
    // canvas mounts once three.js loads (skipped headless/no-WebGL, so only
    // assert the fallback + container are present).
    const backdrop = page.locator(".shader-fallback").first();
    await expect(backdrop).toBeVisible();
  });

  test("nav tone switches from dark (hero) to page colours (how it works)", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });

    // At the top, the nav sits over the dark hero section.
    await expect(nav).toHaveClass(/tone-dark/);

    // Scroll to the "How it works" section, which has no data-nav-tone
    // (i.e. page colours), and the nav should drop the dark tone class.
    await page.locator("#how").scrollIntoViewIfNeeded();
    await expect(nav).not.toHaveClass(/tone-dark/);
  });
});
