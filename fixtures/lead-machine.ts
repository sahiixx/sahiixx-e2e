/**
 * Lead Machine contracts — source of truth from E2E-WIRING-PACK.md
 * These payloads are the boundary between NEXUS / OPA / specialist agents.
 */

export type LeadCreated = {
  lead_id: string;
  contact: {
    name: string;
    handle: string;
    channel: 'whatsapp' | 'telegram' | 'web' | 'email' | string;
  };
  message: string;
  source: string;
  captured_at: string; // ISO-8601
  raw_ref?: string;
};

export type LeadQualified = {
  lead_id: string;
  score: number;
  segment?: string;
  intent: 'buy' | 'rent' | 'info' | string;
  timeline: string;
  budget_band: string | null;
  decision: 'qualified_pipeline_entry' | 'nurture' | string;
  confidence: 'low' | 'medium' | 'high' | string;
  rationale?: string[];
  tags?: string[];
  status: 'qualified' | 'nurture' | string;
  next: string;
};

/** Canonical example from the wiring pack */
export const SAMPLE_LEAD_CREATED: LeadCreated = {
  lead_id: 'lead_8f3a',
  contact: { name: 'A. Rahman', handle: '+9715xxxx', channel: 'whatsapp' },
  message: 'Looking for a 2BR in Marina, budget 1.2M, moving in 3 months',
  source: 'nexus_whatsapp',
  captured_at: '2026-07-16T09:12:00Z',
  raw_ref: 'nexus:ESTATE-4471',
};

export const SAMPLE_LEAD_QUALIFIED: LeadQualified = {
  lead_id: 'lead_8f3a',
  score: 78,
  segment: 'end_user_buyer',
  intent: 'buy',
  timeline: 'soon_0_3m',
  budget_band: '1.0M_1.5M',
  decision: 'qualified_pipeline_entry',
  confidence: 'medium',
  rationale: [
    'Explicit budget + area + timeline → high intent',
    'Marina 2BR at 1.2M is in-market; moderate confidence on exact fit',
  ],
  tags: ['segment:buyer', 'priority:high', 'area:marina'],
  status: 'qualified',
  next: 'route_to_geomatch',
};

/** Factory for quick test variants */
export function makeLeadCreated(overrides: Partial<LeadCreated> = {}): LeadCreated {
  return {
    ...SAMPLE_LEAD_CREATED,
    lead_id: `lead_${Math.random().toString(36).slice(2, 8)}`,
    captured_at: new Date().toISOString(),
    ...overrides,
  };
}
