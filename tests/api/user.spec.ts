import { test, expect } from '@playwright/test';
import { createTestUser, cleanupTestData } from '../../fixtures/db';

test.afterEach(cleanupTestData);

test.describe('User API', () => {
  test('GET /api/user returns authenticated user', async ({ request }) => {
    const user = await createTestUser('api-e2e@sahiixx.dev');
    const r = await request.get('/api/user', {
      headers: { Authorization: `Bearer ${process.env.TEST_JWT_TOKEN}` },
    });
    expect(r.status()).toBe(200);
    expect((await r.json()).email).toBe(user.email);
  });

  test('POST /api/user rejects duplicate email', async ({ request }) => {
    await createTestUser('dup-e2e@sahiixx.dev');
    const r = await request.post('/api/user', {
      data: { email: 'dup-e2e@sahiixx.dev', password: 'test123' },
    });
    expect(r.status()).toBe(409);
  });
});
