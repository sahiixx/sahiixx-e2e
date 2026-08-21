# sahiixx-e2e — max

Playwright + Prisma + isolated PG + AI/AGI real-time harness.

## Projects
| project | match | purpose |
|---------|-------|---------|
| chromium/firefox/webkit/mobile-chrome | default | web |
| ai | `tests/ai/**` | LLM streaming, NEXUS EV=P*commission, vector/RAG, orchestrator, SARA voice |
| realtime | `tests/realtime/**` | Phase25/26 live leads, GapClaw→NEXUS→Telegram |
| mcp | `tests/mcp/**` | Hermes MCP tools |

## Quick start
```bash
docker compose -f docker-compose.test.yml up -d          # pg on 5433
docker compose -f docker-compose.test.yml --profile ai up -d  # +redis+qdrant for vector tests
npm i && npx playwright install chromium
npm run test:e2e
npm run test:e2e:ai        # AI only (mocked)
LIVE_E2E=1 npm run test:live  # hits real freellmpool :8897 / hermes :8765 / ollama :11434
```

## Real-time data (2026-08-21)
- Providers: `configs/ai-providers.json` — freellmpool (primary, llm7/codestral-latest), ollama (llama3.2:3b), openrouter fallback.
- Hermes MCP `:8765`, WA bridge `:8766`, memory-broker `:8790`, orchestrator `:8792`, freellmpool `:8897`.
- Live scrapers: `phase25_realtime_global_scrapers.py`, `phase26_realtime_uae_commodity.py` every 15m; GapClaw scan every 2h.
- All AI tests mock `/api/ai/chat` SSE unless `LIVE_E2E=1`; fixtures in `fixtures/ai.ts`, `realtime.ts`, `mcp.ts` handle both.

## Ponytail cuts kept
- `redis`/`qdrant` behind `--profile ai` — not spun for plain web tests.
- `firefox`/`webkit` defined but cheap — CI installs only chromium unless you change workflow.
- `tools/llm-assert.ts` + `tools/eval-harness.ts` are 30-line helpers, no langchain/eval deps.
