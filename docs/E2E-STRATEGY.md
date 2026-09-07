# SAHIIXX E2E Strategy

## Two layers

| Layer | Tool | Repo | Purpose |
|-------|------|------|--------|
| System / product | Playwright | `sahiixx-e2e` | UI, AI streaming, NEXUS, realtime, MCP, Lead Machine |
| Component | Jest | `sahiix-proxy` (and future services) | Auth, rate-limit, governance, webhooks |

## Projects inside sahiixx-e2e

- `chromium` / `firefox` / `webkit` / `mobile-chrome` — web UI
- `ai` — LLM stream, NEXUS EV, vector, orchestrator, SARA
- `realtime` — live leads / GapClaw
- `mcp` — Hermes tools
- `lead-machine` — QualificationAgent + event contracts (new)

## Mock vs Live

- Default: AI routes are mocked via Playwright `page.route`.
- `LIVE_E2E=1` hits freellmpool / Hermes / Ollama.
- Lead Machine pure scorer always runs (no network).
- Live OPA / bus endpoints skip gracefully when 404.

## How to add a new agent test

1. Put the input/output schema in `fixtures/`.
2. Add a pure reference implementation in `tools/` (becomes the oracle).
3. Write Playwright tests that exercise the pure function + optional live endpoint.
4. Register a Playwright project if the suite is large.

## CI philosophy

- PRs → smoke (chromium + lead-machine pure tests) — fast.
- main/develop → full suite.
- Nightly (future) → `LIVE_E2E=1`.
