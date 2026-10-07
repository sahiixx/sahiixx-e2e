/** Runtime contracts shared by deterministic, generative and foundation lanes. */
import { z } from "zod";

export const ModelKindSchema = z.enum(["traditional", "generative", "foundation"]);
export const ModelCapabilitySchema = z.enum([
  "classification",
  "scoring",
  "chat",
  "streaming",
  "tool_call",
  "structured_output",
  "embeddings",
  "vision",
]);

export const ModelDescriptorSchema = z.object({
  kind: ModelKindSchema,
  capability: ModelCapabilitySchema,
  provider: z.string().min(1),
  model: z.string().min(1),
  configured: z.boolean(),
}).passthrough();

export const ModelMetricsSchema = z.object({
  latency_ms: z.number().nonnegative(),
  attempts: z.number().int().positive(),
  tokens_in: z.number().int().nonnegative().optional(),
  tokens_out: z.number().int().nonnegative().optional(),
  cost_usd: z.number().nonnegative().optional(),
}).passthrough();

export const ModelRunSchema = z.object({
  run_id: z.string().min(1),
  descriptor: ModelDescriptorSchema,
  passed: z.boolean(),
  metrics: ModelMetricsSchema,
  error_class: z.enum(["none", "configuration", "transport", "timeout", "http", "contract"]).default("none"),
}).passthrough();

export const TraditionalClassificationSchema = z.object({
  label: z.enum(["urgent", "qualified", "nurture", "unknown"]),
  confidence: z.number().min(0).max(1),
  matched_signals: z.array(z.string()),
});

export const TraditionalScoreSchema = z.object({
  score: z.number().min(0).max(100),
  band: z.enum(["low", "medium", "high"]),
  reasons: z.array(z.string()).min(1),
});

export const EmbeddingSchema = z.object({
  index: z.number().int().nonnegative(),
  embedding: z.array(z.number()).min(1),
});

export const EmbeddingResponseSchema = z.object({
  data: z.array(EmbeddingSchema).min(1),
}).passthrough();

export type ModelKind = z.infer<typeof ModelKindSchema>;
export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;
export type ModelDescriptor = z.infer<typeof ModelDescriptorSchema>;
export type ModelMetrics = z.infer<typeof ModelMetricsSchema>;
export type TraditionalClassification = z.infer<typeof TraditionalClassificationSchema>;
export type TraditionalScore = z.infer<typeof TraditionalScoreSchema>;
export type EmbeddingResponse = z.infer<typeof EmbeddingResponseSchema>;

export function parseModelRun(value: unknown) {
  return ModelRunSchema.parse(value);
}
