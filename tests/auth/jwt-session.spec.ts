import { test, expect } from '../../fixtures/auth';

test.describe('JWT Session', () => {
  test('protected route with valid token', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    await expect(authenticatedPage.locator('h1')).toContainText('Dashboard');
  });

  test('redirects unauthenticated to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
