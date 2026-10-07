import {
  EmbeddingResponseSchema,
  type ModelCapability,
  type ModelKind,
} from "../contracts/model-matrix";

export type ChatContent = string | Array<
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
>;

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: ChatContent;
  tool_call_id?: string;
};

export type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

export type ModelProfile = {
  kind: ModelKind;
  capability: ModelCapability;
  provider: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
  liveEnabled: boolean;
};

export type ChatResult = {
  text: string;
  toolCalls: Array<{ id: string; name: string; arguments: string }>;
  latencyMs: number;
  usage: { tokensIn?: number; tokensOut?: number; costUsd?: number };
  raw: unknown;
};

export type EmbeddingResult = {
  vectors: number[][];
  latencyMs: number;
  raw: unknown;
};

export class ModelMatrixError extends Error {
  constructor(
    message: string,
    public readonly errorClass: "configuration" | "transport" | "timeout" | "http" | "contract",
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ModelMatrixError";
  }
}

type FetchLike = typeof fetch;

function trimBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object") {
    throw new ModelMatrixError("model response is not an object", "contract");
  }
  return value as Record<string, any>;
}

function parseChatResponse(value: unknown): ChatResult["toolCalls"] {
  const body = asRecord(value);
  if (!Array.isArray(body.choices) || body.choices.length === 0) {
    throw new ModelMatrixError("model response missing choices", "contract");
  }
  const message = asRecord(body.choices[0]?.message);
  const rawCalls = message.tool_calls;
  if (rawCalls === undefined) return [];
  if (!Array.isArray(rawCalls)) throw new ModelMatrixError("tool_calls is not an array", "contract");
  return rawCalls.map((call: unknown) => {
    const item = asRecord(call);
    const fn = asRecord(item.function);
    if (typeof item.id !== "string" || typeof fn.name !== "string" || typeof fn.arguments !== "string") {
      throw new ModelMatrixError("malformed tool call", "contract");
    }
    return { id: item.id, name: fn.name, arguments: fn.arguments };
  });
}

function parseText(value: unknown): string {
  const body = asRecord(value);
  if (!Array.isArray(body.choices) || body.choices.length === 0) {
    throw new ModelMatrixError("model response missing choices", "contract");
  }
  const content = asRecord(body.choices[0]?.message).content;
  if (content === null || content === undefined) return "";
  if (typeof content !== "string") {
    throw new ModelMatrixError("model response content is not text", "contract");
  }
  return content;
}

function parseUsage(value: unknown): ChatResult["usage"] {
  const usage = (value && typeof value === "object" ? (value as Record<string, any>).usage : undefined) as Record<string, any> | undefined;
  if (!usage) return {};
  const result: ChatResult["usage"] = {};
  if (Number.isInteger(usage.prompt_tokens) && usage.prompt_tokens >= 0) result.tokensIn = usage.prompt_tokens;
  if (Number.isInteger(usage.completion_tokens) && usage.completion_tokens >= 0) result.tokensOut = usage.completion_tokens;
  if (typeof usage.cost_usd === "number" && usage.cost_usd >= 0) result.costUsd = usage.cost_usd;
  return result;
}

export class ModelMatrixClient {
  constructor(
    private readonly profile: ModelProfile,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  get descriptor() {
    return {
      kind: this.profile.kind,
      capability: this.profile.capability,
      provider: this.profile.provider,
      model: this.profile.model,
      configured: this.profile.liveEnabled && Boolean(this.profile.baseUrl && this.profile.model),
    };
  }

  private async request(path: string, payload: Record<string, unknown>): Promise<{ body: unknown; latencyMs: number }> {
    if (!this.profile.baseUrl || !this.profile.model) {
      throw new ModelMatrixError("model URL and model are required", "configuration");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.profile.timeoutMs);
    const started = Date.now();
    let response: Response;
    try {
      response = await this.fetchImpl(`${trimBaseUrl(this.profile.baseUrl)}${path}`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(this.profile.apiKey ? { Authorization: `Bearer ${this.profile.apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ModelMatrixError(`model request exceeded ${this.profile.timeoutMs}ms`, "timeout");
      }
      throw new ModelMatrixError(`model transport failed: ${error instanceof Error ? error.message : "unknown error"}`, "transport");
    } finally {
      clearTimeout(timer);
    }
    const latencyMs = Date.now() - started;
    if (!response.ok) {
      throw new ModelMatrixError(`model returned HTTP ${response.status}`, "http", response.status);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ModelMatrixError("model response was not valid JSON", "contract");
    }
    return { body, latencyMs };
  }

  async chat(input: {
    messages: ChatMessage[];
    tools?: ToolDefinition[];
    responseFormat?: Record<string, unknown>;
    maxTokens?: number;
  }): Promise<ChatResult> {
    const { body, latencyMs } = await this.request("/chat/completions", {
      model: this.profile.model,
      messages: input.messages,
      ...(input.tools ? { tools: input.tools } : {}),
      ...(input.responseFormat ? { response_format: input.responseFormat } : {}),
      max_tokens: input.maxTokens ?? 256,
    });
    const toolCalls = parseChatResponse(body);
    return { text: parseText(body), toolCalls, latencyMs, usage: parseUsage(body), raw: body };
  }

  async streamChat(messages: ChatMessage[], maxTokens = 256): Promise<{ text: string; chunks: number; latencyMs: number; usage: ChatResult["usage"] }> {
    if (!this.profile.baseUrl || !this.profile.model) {
      throw new ModelMatrixError("model URL and model are required", "configuration");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.profile.timeoutMs);
    const started = Date.now();
    let response: Response;
    try {
      response = await this.fetchImpl(`${trimBaseUrl(this.profile.baseUrl)}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(this.profile.apiKey ? { Authorization: `Bearer ${this.profile.apiKey}` } : {}),
        },
        body: JSON.stringify({ model: this.profile.model, messages, max_tokens: maxTokens, stream: true }),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ModelMatrixError(`model stream exceeded ${this.profile.timeoutMs}ms`, "timeout");
      }
      throw new ModelMatrixError(`model transport failed: ${error instanceof Error ? error.message : "unknown error"}`, "transport");
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new ModelMatrixError(`model returned HTTP ${response.status}`, "http", response.status);
    const body = await response.text();
    const deltas: string[] = [];
    let usage: ChatResult["usage"] = {};
    for (const line of body.split(/\r?\n/)) {
      if (!line.startsWith("data:") || line.slice(5).trim() === "[DONE]") continue;
      let event: any;
      try {
        event = JSON.parse(line.slice(5).trim());
      } catch {
        throw new ModelMatrixError("stream event was not valid JSON", "contract");
      }
      usage = { ...usage, ...parseUsage(event) };
      const delta = event.choices?.[0]?.delta?.content ?? event.delta;
      if (typeof delta !== "string") throw new ModelMatrixError("stream event missing text delta", "contract");
      deltas.push(delta);
    }
    if (deltas.length === 0) throw new ModelMatrixError("stream contained no text deltas", "contract");
    return { text: deltas.join(""), chunks: deltas.length, latencyMs: Date.now() - started, usage };
  }

  async structured<T>(input: {
    messages: ChatMessage[];
    name: string;
    schema: Record<string, unknown>;
    parse: (value: unknown) => T;
  }): Promise<{ value: T; latencyMs: number }> {
    const result = await this.chat({
      messages: input.messages,
      responseFormat: {
        type: "json_schema",
        json_schema: { name: input.name, strict: true, schema: input.schema },
      },
    });
    let value: unknown;
    try {
      value = JSON.parse(result.text);
    } catch {
      throw new ModelMatrixError("structured output was not valid JSON", "contract");
    }
    try {
      return { value: input.parse(value), latencyMs: result.latencyMs };
    } catch {
      throw new ModelMatrixError("structured output failed its schema", "contract");
    }
  }

  async embeddings(input: string | string[]): Promise<EmbeddingResult> {
    const { body, latencyMs } = await this.request("/embeddings", {
      model: this.profile.model,
      input,
    });
    let parsed;
    try {
      parsed = EmbeddingResponseSchema.parse(body);
    } catch {
      throw new ModelMatrixError("embedding response failed its schema", "contract");
    }
    return { vectors: parsed.data.sort((a, b) => a.index - b.index).map((item) => item.embedding), latencyMs, raw: body };
  }

  async vision(text: string, imageUrl: string): Promise<ChatResult> {
    return this.chat({
      messages: [{
        role: "user",
        content: [{ type: "text", text }, { type: "image_url", image_url: { url: imageUrl } }],
      }],
    });
  }
}

const env = (name: string, fallback = "") => process.env[name] || fallback;
const enabled = () => env("MODEL_MATRIX_LIVE") === "1" || env("LIVE_E2E") === "1";
const timeout = Number(env("MODEL_MATRIX_TIMEOUT_MS", "15000"));

export function liveProfile(capability: ModelCapability): ModelProfile {
  const common = {
    liveEnabled: enabled(),
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 15000,
  };
  if (capability === "embeddings") {
    return {
      ...common,
      kind: "foundation",
      capability,
      provider: env("MODEL_MATRIX_EMBEDDING_PROVIDER", "openai-compatible"),
      baseUrl: env("MODEL_MATRIX_EMBEDDING_URL", env("MODEL_MATRIX_FOUNDATION_URL", env("LIVE_MODEL_URL"))),
      model: env("MODEL_MATRIX_EMBEDDING_MODEL", env("MODEL_MATRIX_FOUNDATION_MODEL", env("LIVE_MODEL"))),
      apiKey: env("MODEL_MATRIX_EMBEDDING_API_KEY", env("MODEL_MATRIX_FOUNDATION_API_KEY", env("LIVE_MODEL_API_KEY"))),
    };
  }
  if (capability === "vision") {
    return {
      ...common,
      kind: "foundation",
      capability,
      provider: env("MODEL_MATRIX_VISION_PROVIDER", "openai-compatible"),
      baseUrl: env("MODEL_MATRIX_VISION_URL", env("MODEL_MATRIX_FOUNDATION_URL", env("LIVE_MODEL_URL"))),
      model: env("MODEL_MATRIX_VISION_MODEL", env("MODEL_MATRIX_FOUNDATION_MODEL", env("LIVE_MODEL"))),
      apiKey: env("MODEL_MATRIX_VISION_API_KEY", env("MODEL_MATRIX_FOUNDATION_API_KEY", env("LIVE_MODEL_API_KEY"))),
    };
  }
  if (capability === "structured_output") {
    return {
      ...common,
      kind: "foundation",
      capability,
      provider: env("MODEL_MATRIX_FOUNDATION_PROVIDER", "openai-compatible"),
      baseUrl: env("MODEL_MATRIX_FOUNDATION_URL", env("MODEL_MATRIX_GENERATIVE_URL", env("LIVE_MODEL_URL"))),
      model: env("MODEL_MATRIX_FOUNDATION_MODEL", env("MODEL_MATRIX_GENERATIVE_MODEL", env("LIVE_MODEL"))),
      apiKey: env("MODEL_MATRIX_FOUNDATION_API_KEY", env("MODEL_MATRIX_GENERATIVE_API_KEY", env("LIVE_MODEL_API_KEY"))),
    };
  }
  return {
    ...common,
    kind: "generative",
    capability,
    provider: env("MODEL_MATRIX_GENERATIVE_PROVIDER", "openai-compatible"),
    baseUrl: env("MODEL_MATRIX_GENERATIVE_URL", env("LIVE_MODEL_URL")),
    model: env("MODEL_MATRIX_GENERATIVE_MODEL", env("LIVE_MODEL")),
    apiKey: env("MODEL_MATRIX_GENERATIVE_API_KEY", env("LIVE_MODEL_API_KEY")),
  };
}

export function liveClient(capability: ModelCapability): ModelMatrixClient {
  return new ModelMatrixClient(liveProfile(capability));
}

export function isLiveConfigured(profile: ModelProfile): boolean {
  return profile.liveEnabled && Boolean(profile.baseUrl && profile.model);
}
