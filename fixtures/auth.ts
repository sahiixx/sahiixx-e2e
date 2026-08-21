import { test as base, expect, Page } from '@playwright/test';

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page, context }, use) => {
    if (!process.env.TEST_JWT_TOKEN) {
      throw new Error('TEST_JWT_TOKEN not set — add to .env.test');
    }
    await context.addCookies([{
      name: 'next-auth.session-token',
      value: process.env.TEST_JWT_TOKEN,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    }]);
    await use(page);
  },
});

export { expect };
