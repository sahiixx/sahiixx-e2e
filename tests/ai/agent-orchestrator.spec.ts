import { test, expect } from '@playwright/test';
import { callMcpTool } from '../../fixtures/mcp';

test.describe('Orchestrator + Agent Fleet', () => {
  test('orchestrator dispatch health', async ({ request }) => {
    const r: any = await request.get('http://127.0.0.1:8792/health').catch(() => null);
    if (!r || !r.ok()) test.skip(true, 'orchestrator-agent not running');
    expect(r.ok()).toBeTruthy();
  });

  test('prime-agent / memory-broker reachable', async () => {
    const urls = ['http://127.0.0.1:8897/v1/models', 'http://127.0.0.1:8790/mem/test'];
    for (const u of urls) {
      try {
        const r = await fetch(u);
        // just check it doesn't crash; auth may 401
        expect([200, 401, 404].includes(r.status)).toBeTruthy();
      } catch {
        test.skip(true, `not reachable: ${u}`);
      }
    }
  });

  test('MCP tool call (mocked if offline)', async () => {
    const res: any = await callMcpTool(process.env.MCP_URL || 'http://127.0.0.1:8765', 'echo', { text: 'e2e' });
    expect(res).toBeTruthy();
  });
});
