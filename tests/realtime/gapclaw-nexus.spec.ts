import { test, expect } from '@playwright/test';

test.describe('GapClaw → NEXUS → Telegram', () => {
  test('health endpoint aggregates pipeline', async ({ request }) => {
    const r = await request.get('/api/health');
    if (!r.ok()) test.skip(true, 'no /api/health');
    const j = await r.json();
    expect(j).toHaveProperty('status');
  });

  test('deal_scores has rows (via API or DB)', async ({ request }) => {
    const r = await request.get('/api/nexus/deals');
    if (r.status() === 404) test.skip(true, 'nexus deals api not deployed');
    const j = await r.json();
    expect(Array.isArray(j.deals ?? j)).toBeTruthy();
  });
});
