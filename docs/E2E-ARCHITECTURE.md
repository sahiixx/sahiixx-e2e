# E2E Architecture — contract-first agent systems

**Status:** implementation baseline · **Reviewed:** 2026-10-06

This repository is the release-verification boundary for the NEXUS → OPA →
boundaries; it does not pretend that a mocked model response proves a live
deployment.

## Design principles

### 1. One canonical contract at every boundary

Lead payloads and event envelopes are validated at runtime in
`contracts/`. The same fields are used by pure tests, mocked tests and live
service tests. Additive service fields are allowed; malformed identity,
timestamps, scores, status or trace metadata fail immediately.

The first contracts are:

```text
LeadCreated → LeadQualified → LeadMatched
       \             |
        \            +--> human approval / scheduling boundary
         +--> event envelope with correlation + idempotency
```

### 2. Deterministic fast lane, explicit live lane

| Lane | Command | Network | Purpose |
|---|---|---:|---|
| Contract | `npm run test:e2e:contracts` | no | schema, oracle and regression checks |
| Service integration | `npm run test:e2e:integration` | OPA/bus only when URLs are set | real boundary compatibility |
| UI/product | `npx playwright test --project=chromium` | target `BASE_URL` | browser behavior |
| AI mocked | `npm run test:e2e:ai` | target `BASE_URL` | deterministic tool/stream behavior |
| AI live | `LIVE_E2E=1 npm run test:live` | external providers | canary, latency and provider checks |
| Model matrix | `npm run test:e2e:models` | no network by default | traditional, generative and foundation capability contracts |
| Model canary | `MODEL_MATRIX_LIVE=1 npm run test:e2e:models` | configured providers | chat, streaming, tools, structured output, embeddings and vision |

`OPA_BASE_URL` and `BUS_BASE_URL` are opt-in. If either is configured, a 404,
5xx or schema mismatch fails; the suite only skips when the lane was not
configured. `REQUIRE_LIVE=1` turns missing service URLs into a configuration
failure for release environments.

### 3. Fixed budgets and comparable metrics

The evaluation loop follows the useful part of Karpathy's autoresearch/nanochat
discipline:

- fixed scenario inputs and bounded wall-clock budgets;
- one architecture or prompt change per experiment;
- an explicit metric and artifact for every run;
- keep/reject based on measured output, not an agent's self-reported confidence;
- replayable idempotency keys for the same event and tenant.

The E2E harness measures contract pass rate, latency, retry count, token/cost
metadata when provided, approval violations and provider error class. It does
not treat a benchmark score or an LLM judge as the sole source of truth.

### Model capability matrix

The model matrix keeps capability assertions separate from product UI tests:

| Class | Default implementation | Contracted capabilities | Live transport |
|---|---|---|---|
| Traditional | deterministic reference functions | classification, scoring | none |
| Generative | mocked OpenAI-compatible adapter | chat, SSE streaming, tool calls | `/chat/completions` |
| Foundation | mocked OpenAI-compatible adapter | JSON schema output, embeddings, vision | `/chat/completions`, `/embeddings` |

Every live capability has its own environment profile. A missing profile skips
only that capability; a configured profile fails on provider errors, timeouts or
schema violations. This prevents a healthy chat endpoint from masking a broken
embedding or vision endpoint. The shared adapter records latency and normalizes
responses before the application-specific assertions run.

### 4. Simple, composable agent paths

Following Anthropic's guidance on effective agents, use the least complex shape
that satisfies the task:

1. pure deterministic extraction where rules are enough;
2. prompt chain with programmatic gates for fixed subtasks;
3. routing for distinct lead intents or model capability classes;
4. parallel/evaluator paths only when a rubric measures the gain;
5. autonomous loops only with max iterations, deadlines, tool allowlists and a
   human checkpoint for production actions.

The E2E suite keeps these shapes visible instead of hiding them behind a large
framework. See [Anthropic's agent guidance](https://www.anthropic.com/research/building-effective-agents).

### 5. Tool and protocol safety

MCP tools are treated as privileged capabilities, not trusted prompts. Live
tests must verify:

- explicit tenant and actor identity;
- consent/approval before write, financial or production actions;
- least-privilege tool scopes;
- no cross-tenant resource access;
- cancellation, timeout and error propagation;
- redacted diagnostics and artifacts.

This follows the [MCP specification](https://modelcontextprotocol.io/specification/2025-06-18),
which requires implementors to design consent, privacy, authorization and tool
safety into the host application.

### 6. Runtime control stays with the application

Model selection, storage, approvals, tools and deployment belong to the
application boundary. Tests therefore assert the selected capability class and
constraints where available, rather than hard-coding one provider's model name
as product behavior. See the [OpenAI Agents comparison](https://developers.openai.com/api/docs/guides/agents)
for the distinction between managed agents, an application-owned SDK runtime and
direct Responses API control.

## Repository map

```text
contracts/
  lead-machine.ts       LeadCreated / Qualified / Matched schemas
  event-envelope.ts     trace, causation and idempotency envelope
  redaction.ts          artifact-safe diagnostics
fixtures/               canonical examples and deterministic variants
tools/model-matrix.ts   provider-neutral generative/foundation adapter
tools/traditional-model.ts deterministic classification/scoring oracle
tests/models/            isolated model-class and capability lanes
```

## Secrets and environments

| Variable | Required for | Storage |
|---|---|---|
| `BASE_URL` | UI/API target | local environment or CI secret/variable |
| `OPA_BASE_URL` | OPA integration lane | local environment or CI variable |
| `BUS_BASE_URL` | bus integration lane | local environment or CI variable |
| `MCP_URL` | MCP lane | local environment or CI variable |
| `FREELLMPOOL_URL`, `OLLAMA_URL` | provider canaries | local environment or CI variable |
| `MODEL_MATRIX_*_URL`, `MODEL_MATRIX_*_MODEL` | capability-specific model canaries | local environment or CI variable |
| `TEST_JWT_TOKEN` | authenticated browser lane | CI secret only |
| provider/API keys | live provider lane | CI secret or local secret manager only |

Never put real tokens in `.env.test.example`, fixtures, trace files, videos or
failure messages. `redactSecrets()` is used before diagnostics are serialized.
Local test passwords are disposable container credentials, never deployment
credentials.

## Promotion gates

1. **PR:** contract lane and deterministic lead-machine tests pass.
2. **Integration release candidate:** OPA and bus URLs configured with
   `REQUIRE_LIVE=1`; capture → qualify → match passes schema checks.
3. **Production canary:** mocked AI suite plus bounded live provider checks;
   compare latency, cost, error and approval metrics to the previous run. Run
   the generative and foundation capabilities independently so one provider
   does not hide a failure in another capability.
4. **Promote:** no unresolved contract, tenant-isolation, consent, idempotency
   or redaction failures.

The architecture is deliberately incremental: first make the boundaries
measurable, then add autonomy only where the evaluation shows a durable gain.
