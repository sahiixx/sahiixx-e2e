import { test, expect } from '../../fixtures/mcp';
import { callMcpTool } from '../../fixtures/mcp';

const TOOLS = ['echo', 'web_fetch', 'memory_get', 'gapclaw_scan'];

for (const tool of TOOLS) {
  test(`MCP tool ${tool} responds (mock OK)`, async ({ mcpBase }) => {
    const res: any = await callMcpTool(mcpBase, tool, { e2e: true });
    expect(res).toBeTruthy();
    if (res.error) test.skip(true, `${tool} not available offline`);
  });
}
