import { test, expect } from '@playwright/test';
import { SAMPLE_LEAD_CREATED, SAMPLE_LEAD_QUALIFIED } from '../../fixtures/lead-machine';
import { EventEnvelopeSchema } from '../../contracts/event-envelope';

/**
 * Event contract tests — the same envelope is used for mocked and live paths.
 */
const EXPECTED_TOPICS = [
  'lead.created',
  'lead.qualified',
  'lead.matched',
  'lead.scheduled',
] as const;

test.describe('Lead Machine — Event fabric contracts', () => {
  test('canonical payloads are serialisable', () => {
    expect(() => JSON.stringify(SAMPLE_LEAD_CREATED)).not.toThrow();
    expect(() => JSON.stringify(SAMPLE_LEAD_QUALIFIED)).not.toThrow();
  });

  test('topic names follow lead.* convention', () => {
    for (const t of EXPECTED_TOPICS) {
      expect(t.startsWith('lead.')).toBe(true);
      expect(t.split('.').length).toBe(2);
    }
  });

  test('lead events carry replay-safe trace metadata', () => {
    const result = EventEnvelopeSchema.safeParse({
      event_id: 'evt_e2e_1',
      event_type: 'lead.created',
      event_version: '1.0',
      occurred_at: SAMPLE_LEAD_CREATED.captured_at,
      ingested_at: SAMPLE_LEAD_CREATED.captured_at,
      tenant_id: 'e2e-tenant',
      correlation_id: 'corr_e2e_1',
      causation_id: null,
      idempotency_key: 'lead.created:e2e-tenant:lead_8f3a',
      source: { channel: 'whatsapp', system: 'nexus', actor_id: null },
      payload: SAMPLE_LEAD_CREATED,
    });
    expect(result.success).toBe(true);
  });

  test('optional live bus health (skips if absent)', async ({ request }) => {
    const busBase = process.env.BUS_BASE_URL;
    if (!busBase) {
      test.skip(true, 'Set BUS_BASE_URL to run the live bus contract');
    }
    const r = await request.get(`${busBase}/health`, { failOnStatusCode: false });
    expect(r.ok()).toBeTruthy();
  });
});
