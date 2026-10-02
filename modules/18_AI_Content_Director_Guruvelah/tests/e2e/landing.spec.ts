import { test, expect } from '@playwright/test';

test.describe('Landing Page & Public Routes', () => {
  test('renders hero header, tagline, and CTA', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toContainText('Turn trends into content that');
    await expect(page.locator('text=End-to-End Execution Pipeline')).toBeVisible();
    await expect(page.locator('text=Angle Equation')).toBeVisible();
  });

  test('redirects unauthenticated users trying to access dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
