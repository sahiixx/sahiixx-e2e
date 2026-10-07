/**
 * Pure QualificationScorer — executable version of the skeleton in E2E-WIRING-PACK.md.
 * When the real OPA adapter lands, this becomes the reference implementation / unit test oracle.
 */

import type { LeadCreated, LeadQualified } from '../fixtures/lead-machine';
import { LeadQualifiedSchema } from '../contracts/lead-machine';

export function extractBudget(msg: string): string | null {
  const normalized = msg.toLowerCase();
  // Prefer a value near an explicit budget/value/price marker so bedroom
  // counts such as "2BR" cannot become a budget signal.
  const marked = normalized.match(/(?:budget|price|priced|value|worth|around|for)\s*(?:is|of|:)?\s*(?:aed|dh|dhs|dirham)?\s*(\d+(?:\.\d+)?)\s*(m|million|k|thousand)?/i);
  const m = marked || normalized.match(/(?:aed|dh|dhs|dirham)\s*(\d+(?:\.\d+)?)\s*(m|million|k|thousand)?/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = (m[2] || '').toLowerCase();
  if (unit.startsWith('m')) {
    if (n < 0.8) return '0.5M_1.0M';
    if (n < 1.5) return '1.0M_1.5M';
    if (n < 2.5) return '1.5M_2.5M';
    return '2.5M+';
  }
  if (unit.startsWith('k') || unit.startsWith('t')) {
    // treat as thousands of AED → convert roughly
    return n >= 1000 ? '1.0M_1.5M' : '0.5M_1.0M';
  }
  // bare number — assume millions if > 100, else thousands
  if (n >= 100) return n < 1500 ? '1.0M_1.5M' : '1.5M_2.5M';
  return null;
}

export function extractTimeline(msg: string): string {
  const m = msg.toLowerCase();
  if (/\b(now|asap|immediate|this week)\b/.test(m)) return 'immediate';
  if (/\b(1|one|2|two|3|three)\s*(month|months|m)\b/.test(m) || /\b(soon|3 months)\b/.test(m)) return 'soon_0_3m';
  if (/\b(6|six)\s*(month|months)\b/.test(m)) return 'mid_3_6m';
  if (/\b(year|12 months|next year)\b/.test(m)) return 'long_6m+';
  return 'unknown';
}

export function extractIntent(msg: string): 'buy' | 'rent' | 'info' {
  const m = msg.toLowerCase();
  if (/\b(buy|purchase|own|invest|acquisition)\b/.test(m)) return 'buy';
  if (/\b(rent|lease|tenant)\b/.test(m)) return 'rent';
  return 'info';
}

/**
 * Pure scorer matching the wiring-pack skeleton.
 * score = 40 (budget) + 30 (timeline) + 30/10 (intent)
 */
export function qualifyLead(payload: LeadCreated): LeadQualified {
  const msg = (payload.message || '').toLowerCase();
  const budget = extractBudget(msg);
  const timeline = extractTimeline(msg);
  const intent = extractIntent(msg);

  let score = 0;
  score += budget ? 40 : 0;
  score += timeline !== 'unknown' ? 30 : 0;
  score += intent === 'buy' ? 30 : intent === 'rent' ? 20 : 10;

  const decision = score >= 60 ? 'qualified_pipeline_entry' : 'nurture';
  const status = decision.startsWith('qualified') ? 'qualified' : 'nurture';

  const rationale: string[] = [];
  if (budget) rationale.push(`Budget detected → ${budget}`);
  if (timeline !== 'unknown') rationale.push(`Timeline → ${timeline}`);
  if (intent === 'buy') rationale.push('Explicit buy/purchase language');
  if (rationale.length === 0) rationale.push('Low signal message');

  return {
    lead_id: payload.lead_id,
    score,
    intent,
    timeline,
    budget_band: budget,
    decision,
    confidence: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
    rationale,
    tags: [
      `intent:${intent}`,
      status === 'qualified' ? 'priority:high' : 'priority:low',
    ],
    status,
    next: status === 'qualified' ? 'route_to_geomatch' : 'route_to_nurture',
  };
}

export function assertLeadQualifiedShape(q: any) {
  return LeadQualifiedSchema.parse(q);
}
