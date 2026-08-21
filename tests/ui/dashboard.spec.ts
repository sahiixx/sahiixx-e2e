import { test, expect } from '../../fixtures/auth';

test.describe('Dashboard', () => {
  test('renders core widgets', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    await expect(authenticatedPage.locator('[data-testid="signal-feed"]')).toBeVisible();
    await expect(authenticatedPage.locator('[data-testid="nexus-deals"]')).toBeVisible();
  });

  test('mobile nav visible on small viewport', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 812 });
    await authenticatedPage.goto('/dashboard');
    await expect(authenticatedPage.locator('[data-testid="mobile-nav"]')).toBeVisible();
  });
});
