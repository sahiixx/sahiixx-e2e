/**
 * Tiny eval harness — scores NEXUS/MCP/agent outputs without extra deps.
 * ponytail: console table, not a dashboard lib.
 */
export type EvalCase = { input: string; expected: string; actual: string; pass: boolean; latencyMs: number };

export function score(cases: EvalCase[]) {
  const pass = cases.filter(c => c.pass).length;
  console.table(cases.map(c => ({ input: c.input.slice(0, 40), pass: c.pass ? '✓' : '✗', ms: c.latencyMs })));
  console.log(`eval: ${pass}/${cases.length} passed (${((pass / cases.length) * 100).toFixed(1)}%)`);
  return pass === cases.length;
}

export function latencyCheck(ms: number, budgetMs = 3000) {
  if (ms > budgetMs) throw new Error(`latency ${ms}ms > budget ${budgetMs}ms`);
}
