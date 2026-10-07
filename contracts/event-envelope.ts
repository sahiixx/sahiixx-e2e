/** Canonical event envelope used by lead, agent, approval and memory flows. */
import { z } from "zod";
import { createHash } from "node:crypto";

export const EventTypeSchema = z.string().regex(
  /^(lead|appointment|deal|commission|revenue|agent\.run|human\.approval|memory|system)\.[a-z0-9_]+$/,
);

export const EventEnvelopeSchema = z.object({
  event_id: z.string().min(1),
  event_type: EventTypeSchema,
  event_version: z.string().min(1),
  occurred_at: z.string().datetime({ offset: true }),
  ingested_at: z.string().datetime({ offset: true }),
  tenant_id: z.string().min(1),
  correlation_id: z.string().min(1),
  causation_id: z.string().nullable().optional(),
  idempotency_key: z.string().min(1),
  source: z.object({
    channel: z.string().min(1),
    system: z.string().min(1),
    actor_id: z.string().nullable().optional(),
  }).passthrough(),
  payload: z.record(z.unknown()),
  agent: z.object({
    agent_run_id: z.string().nullable().optional(),
    agent_id: z.string().nullable().optional(),
    workflow_id: z.string().nullable().optional(),
    model: z.string().nullable().optional(),
    cost_usd: z.number().nonnegative().optional(),
    human_approved: z.boolean().optional(),
    tokens_in: z.number().int().nonnegative().optional(),
    tokens_out: z.number().int().nonnegative().optional(),
  }).passthrough().optional(),
  entities: z.record(z.string()).optional(),
}).passthrough();

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`;
}

/** Stable enough for replay tests; do not use this as a cryptographic secret. */
export function deterministicIdempotencyKey(
  eventType: string,
  tenantId: string,
  payload: unknown,
): string {
  const canonical = stableStringify(payload);
  return `${eventType}:${tenantId}:${createHash("sha256").update(canonical).digest("hex").slice(0, 24)}`;
}

export function parseEventEnvelope(value: unknown): EventEnvelope {
  return EventEnvelopeSchema.parse(value);
}
