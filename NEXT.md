# Next

## Done in this branch
- [x] Runtime Lead Machine schemas (`contracts/lead-machine.ts`)
- [x] Event envelope with correlation, causation and idempotency fields
- [x] Secret-safe diagnostics for test artifacts
- [x] Contract lane separated from externally managed service/UI lanes
- [x] Explicit OPA and `sahiixx-bus` service-boundary tests
- [x] E2E architecture and promotion-gate documentation

## Immediate
- [ ] Publish the same JSON Schema/types to OPA and `sahiixx-bus` so Python and TypeScript validate one artifact
- [ ] Wire NEXUS WhatsApp → `lead.created` event with an outbox and idempotency key
- [ ] Make `lead.created/qualified/matched/scheduled` durable bus events with retry/DLQ and trace propagation
- [ ] Add approval-state contracts before scheduling, offers or other Tier-2 actions
- [ ] Add tenant-isolation, consent and tool-scope tests for MCP and write-capable tools

## CI / ops
- [ ] Configure `BASE_URL`, `OPA_BASE_URL` and `BUS_BASE_URL` as environment-specific variables, not fixtures
- [ ] Store `NEXTAUTH_SECRET`, OAuth credentials, JWTs and provider keys only in CI secret storage
- [ ] Run `REQUIRE_LIVE=1 npm run test:e2e:integration` in release-candidate environments
- [ ] Nightly canary: `LIVE_E2E=1` with bounded budgets and latency/cost/error artifacts
