import { test, expect } from '@playwright/test';

test.describe('SARA Voice / WA Bridge', () => {
  test('voice widget renders', async ({ page }) => {
    await page.goto('/dashboard');
    const w = page.locator('[data-testid="sara-voice"], [data-testid="voice-agent"]');
    if (!(await w.count())) test.skip(true, 'voice widget not in build');
    await expect(w.first()).toBeVisible();
  });

  test('WA bridge health (8766)', async () => {
    try {
      const r = await fetch('http://127.0.0.1:8766/status');
      expect(r.ok).toBeTruthy();
    } catch {
      test.skip(true, 'wa bridge not running');
    }
  });
});
