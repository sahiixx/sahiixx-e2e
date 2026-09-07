# Next

## Done in this branch
- [x] Lead Machine contracts (`fixtures/lead-machine.ts`)
- [x] Pure QualificationScorer + Playwright tests
- [x] CI hardening (smoke job, path fixes)
- [x] E2E strategy doc

## Immediate
- [ ] Land real `qualification_agent.py` in OPA and flip the live endpoint test from skip → assert
- [ ] Wire NEXUS WhatsApp → `lead.created` event (option c from E2E-WIRING-PACK)
- [ ] Scaffold `lead.created/qualified/matched/scheduled` schemas on MessageBus

## CI / ops
- [ ] Set secrets: `NEXTAUTH_SECRET`, `GITHUB_CLIENT_ID/SECRET`, `TEST_JWT_TOKEN`
- [ ] `docker compose --profile ai up -d` on CI runner for vector tests
- [ ] Nightly cron: `LIVE_E2E=1` against freellmpool + hermes MCP + ollama
