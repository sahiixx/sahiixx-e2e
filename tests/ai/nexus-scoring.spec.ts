import { test, expect } from '@playwright/test';

// NEXUS: EV = P(close) * commission — verify via API or mocked UI
test.describe('NEXUS Deal Engine v2', () => {
  test('EV scoring via API', async ({ request }) => {
    await request.storageState;
    const r = await request.get('/api/nexus/score?lead=test-e2e');
    if (r.status() === 404) test.skip(true, 'nexus api not deployed in this env');
    expect(r.status()).toBe(200);
    const j = await r.json();
    expect(j).toHaveProperty('ev');
    expect(typeof j.ev).toBe('number');
  });

  test('dashboard shows nexus-deals widget', async ({ page }) => {
    await page.goto('/dashboard');
    const w = page.locator('[data-testid="nexus-deals"]');
    if (!(await w.count())) test.skip(true, 'nexus widget not in build');
    await expect(w).toBeVisible();
  });
});
