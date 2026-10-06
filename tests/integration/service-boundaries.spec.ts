import { test, expect } from '@playwright/test';
import { SAMPLE_LEAD_CREATED } from '../../fixtures/lead-machine';
import { parseLeadCreated, parseLeadQualified, parseLeadMatched } from '../../contracts/lead-machine';
import { redactSecrets } from '../../contracts/redaction';

const opaBase = process.env.OPA_BASE_URL;
const busBase = process.env.BUS_BASE_URL;
const requireLive = process.env.REQUIRE_LIVE === '1';

function assertConfigured(name: string, value: string | undefined): asserts value is string {
  if (!value && requireLive) throw new Error(`${name} is required when REQUIRE_LIVE=1`);
}

test.describe('OPA service boundary', () => {
  test.beforeAll(() => assertConfigured('OPA_BASE_URL', opaBase));
  test.skip(!opaBase, 'Set OPA_BASE_URL to run service-boundary E2E');
  test.use({ baseURL: opaBase || 'http://127.0.0.1:8082' });

  test('capture → qualify → match returns compatible contracts', async ({ request }) => {
    const captureResponse = await request.post('/opa/lead/capture', {
      data: SAMPLE_LEAD_CREATED,
      failOnStatusCode: false,
    });
    expect(captureResponse.status(), JSON.stringify(redactSecrets(await captureResponse.text()))).toBe(200);
    const captured = parseLeadCreated(await captureResponse.json());

    const qualifyResponse = await request.post('/opa/lead/qualify', {
      data: captured,
      failOnStatusCode: false,
    });
    expect(qualifyResponse.status(), JSON.stringify(redactSecrets(await qualifyResponse.text()))).toBe(200);
    const qualified = parseLeadQualified(await qualifyResponse.json());
    expect(qualified.lead_id).toBe(captured.lead_id);

    const matchResponse = await request.post('/opa/lead/match', {
      data: {
        lead_id: qualified.lead_id,
        budget_band: qualified.budget_band || 'unknown',
        intent: qualified.intent,
        message: captured.message,
        timeline: qualified.timeline,
      },
      failOnStatusCode: false,
    });
    expect(matchResponse.status(), JSON.stringify(redactSecrets(await matchResponse.text()))).toBe(200);
    const matched = parseLeadMatched(await matchResponse.json());
    expect(matched.lead_id).toBe(qualified.lead_id);
    expect(matched.count).toBe(matched.matches.length);
  });
});

test.describe('sahiixx-bus service boundary', () => {
  test.beforeAll(() => assertConfigured('BUS_BASE_URL', busBase));
  test.skip(!busBase, 'Set BUS_BASE_URL to run bus-boundary E2E');
  test.use({ baseURL: busBase || 'http://127.0.0.1:8090' });

  test('health exposes a usable bus and MCP surface', async ({ request }) => {
    const response = await request.get('/health', { failOnStatusCode: false });
    expect(response.status(), JSON.stringify(redactSecrets(await response.text()))).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(Array.isArray(body.bus_channels)).toBe(true);
    expect(Array.isArray(body.mcp_tools)).toBe(true);
  });
});
