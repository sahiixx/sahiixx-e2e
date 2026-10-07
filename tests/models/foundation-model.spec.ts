import { test, expect } from "@playwright/test";
import { z } from "zod";
import { ModelMatrixClient, isLiveConfigured, liveClient, liveProfile } from "../../tools/model-matrix";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

const profile = {
  kind: "foundation" as const,
  capability: "structured_output" as const,
  provider: "mock",
  baseUrl: "http://mock.local/v1",
  model: "mock-foundation",
  timeoutMs: 1000,
  liveEnabled: true,
};

test.describe("Foundation model lane", () => {
  test("validates structured output against the application schema", async () => {
    const LeadSchema = z.object({ lead_id: z.string(), qualified: z.boolean(), score: z.number().min(0).max(100) });
    const client = new ModelMatrixClient(profile, async (_input, init) => {
      const request = JSON.parse(String(init?.body));
      expect(request.response_format.type).toBe("json_schema");
      return jsonResponse({ choices: [{ message: { content: '{"lead_id":"lead-1","qualified":true,"score":88}' } }] });
    });
    const result = await client.structured({
      messages: [{ role: "user", content: "Extract lead-1" }],
      name: "lead_qualification",
      schema: { type: "object", properties: { lead_id: { type: "string" }, qualified: { type: "boolean" }, score: { type: "number" } }, required: ["lead_id", "qualified", "score"], additionalProperties: false },
      parse: (value) => LeadSchema.parse(value),
    });
    expect(result.value).toEqual({ lead_id: "lead-1", qualified: true, score: 88 });
  });

  test("normalizes embeddings by index for deterministic retrieval assertions", async () => {
    const embeddingProfile = { ...profile, capability: "embeddings" as const };
    const client = new ModelMatrixClient(embeddingProfile, async () => jsonResponse({
      data: [{ index: 1, embedding: [0.2, 0.3] }, { index: 0, embedding: [0.1, 0.4] }],
    }));
    const result = await client.embeddings(["first", "second"]);
    expect(result.vectors).toEqual([[0.1, 0.4], [0.2, 0.3]]);
  });

  test("sends text and image content through the vision capability", async () => {
    const client = new ModelMatrixClient({ ...profile, capability: "vision" }, async (_input, init) => {
      const request = JSON.parse(String(init?.body));
      expect(request.messages[0].content[1].type).toBe("image_url");
      return jsonResponse({ choices: [{ message: { content: "The image contains a property listing." } }] });
    });
    const result = await client.vision("Describe the listing", "data:image/png;base64,ZmFrZQ==");
    expect(result.text).toContain("property listing");
  });

  test("runs a configured structured-output provider as an opt-in canary", async () => {
    const provider = liveProfile("structured_output");
    if (!isLiveConfigured(provider)) test.skip(true, "set MODEL_MATRIX_LIVE=1 with a foundation URL and model");
    const result = await liveClient("structured_output").structured({
      messages: [{ role: "user", content: "Return JSON with {\"status\":\"matrix-ok\"}." }],
      name: "matrix_status",
      schema: { type: "object", properties: { status: { type: "string", enum: ["matrix-ok"] } }, required: ["status"], additionalProperties: false },
      parse: (value) => z.object({ status: z.literal("matrix-ok") }).parse(value),
    });
    expect(result.value).toEqual({ status: "matrix-ok" });
  });

  test("runs a configured embedding provider as an opt-in canary", async () => {
    const provider = liveProfile("embeddings");
    if (!isLiveConfigured(provider)) test.skip(true, "set MODEL_MATRIX_LIVE=1 with an embedding URL and model");
    const result = await liveClient("embeddings").embeddings("Dubai Marina investment");
    expect(result.vectors.length).toBe(1);
    expect(result.vectors[0].length).toBeGreaterThan(0);
  });

  test("runs a configured vision provider as an opt-in canary", async () => {
    const provider = liveProfile("vision");
    if (!isLiveConfigured(provider)) test.skip(true, "set MODEL_MATRIX_LIVE=1 with a vision URL and model");
    const result = await liveClient("vision").vision(
      "Describe this image in one sentence",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    );
    expect(result.text.trim().length).toBeGreaterThan(0);
  });
});
