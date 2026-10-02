import type { Page } from "@playwright/test";

/**
 * Fills the brief via "Try an example", switches the language to Hindi, and
 * submits. Waits for the kit deck to render before returning.
 * The offline template engine (no ANTHROPIC_API_KEY) responds fast, so this
 * settles well within a couple of seconds.
 */
export async function generateHindiKit(page: Page) {
  await page.goto("/studio");
  await page.getByRole("button", { name: /try an example/i }).click();
  // The pill's icon sits visually over the sr-only radio input, so force the click.
  await page.getByRole("radio", { name: /^Hindi/ }).click({ force: true });
  await page.getByRole("button", { name: /generate cta kit/i }).click();

  const kitHeading = page.getByRole("heading", { name: /monsoon skincare/i });
  await kitHeading.waitFor({ state: "visible", timeout: 10_000 });
}
