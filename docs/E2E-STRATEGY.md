# SAHIIXX E2E Strategy

The detailed architecture is in [`E2E-ARCHITECTURE.md`](./E2E-ARCHITECTURE.md).

## Two layers

| Layer | Tool | Repo | Purpose |
|-------|------|------|--------|
| System / product | Playwright | `sahiixx-e2e` | UI, AI streaming, NEXUS, realtime, MCP, Lead Machine |
| Component | service-native tests | owning service repositories | Auth, rate-limit, governance, webhooks |

## Projects inside sahiixx-e2e

- `chromium` / `firefox` / `webkit` / `mobile-chrome` — web UI
- `ai` — LLM stream, NEXUS EV, vector, orchestrator, SARA
- `realtime` — live leads / GapClaw
- `mcp` — Hermes tools
- `lead-machine` — QualificationAgent + event contracts
- `contracts` — runtime schemas, idempotency, envelopes and redaction
- `integration` — explicit OPA / bus boundary tests

## Mock vs Live

- Default: contract and AI routes are deterministic/mocked.
- `LIVE_E2E=1` hits freellmpool / Hermes / Ollama.
- `OPA_BASE_URL` / `BUS_BASE_URL` enable live service checks.
- A configured live service never skips on 404/5xx; it fails with a redacted diagnostic.

## How to add a new agent test

1. Put the runtime input/output schema in `contracts/`.
2. Add a canonical fixture with a deterministic variant.
3. Add a pure reference implementation only for deterministic behavior; never use it as proof that a service is live.
4. Add a service-boundary test gated by an explicit service URL.
5. Validate trace identity, idempotency, approval state and redacted failures.
6. Register a Playwright project if the suite is large.

## CI philosophy

- PRs → `npm run test:e2e:contracts` — fast, no external services.
- Release candidate → contracts + integration with `REQUIRE_LIVE=1`.
- UI/AI → only when `BASE_URL` and its target services are explicitly provided.
- Nightly canaries → `LIVE_E2E=1` with bounded budgets and stored metrics.
