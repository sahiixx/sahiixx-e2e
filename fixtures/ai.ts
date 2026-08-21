import { test as base, expect, Page } from '@playwright/test';
import { assertLLMResponse } from '../tools/llm-assert';

type AIFixtures = {
  aiPage: Page;
  streamResponse: (prompt: string) => Promise<string>;
};

export const test = base.extend<AIFixtures>({
  aiPage: async ({ page }, use) => { await use(page); },
  streamResponse: async ({ page }, use) => {
    // In CI we mock /api/ai/chat streaming; LIVE_E2E=1 hits real freellmpool
    await use(async (prompt: string) => {
      const chunks: string[] = [];
      await page.route('**/api/ai/chat', async route => {
        if (process.env.LIVE_E2E) return route.continue();
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: {"delta":"Mocked AGI response for: ${prompt.slice(0, 40)}"}\ndata: [DONE]\n`,
        });
      });
      // caller fills [data-testid="claude-input"] and reads [data-testid="claude-stream"]
      return chunks.join('');
    });
  },
});

export { expect, assertLLMResponse };
