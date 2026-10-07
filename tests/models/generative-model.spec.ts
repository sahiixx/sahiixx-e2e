import { test, expect } from "@playwright/test";
import { ModelMatrixClient, ModelMatrixError, isLiveConfigured, liveClient, liveProfile } from "../../tools/model-matrix";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

const profile = {
  kind: "generative" as const,
  capability: "chat" as const,
  provider: "mock",
  baseUrl: "http://mock.local/v1",
  model: "mock-chat",
  timeoutMs: 1000,
  liveEnabled: true,
};

test.describe("Generative model lane", () => {
  test("validates chat output and tool calls through the shared adapter", async () => {
    const client = new ModelMatrixClient(profile, async (_input, init) => {
      const request = JSON.parse(String(init?.body));
      expect(request.model).toBe("mock-chat");
      expect(request.tools[0].function.name).toBe("create_follow_up");
      return jsonResponse({
        choices: [{
          message: {
            content: "Qualified lead requires a follow-up",
            tool_calls: [{ id: "call-1", function: { name: "create_follow_up", arguments: '{"lead_id":"lead-1"}' } }],
          },
        }],
        usage: { prompt_tokens: 12, completion_tokens: 7, cost_usd: 0.001 },
      });
    });
    const result = await client.chat({
      messages: [{ role: "user", content: "Qualify lead-1" }],
      tools: [{ type: "function", function: { name: "create_follow_up", parameters: { type: "object" } } }],
    });

    expect(result.text).toContain("follow-up");
    expect(result.toolCalls).toEqual([{ id: "call-1", name: "create_follow_up", arguments: '{"lead_id":"lead-1"}' }]);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.usage).toEqual({ tokensIn: 12, tokensOut: 7, costUsd: 0.001 });
  });

  test("parses every SSE delta and preserves ordering", async () => {
    const client = new ModelMatrixClient(profile, async () => new Response(
      'data: {"choices":[{"delta":{"content":"hello"}}]}\n'
      + 'data: {"choices":[{"delta":{"content":" world"}}]}\n'
      + 'data: [DONE]\n\n',
      { status: 200, headers: { "content-type": "text/event-stream" } },
    ));
    const result = await client.streamChat([{ role: "user", content: "Say hello" }]);
    expect(result.text).toBe("hello world");
    expect(result.chunks).toBe(2);
  });

  test("classifies provider HTTP failures without exposing the API key", async () => {
    const client = new ModelMatrixClient({ ...profile, apiKey: "secret-test-key" }, async () => jsonResponse({ error: "rate limited" }, 429));
    const error = await client.chat({ messages: [{ role: "user", content: "ping" }] }).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(ModelMatrixError);
    expect((error as ModelMatrixError).errorClass).toBe("http");
    expect((error as Error).message).not.toContain("secret-test-key");
  });

  test("runs a configured generative provider as an opt-in canary", async () => {
    const provider = liveProfile("chat");
    if (!isLiveConfigured(provider)) test.skip(true, "set MODEL_MATRIX_LIVE=1 with a generative URL and model");
    const result = await liveClient("chat").chat({ messages: [{ role: "user", content: "Reply with exactly: matrix-ok" }], maxTokens: 16 });
    expect(result.text.trim().length).toBeGreaterThan(0);
    expect(result.latencyMs).toBeLessThanOrEqual(Number(process.env.MODEL_MATRIX_MAX_LATENCY_MS || 15000));
  });
});
