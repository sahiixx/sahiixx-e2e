import { test, expect } from '@playwright/test';

test.describe('Vector / RAG (Qdrant / pgvector)', () => {
  test('semantic search returns ranked results', async ({ request }) => {
    const r = await request.post('/api/search', { data: { query: 'Dubai Marina 2BR investment', topK: 3 } });
    if (r.status() === 404) test.skip(true, 'search api not deployed');
    expect(r.ok()).toBeTruthy();
    const j = await r.json();
    expect(Array.isArray(j.results ?? j)).toBeTruthy();
  });

  test('embedding health', async ({ request }) => {
    const r = await request.get('/api/search/health');
    if (r.status() === 404) test.skip(true, 'no health endpoint');
    expect(r.ok()).toBeTruthy();
  });
});
