import { test, expect, assertLLMResponse } from '../../fixtures/ai';

test.describe('AI Streaming (real-time LLM)', () => {
  test('claude terminal streams via SSE', async ({ page }) => {
    await page.route('**/api/ai/chat', route =>
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'data: {"delta":"Hello from AGI"}\ndata: {"delta":" — streaming"}\ndata: [DONE]\n',
      })
    );
    await page.goto('/dashboard');
    const input = page.locator('[data-testid="claude-input"]');
    if (!(await input.count())) test.skip(true, 'no claude-input in this build');
    await input.fill('Analyze NEXUS lead scoring');
    await input.press('Enter');
    await expect(page.locator('[data-testid="claude-stream"]')).toBeVisible({ timeout: 10_000 });
  });

  test('live freellmpool responds when LIVE_E2E=1', async () => {
    if (process.env.LIVE_E2E !== '1') test.skip(true, 'set LIVE_E2E=1 to hit real LLM');
    const r = await fetch('http://127.0.0.1:8897/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llm7/codestral-latest', messages: [{ role: 'user', content: 'ping' }], max_tokens: 16 }),
    });
    expect(r.ok).toBeTruthy();
    const j = await r.json();
    assertLLMResponse(j.choices?.[0]?.message?.content ?? '', { minLength: 1 });
  });
});
