/**
 * Runtime contracts for the NEXUS → OPA lead machine.
 *
 * The E2E harness is the compatibility boundary between TypeScript tests and
 * the Python services. Keep this module provider-neutral and deliberately
 * tolerant of additive fields so services can evolve without silently
 * accepting malformed core fields.
 */
import { z } from "zod";

export const LeadChannelSchema = z.string().min(1).max(64);

export const LeadCreatedSchema = z.object({
  lead_id: z.string().min(1).max(128),
  contact: z.object({
    name: z.string().nullable().optional(),
    handle: z.string().min(1).max(256),
    channel: LeadChannelSchema,
  }),
  message: z.string().min(1).max(20_000),
  source: z.string().min(1).max(128),
  captured_at: z.string().datetime({ offset: true }),
  raw_ref: z.string().max(512).nullable().optional(),
  status: z.string().optional(),
  next: z.string().optional(),
}).passthrough();

export const LeadQualifiedSchema = z.object({
  lead_id: z.string().min(1).max(128),
  score: z.number().int().min(0).max(100),
  segment: z.string().min(1).optional(),
  intent: z.enum(["buy", "sell", "rent", "info"]),
  timeline: z.string().min(1),
  budget_band: z.string().min(1).nullable(),
  decision: z.enum([
    "qualified_pipeline_entry",
    "nurture",
    "nurture_follow_up",
    "drop_unfit_or_spam",
  ]),
  confidence: z.enum(["low", "medium", "high"]),
  rationale: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["qualified", "nurture", "dropped"]),
  next: z.string().min(1),
}).passthrough();

export const LeadMatchedSchema = z.object({
  lead_id: z.string().min(1).max(128),
  matches: z.array(z.object({
    area: z.string().min(1),
    score: z.number().min(0).max(100),
    mid_aed: z.number().nonnegative(),
    tags: z.array(z.string()),
    sample_communities: z.array(z.string()),
  }).passthrough()),
  count: z.number().int().nonnegative(),
  budget_band: z.string().min(1),
  intent: z.string().min(1),
  status: z.enum(["matched", "no_match"]),
  next: z.string().min(1),
}).passthrough();

export type LeadCreated = z.infer<typeof LeadCreatedSchema>;
export type LeadQualified = z.infer<typeof LeadQualifiedSchema>;
export type LeadMatched = z.infer<typeof LeadMatchedSchema>;

export function parseLeadCreated(value: unknown): LeadCreated {
  return LeadCreatedSchema.parse(value);
}

export function parseLeadQualified(value: unknown): LeadQualified {
  return LeadQualifiedSchema.parse(value);
}

export function parseLeadMatched(value: unknown): LeadMatched {
  return LeadMatchedSchema.parse(value);
}
