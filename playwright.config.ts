import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],
  globalSetup: './global-setup.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // widened per user "max it" — uncomment when you need them (no cost to keep defined)
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'ai', testMatch: /tests\/ai\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'realtime', testMatch: /tests\/realtime\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'mcp', testMatch: /tests\/mcp\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    // optional: Hermes MCP + Fastify — only starts if scripts exist; harmless skip otherwise
    {
      command: 'npm run api:dev 2>/dev/null || echo "api:dev not configured"',
      url: 'http://localhost:3001/health',
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
