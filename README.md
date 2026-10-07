# sahiixx-e2e — contract-first release harness

Playwright harness for the NEXUS → OPA → bus → OS path, with runtime contracts,
deterministic evaluation and explicit live-service lanes.

Read [`docs/E2E-ARCHITECTURE.md`](docs/E2E-ARCHITECTURE.md) for the current
architecture, promotion gates and secret policy.

## Projects
| project | match | purpose |
|---------|-------|---------|
| chromium/firefox/webkit/mobile-chrome | default | web |
| ai | `tests/ai/**` | Existing product AI checks: LLM streaming, NEXUS EV=P*commission, vector/RAG, orchestrator, SARA voice |
| traditional-models | `tests/models/traditional-model.spec.ts` | deterministic classification and lead scoring; no provider required |
| generative-models | `tests/models/generative-model.spec.ts` | chat, SSE streaming and tool-call contracts plus optional live canary |
| foundation-models | `tests/models/foundation-model.spec.ts` | structured output, embeddings and vision contracts plus optional live canaries |
| realtime | `tests/realtime/**` | Phase25/26 live leads, GapClaw→NEXUS→Telegram |
| mcp | `tests/mcp/**` | Hermes MCP tools |
| contracts | `tests/contracts/**` | runtime schemas, event envelopes, idempotency, redaction |
| integration | `tests/integration/**` | OPA and sahiixx-bus boundaries when URLs are configured |

## Quick start
```bash
docker compose -f docker-compose.test.yml up -d          # pg on 5433
docker compose -f docker-compose.test.yml --profile ai up -d  # +redis+qdrant for vector tests
npm i && npx playwright install chromium
npm run test:e2e:contracts # no target service required
npm run test:e2e:models # all three model lanes; live calls are opt-in
MODEL_MATRIX_LIVE=1 npm run test:e2e:generative # configured generative canary
MODEL_MATRIX_LIVE=1 npm run test:e2e:foundation # configured foundation canaries
BASE_URL=http://localhost:3000 npm run test:e2e:ai # target app is externally managed
OPA_BASE_URL=http://127.0.0.1:8082 BUS_BASE_URL=http://127.0.0.1:8090 npm run test:e2e:integration
LIVE_E2E=1 npm run test:live # explicit provider canary; never a PR default
```

## Live provider canaries
- `configs/ai-providers.json` is provider-neutral: URLs, model IDs and keys come from environment variables.
- Set `LIVE_MODEL_URL`, `LIVE_MODEL` and optionally `LIVE_MODEL_API_KEY` before enabling `LIVE_E2E=1`.
- Set `MCP_URL`, `MEMORY_BROKER_URL` or `ORCHESTRATOR_URL` only for the corresponding integration lane.
- All AI tests mock `/api/ai/chat` SSE unless `LIVE_E2E=1`; fixtures in `fixtures/ai.ts`, `realtime.ts`, `mcp.ts` handle both.
- A configured live endpoint fails on 404/5xx or contract mismatch; only an unconfigured lane skips.

## Unified model matrix
- Traditional tests are pure, deterministic reference tests for classification and scoring. They are the oracle for cases where a generative model is unnecessary.
- Generative tests use the OpenAI-compatible `/chat/completions` contract for text, SSE and tool calls.
- Foundation tests use `/chat/completions` for JSON-schema output and vision, and `/embeddings` for vector output. Separate capability URLs/models are supported when one provider does not expose every capability.
- Mock adapter tests always run in PRs. Live tests require `MODEL_MATRIX_LIVE=1` (or the legacy `LIVE_E2E=1`) and the capability-specific URL/model variables.
- `MODEL_MATRIX_TIMEOUT_MS` bounds provider calls; `MODEL_MATRIX_MAX_LATENCY_MS` makes the canary budget explicit.
- The adapter classifies configuration, transport, timeout, HTTP and contract failures. API keys are only sent in request headers and never included in assertion output.

## Architecture choices

- Contract-first: `contracts/` is the TypeScript runtime boundary for Python services.
- Deterministic by default: fixed fixtures, bounded tests and no provider calls in PR smoke.
- Agent complexity is earned by measurable improvement; workflows precede autonomous loops.
- Traceability is mandatory: tenant, correlation, causation and idempotency fields travel with events.
- Secrets stay outside fixtures and artifacts; diagnostic payloads are redacted before assertion output.

## Ponytail cuts kept
- `redis`/`qdrant` behind `--profile ai` — not spun for plain web tests.
- `firefox`/`webkit` defined but cheap — CI installs only chromium unless you change workflow.
- `tools/llm-assert.ts` + `tools/eval-harness.ts` are 30-line helpers, no langchain/eval deps.
