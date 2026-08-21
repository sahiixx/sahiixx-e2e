import { test, expect } from '@playwright/test';

test.describe('GitHub OAuth', () => {
  test('redirects to GitHub', async ({ page }) => {
    await page.goto('/login');
    await page.click('[data-testid="github-login"]');
    await expect(page).toHaveURL(/github\.com\/login\/oauth\/authorize/);
  });

  test('callback sets session cookie', async ({ page, context }) => {
    await page.route('**/api/auth/callback/github**', route =>
      route.fulfill({ status: 302, headers: { location: '/dashboard' }, body: '' })
    );
    await page.goto('/api/auth/callback/github?code=mock_code');
    await page.waitForURL('/dashboard');
    const cookies = await context.cookies();
    expect(cookies.some(c => c.name.includes('session'))).toBeTruthy();
  });
});
