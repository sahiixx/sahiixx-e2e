import { test, expect } from '@playwright/test';
import {
  SAMPLE_LEAD_CREATED,
  makeLeadCreated,
  type LeadCreated,
} from '../../fixtures/lead-machine';
import {
  qualifyLead,
  assertLeadQualifiedShape,
  extractBudget,
  extractTimeline,
  extractIntent,
} from '../../tools/lead-assert';

test.describe('Lead Machine — QualificationAgent (contract + pure scorer)', () => {
  test('sample LeadCreated produces expected shape and high score', () => {
    const result = qualifyLead(SAMPLE_LEAD_CREATED);
    assertLeadQualifiedShape(result);
    expect(result.lead_id).toBe(SAMPLE_LEAD_CREATED.lead_id);
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.decision).toBe('qualified_pipeline_entry');
    expect(result.status).toBe('qualified');
    expect(result.next).toBe('route_to_geomatch');
    expect(result.intent).toBe('buy');
    expect(result.budget_band).toBeTruthy();
    expect(result.timeline).not.toBe('unknown');
  });

  test('low-signal message → nurture', () => {
    const lead = makeLeadCreated({
      message: 'hi',
    });
    const result = qualifyLead(lead);
    assertLeadQualifiedShape(result);
    expect(result.score).toBeLessThan(60);
    expect(result.decision).toBe('nurture');
    expect(result.status).toBe('nurture');
    expect(result.next).toBe('route_to_nurture');
  });

  test('rent intent scores lower than buy but can still qualify', () => {
    const lead = makeLeadCreated({
      message: 'Looking to rent a 1BR in JLT, budget 80k, moving next month',
    });
    const result = qualifyLead(lead);
    expect(result.intent).toBe('rent');
    // budget + timeline + rent = 40+30+20 = 90
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  test('extractors are stable', () => {
    expect(extractBudget('budget 1.2M')).toBe('1.0M_1.5M');
    expect(extractBudget('around 2 million')).toBe('1.5M_2.5M');
    expect(extractTimeline('moving in 3 months')).toBe('soon_0_3m');
    expect(extractTimeline('asap please')).toBe('immediate');
    expect(extractIntent('want to buy')).toBe('buy');
    expect(extractIntent('just looking')).toBe('info');
  });

  test('optional live OPA / lead endpoint (skips if absent)', async ({ request }) => {
    // The live boundary is explicit. A missing OPA_BASE_URL is a skipped
    // integration lane, while a configured but broken service fails loudly.
    const opaBase = process.env.OPA_BASE_URL;
    if (!opaBase) {
      test.skip(true, 'Set OPA_BASE_URL to run the live OPA contract');
    }
    const r = await request.post(`${opaBase}/api/opa/lead/qualify`, {
      data: SAMPLE_LEAD_CREATED,
      failOnStatusCode: false,
    });
    expect(r.status()).toBe(200);
    const body = await r.json();
    assertLeadQualifiedShape(body);
    expect(body.lead_id).toBe(SAMPLE_LEAD_CREATED.lead_id);
  });
});
