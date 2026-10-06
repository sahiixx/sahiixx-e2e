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

  test('configured live model responds when LIVE_E2E=1', async () => {
    if (process.env.LIVE_E2E !== '1') test.skip(true, 'set LIVE_E2E=1 to hit a configured live model');
    const baseUrl = process.env.LIVE_MODEL_URL || process.env.FREELLMPOOL_URL;
    const model = process.env.LIVE_MODEL || process.env.FREELLMPOOL_MODEL;
    if (!baseUrl || !model) test.skip(true, 'set LIVE_MODEL_URL and LIVE_MODEL for the live model lane');
    const r = await fetch(`${baseUrl!.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.LIVE_MODEL_API_KEY ? { Authorization: `Bearer ${process.env.LIVE_MODEL_API_KEY}` } : {}),
      },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'ping' }], max_tokens: 16 }),
    });
    expect(r.ok).toBeTruthy();
    const j = await r.json();
    assertLLMResponse(j.choices?.[0]?.message?.content ?? '', { minLength: 1 });
  });
});
