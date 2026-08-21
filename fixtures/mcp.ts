import { test as base, expect } from '@playwright/test';

export const test = base.extend<{ mcpBase: string }>({
  mcpBase: [async ({}, use) => { await use(process.env.MCP_URL || 'http://127.0.0.1:8765'); }, { option: true }],
});

export async function callMcpTool(base: string, tool: string, args: any = {}) {
  // Hermes MCP uses SSE/JSON-RPC; in E2E we just hit the HTTP bridge if available, else mock
  try {
    const r = await fetch(`${base}/mcp/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, arguments: args }),
    });
    if (r.ok) return r.json();
  } catch {}
  return { mocked: true, tool, args };
}

export { expect };
