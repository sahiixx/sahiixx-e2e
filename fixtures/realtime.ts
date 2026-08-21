import { test as base, expect } from '@playwright/test';

// ponytail: poll helper, not a websocket lib
export async function waitForSignal(url: string, predicate: (j: any) => boolean, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok && predicate(await r.json())) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

export const test = base.extend<{ live: boolean }>({
  live: [async ({}, use) => { await use(process.env.LIVE_E2E === '1'); }, { option: true }],
});

export { expect };
