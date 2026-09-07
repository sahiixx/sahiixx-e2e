import { test, expect } from '@playwright/test';
import { SAMPLE_LEAD_CREATED, SAMPLE_LEAD_QUALIFIED } from '../../fixtures/lead-machine';

/**
 * Event contract tests — documents the topics the MessageBus should support.
 * When core/bus.py subscribers are wired, replace the pure checks with real pub/sub.
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

  test('optional live bus health (skips if absent)', async ({ request }) => {
    const r = await request.get('/api/bus/health', { failOnStatusCode: false });
    if (r.status() === 404 || r.status() === 502) {
      test.skip(true, 'MessageBus health endpoint not exposed yet');
    }
    expect(r.ok()).toBeTruthy();
  });
});
