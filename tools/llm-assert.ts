/**
 * Minimal LLM assertions for E2E — no extra deps.
 * Uses freellmpool (127.0.0.1:8897) if LIVE_E2E=1, otherwise mocked via route interception in tests.
 */

// ponytail: one helper, not a framework
export function assertLLMResponse(text: string, opts: { contains?: string[]; minLength?: number; notContains?: string[] } = {}) {
  if (opts.minLength && text.length < opts.minLength) throw new Error(`LLM response too short: ${text.length} < ${opts.minLength}`);
  for (const s of opts.contains || []) if (!text.toLowerCase().includes(s.toLowerCase())) throw new Error(`LLM response missing "${s}": ${text.slice(0, 200)}`);
  for (const s of opts.notContains || []) if (text.toLowerCase().includes(s.toLowerCase())) throw new Error(`LLM response should not contain "${s}"`);
}

export async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

// real call only when LIVE_E2E=1
export async function liveChat(prompt: string): Promise<string> {
  const r = await fetch('http://127.0.0.1:8897/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llm7/codestral-latest', messages: [{ role: 'user', content: prompt }], max_tokens: 256 }),
  });
  if (!r.ok) throw new Error(`freellmpool ${r.status}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? '';
}
