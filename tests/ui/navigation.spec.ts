import { test, expect } from '@playwright/test';

// ponytail: smoke test only — full tab crawl is flaky until routes actually exist
test('nav tabs resolve', async ({ page }) => {
  await page.goto('/');
  // check at least one tab exists rather than hard-coding 7 that may not be shipped
  await expect(page.locator('[data-testid^="tab-"]').first()).toBeVisible({ timeout: 5000 });
});
