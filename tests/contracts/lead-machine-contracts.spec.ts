import { test, expect } from '@playwright/test';
import {
  SAMPLE_LEAD_CREATED,
  SAMPLE_LEAD_QUALIFIED,
} from '../../fixtures/lead-machine';
import {
  LeadCreatedSchema,
  LeadQualifiedSchema,
  LeadMatchedSchema,
} from '../../contracts/lead-machine';
import {
  EventEnvelopeSchema,
  deterministicIdempotencyKey,
} from '../../contracts/event-envelope';
import { redactSecrets } from '../../contracts/redaction';

test.describe('contract-first E2E boundary', () => {
  test('accepts canonical lead fixtures', () => {
    expect(LeadCreatedSchema.safeParse(SAMPLE_LEAD_CREATED).success).toBe(true);
    expect(LeadQualifiedSchema.safeParse(SAMPLE_LEAD_QUALIFIED).success).toBe(true);
  });

  test('rejects malformed core fields instead of silently skipping', () => {
    const malformed = { ...SAMPLE_LEAD_CREATED, lead_id: '', message: '' };
    const result = LeadCreatedSchema.safeParse(malformed);
    expect(result.success).toBe(false);
  });

  test('validates the full qualification → match boundary', () => {
    const matched = {
      lead_id: SAMPLE_LEAD_QUALIFIED.lead_id,
      matches: [{
        area: 'Dubai Marina',
        score: 95.2,
        mid_aed: 1_400_000,
        tags: ['waterfront', 'apartment'],
        sample_communities: ['Marina Gate'],
      }],
      count: 1,
      budget_band: '1.0M_1.5M',
      intent: 'buy',
      status: 'matched',
      next: 'route_to_scheduling',
    };
    expect(LeadMatchedSchema.safeParse(matched).success).toBe(true);
  });

  test('event envelopes carry replay and trace identity', () => {
    const payload = { lead_id: 'lead_8f3a', score: 78 };
    const idempotency = deterministicIdempotencyKey('lead.qualified', 'demo', payload);
    const envelope = {
      event_id: 'evt_1',
      event_type: 'lead.qualified',
      event_version: '1.0',
      occurred_at: '2026-10-06T00:00:00Z',
      ingested_at: '2026-10-06T00:00:01Z',
      tenant_id: 'demo',
      correlation_id: 'corr_1',
      causation_id: 'evt_0',
      idempotency_key: idempotency,
      source: { channel: 'api', system: 'opa', actor_id: null },
      payload,
    };
    expect(EventEnvelopeSchema.safeParse(envelope).success).toBe(true);
    expect(deterministicIdempotencyKey('lead.qualified', 'demo', payload)).toBe(idempotency);
  });

  test('redacts credentials from diagnostic payloads', () => {
    expect(redactSecrets({ token: 'secret', nested: { api_key: 'key' } })).toEqual({
      token: '[REDACTED]',
      nested: { api_key: '[REDACTED]' },
    });
  });
});
