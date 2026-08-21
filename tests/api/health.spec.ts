import { test, expect } from '@playwright/test';

test.describe('Health', () => {
  test('GET /api/health', async ({ request }) => {
    const r = await request.get('/api/health');
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.status ?? body.ok ?? true).toBeTruthy();
  });

  // ponytail: Fastify on :3001 only if you actually run a separate Fastify service — otherwise this is the same /api/health
  test.skip('Fastify health on :3001', async ({ request }) => {
    const r = await request.get('http://localhost:3001/health');
    expect(r.status()).toBe(200);
  });
});
