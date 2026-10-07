import { defineConfig, devices } from '@playwright/test';

const appCommand = process.env.APP_COMMAND;
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const uiTestIgnore = [/tests\/(contracts|integration|lead-machine|ai|realtime|mcp|models)\//];

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
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: uiTestIgnore,
      use: { ...devices['Desktop Chrome'] },
    },
    // widened per user "max it" — uncomment when you need them (no cost to keep defined)
    { name: 'firefox', testIgnore: uiTestIgnore, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testIgnore: uiTestIgnore, use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', testIgnore: uiTestIgnore, use: { ...devices['Pixel 5'] } },
    { name: 'ai', testMatch: /tests\/ai\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'realtime', testMatch: /tests\/realtime\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'mcp', testMatch: /tests\/mcp\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'lead-machine', testMatch: /tests\/lead-machine\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'contracts', testMatch: /tests\/contracts\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'integration', testMatch: /tests\/integration\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'traditional-models', testMatch: /tests\/models\/traditional-model\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'generative-models', testMatch: /tests\/models\/generative-model\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'foundation-models', testMatch: /tests\/models\/foundation-model\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
  // The harness does not guess how to start a target application. Set
  // APP_COMMAND when a suite owns the target process; otherwise BASE_URL,
  // OPA_BASE_URL and BUS_BASE_URL point at externally managed services.
  webServer: appCommand
    ? { command: appCommand, url: baseURL, reuseExistingServer: !process.env.CI, timeout: 120_000 }
    : undefined,
});
