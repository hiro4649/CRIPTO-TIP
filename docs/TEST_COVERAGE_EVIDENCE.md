# Test Coverage Evidence

## v1.0.8 Full Repository Audit Note

The audit PR keeps product runtime code unchanged and uses repository checks, evidence CI, quality self-protection, secret scanning, no-scraping scanning, and the existing unit/integration suite as its verification oracle. Provider-specific real apply, durable manual-gate audit storage, production RPC operation, and live YouTube account operation remain deferred and manual-gated.

## PR github-run-artifact-auto-injection

Latest local result: `corepack pnpm test` and `npm test` passed with 21 test
files, 196 passed tests, and 6 skipped tests.

Coverage added:

- GitHub PR/run/artifact fixture parsing.
- Latest successful `ci` run selection for the active pull request head.
- Latest successful `quality-gate` run selection for the active pull request
  head.
- `codex-quality-gate-safe-artifacts` artifact ID extraction.
- Quality-gate artifact rejection when artifact run/head metadata does not
  match the selected quality-gate run.
- Stale-head run rejection.
- Concrete evidence-pack head mismatch rejection.
- Missing quality-gate artifact rejection.
- CI run and quality-gate artifact freshness validation.
- Offline-readonly evidence mode without mutation.
- Placeholder scanner coverage across `.codex`, docs, `.github`,
  `README.md`, and `package.json`.

Uncovered by local tests: live GitHub API permission drift and provider outage.
The fetcher is fail-closed unless `--offline-readonly` is explicitly supplied.

## PR production-chain-listener-reorg

Latest local result: `corepack pnpm test` passed with 13 test files, 89 passed tests, and 6 skipped tests.

Risk coverage added:

- Chain ABI correctness: `apps/api/src/chain/tip-router-listener.test.ts`.
- Duplicate on-chain log idempotency: `apps/api/src/chain/tip-router-listener.test.ts`.
- `eth_getLogs` catch-up and cursor persistence: `apps/api/src/chain/tip-router-listener.test.ts`.
- WebSocket subscription boundary: `apps/api/src/chain/tip-router-listener.test.ts`.
- Confirmation window gating before `support.normalize`: `apps/api/src/chain/tip-router-listener.test.ts`.
- Reorg status transition: `apps/api/src/chain/tip-router-listener.test.ts`.
- Repository chain cursor and transaction status methods: `apps/api/src/repositories/in-memory.test.ts`, `apps/api/src/repositories/postgres.test.ts`.
- Migration coverage for `chain_cursors`: `apps/api/src/db/migration.test.ts`.

Still uncovered by live production tests: production RPC endpoint behavior, listener process supervision, multi-chain routing, multi-token routing, official YouTube connector, and production IRIS Core delivery.

PR iris-core-delivery-adapter adds `apps/api/src/iris/delivery-worker.test.ts` for IRIS delivery behavior:

- support.received delivery success.
- character.reaction.requested delivery success.
- affinity.apply delivery success.
- memory.write_candidate delivery success.
- idempotent delivery by outbox idempotency key.
- timeout and 5xx retry/backoff state.
- 401 and 403 immediate DLQ path independent of `max_retry_count`.
- terminal outbox errors move to DLQ without completing or retrying the job.
- wallet address and secret exclusion from IRIS payloads.
- outbox complete/fail integration.
- no unsafe valuation wording in reaction delivery payload.

Latest local command: `corepack pnpm test apps/api`.

Latest local result: 11 test files, 74 total tests, 68 passed tests, 6 skipped tests.

The skipped live Postgres tests require `RUN_LIVE_POSTGRES_TESTS=true` and `DATABASE_URL`. GitHub CI provides those values with a Postgres service, so the migration application and live repository tests run remotely.

Quality-gate npm entry command remains `npm test`; it is a real test command and is not a bypass.

| Workspace | Test files | Tests | Covered risks |
| --- | ---: | ---: | --- |
| `apps/api` | 6 | 30 passed, 5 skipped locally | API idempotency, public DTO privacy, moderation gate side effects, injected repository use, Postgres SQL boundary, live Postgres migration/constraint tests, stale lock reclaim, admin DLQ retry, outbox worker, migration constraints, config validation. |
| `apps/overlay` | 1 | 2 | Malformed WebSocket message handling and overlay event schema handling. |
| `apps/web` | 1 | 2 | Required safety text and prohibited UI wording guard. |
| `packages/shared` | 1 | 15 | Sanitization, wallet address redaction, moderation decisions, affinity caps, schemas, normalizers, overlay event schema, AI request privacy. |

## Risk-To-Test Mapping

| Risk | Test evidence | Status |
| --- | --- | --- |
| Duplicate support event double-applies affinity. | API and repository idempotency tests. | Covered. |
| Duplicate chain log creates duplicate transaction. | In-memory and live Postgres chain log idempotency tests. | Covered. |
| Public TipIntent leaks wallet or raw viewer data. | API and Postgres public DTO tests. | Covered. |
| Unsafe moderation status reaches overlay or AI reaction. | API moderation gate tests. | Covered. |
| `display_only` is read aloud or changes affinity. | API display-only test. | Covered. |
| `server.ts` depends on global in-memory maps. | Server injection tests plus no-match rg command. | Covered. |
| Outbox retry never reaches DLQ. | Worker, repository, and live Postgres DLQ tests. | Covered. |
| Stale outbox locks remain stuck. | In-memory, worker boundary, and live Postgres stale reclaim tests. | Covered. |
| Admin DLQ retry lacks audit trail. | API endpoint test and live Postgres audit-log test. | Covered. |
| Production local mock defaults are accepted. | Config production reject test. | Covered. |
| Contract behavior regresses. | GitHub CI contracts job. | Covered in CI; local Foundry unavailable. |
| Production Chain Listener behavior. | Not in PR #4 scope. | Not covered. |
| Official YouTube API connector behavior. | `apps/api/src/youtube/connector.test.ts`, `apps/api/src/youtube/verification.test.ts`, `packages/shared/src/index.test.ts`. | Covered for adapter boundary, 403 quota/rate-limit retry classification, non-retry auth/forbidden/page token cases, and mock JSON fixtures; live API soak not covered. |
| Production IRIS Core delivery behavior. | Not in PR #4 scope. | Not covered. |

## PR youtube-ops-hardening

Latest local targeted result before full-suite replay: `corepack pnpm test apps/api/src/youtube apps/api/src/config/env.test.ts` passed with 14 test files, 100 passed tests, and 6 skipped tests.

Risk coverage added:

- Production YouTube credential source boundary: `apps/api/src/config/env.test.ts`.
- YouTube metrics name contract: `apps/api/src/youtube/operations.test.ts`.
- `liveChatId` acquisition boundary: `apps/api/src/youtube/operations.test.ts`.
- Quota/rate-limit operational classification: `apps/api/src/youtube/operations.test.ts`.
- Non-retry operator action classification: `apps/api/src/youtube/operations.test.ts`.
- Bounded streamList reconnect and list fallback conditions: `apps/api/src/youtube/operations.test.ts`.
- `pollingIntervalMillis` handling for fallback polling: `apps/api/src/youtube/operations.test.ts`.
- Deterministic long-running mock soak boundary: `apps/api/src/youtube/operations.test.ts`.

Still uncovered by live production tests: real YouTube account authorization, live quota dashboard ingestion, alert routing, and production secret manager provider wiring.

## PR youtube-prod-observability

Latest local result after this PR: full-suite `corepack pnpm test` passes with 16 test files, 124 passed tests, and 6 skipped tests. `npm test` must match this count before PR merge.

Additional PR #12 coverage includes provider-specific YouTube credential provider boundary, credential rotation plan validation, dashboard contract JSON parity, alert routing config, quota/rate-limit/auth/page-token/liveChatId metric mappings, reconnect/fallback/verification alerts, zero-events-while-live alerting, and manual live YouTube soak default skip behavior.

Risk coverage added:

- Secret manager credential provider mock: `apps/api/src/youtube/credentials.test.ts`.
- Production rejects local-env YouTube credential source: `apps/api/src/youtube/credentials.test.ts`, `apps/api/src/config/env.test.ts`.
- Credential rotation boundary via secret names: `apps/api/src/youtube/credentials.test.ts`, `docs/YOUTUBE_CREDENTIALS.md`.
- Metrics names contract: `apps/api/src/youtube/operations.test.ts`.
- Quota/rate-limit/auth/invalid-page-token metric mapping: `apps/api/src/youtube/operations.test.ts`.
- liveChatId missing metric: `apps/api/src/youtube/operations.test.ts`.
- Manual live YouTube soak skip gate: `apps/api/src/youtube/operations.test.ts`.

Still uncovered by automated tests: provider-specific secret manager SDK, real dashboard exporter, alert delivery, and live YouTube account operation.

## PR observability-exporter-integration

Latest local targeted result before full-suite replay: `corepack pnpm test apps/api/src/youtube/observability-exporter.test.ts` passed as part of the full workspace command with 17 test files, 140 passed tests, and 6 skipped tests.

Risk coverage added:

- Observability exporter mock boundary: `apps/api/src/youtube/observability-exporter.test.ts`.
- Prometheus-compatible metric output: `apps/api/src/youtube/observability-exporter.test.ts`.
- OpenTelemetry-compatible metric output: `apps/api/src/youtube/observability-exporter.test.ts`.
- YouTube metric snapshot publishing: `apps/api/src/youtube/observability-exporter.test.ts`.
- Dashboard contract parity: `apps/api/src/youtube/observability-exporter.test.ts`.
- Alert routing label parity: `apps/api/src/youtube/observability-exporter.test.ts`.
- Quota, rate-limit, auth, invalid page token, liveChatId missing, stream reconnect storm, list fallback spike, zero events while live, and verification failure alert export mappings: `apps/api/src/youtube/observability-exporter.test.ts`.
- Manual live YouTube soak result ingestion gate: `apps/api/src/youtube/observability-exporter.test.ts`.

Still uncovered by automated tests: provider-specific dashboard deployment apply, external alert delivery with real provider credentials, and live YouTube account operation.

## PR dashboard-exporter-deployment

Latest local targeted result before full-suite replay: `corepack pnpm test apps/api/src/youtube/dashboard-deployment.test.ts` passed as part of the workspace command with 18 test files, 151 passed tests, and 6 skipped tests.

Risk coverage added:

- Dashboard provider mock boundary: `apps/api/src/youtube/dashboard-deployment.test.ts`.
- Provider-specific dashboard provider boundary: `apps/api/src/youtube/dashboard-deployment.test.ts`.
- Dashboard deployment plan generation: `apps/api/src/youtube/dashboard-deployment.test.ts`.
- Dashboard deployment dry-run: `apps/api/src/youtube/dashboard-deployment.test.ts`.
- Manual gate required for apply: `apps/api/src/youtube/dashboard-deployment.test.ts`.
- Dashboard provider credential missing fail-closed behavior: `apps/api/src/youtube/dashboard-deployment.test.ts`.
- Dashboard contract parity and panel metric declaration: `apps/api/src/youtube/dashboard-deployment.test.ts`.
- Dashboard alert label parity and alert routing provider stub: `apps/api/src/youtube/dashboard-deployment.test.ts`.
- Provider error operator action mapping and rollback plan: `apps/api/src/youtube/dashboard-deployment.test.ts`.

Still uncovered by automated tests: real provider SDK deployment apply, external alert delivery with real credentials, and live YouTube account operation.

## PR external-alert-delivery-integration

Latest local result after implementation: full-suite `corepack pnpm test` passes with 19 test files, 165 passed tests, and 6 skipped tests.

Risk coverage added:

- External alert provider mock boundary: `apps/api/src/youtube/alert-delivery.test.ts`.
- Provider-specific alert provider boundary: `apps/api/src/youtube/alert-delivery.test.ts`.
- Alert delivery plan generation: `apps/api/src/youtube/alert-delivery.test.ts`.
- Alert delivery dry-run: `apps/api/src/youtube/alert-delivery.test.ts`.
- Manual gate required for alert apply: `apps/api/src/youtube/alert-delivery.test.ts`.
- Alert provider credential missing fail-closed behavior: `apps/api/src/youtube/alert-delivery.test.ts`.
- Alert routing contract parity and declared metric payloads: `apps/api/src/youtube/alert-delivery.test.ts`.
- Alert payload excludes secrets and raw user data: `apps/api/src/youtube/alert-delivery.test.ts`.
- Provider error operator action mapping and rollback/disable plan: `apps/api/src/youtube/alert-delivery.test.ts`.

Edge cases and failure paths covered: missing credential secret names throw, apply without manual approval throws, unsafe label keys are removed from alert payloads, provider credential and rate-limit failures map to operator actions, and real provider delivery remains disabled without manual gate.

Still uncovered by automated tests: real provider SDK delivery apply, real external alert provider credentials, and live YouTube account operation.



## PR external-alert-delivery-integration hardening

Latest local result after payload value redaction: full-suite `corepack pnpm test` and `npm test` pass with 19 test files, 165 passed tests, and 6 skipped tests.

Added coverage:

- Safe label value redacts wallet addresses, token-like strings, Bearer credentials, credential keywords, and private URLs.
- Safe stream and environment labels are preserved.
- Rollback plan does not include credential secret names.


## PR manual-gate-registry

Added coverage for manual gate registry creation, approval, target commit validation, secret reference safety, expiry, single-use behavior, dashboard apply gate, external alert apply gate, manual live YouTube soak gate, and provider secret rotation gate. Final local counts: 20 test files, 178 passed tests, 6 skipped tests.
## Evidence Rendering Coverage

Evidence renderer tests cover PR doc generation, required quality-gate headings, stale head SHA rejection, stale test count rejection, stale quality-gate run rejection, placeholder rejection, test-summary parsing, risk register rendering, manual gate rendering, and quality-gate self-protection preparation.

## Quality-Gate Self-Protection Requiredization

Latest targeted evidence after adding required self-protection fixtures:
`corepack pnpm test apps/api/src/evidence-rendering.test.ts` passed with 21 test
files, 199 passed tests, and 6 skipped tests.

Added coverage:

- `evidence:ci` required path runs placeholder, freshness, and self-protection
  checks without mutating PR body content.
- Self-protection detects `continue-on-error: true` in the quality-gate
  workflow.
- Self-protection detects removed `Run Codex quality gate` evidence.
- Self-protection detects unsafe safe-artifact upload behavior.
- Self-protection detects always-pass wording in executable scripts.
- Freshness validation rejects unresolved head placeholders in CI mode.

## Safe CI Failure Artifacts

Safe CI failure artifact coverage adds tests for typecheck failure summaries,
test failure summaries, typecheck-pass/test-fail classification, raw field
rejection, same-head required checks pass/fail metadata,
quality-gate-pass/typescript-fail classification, and missing required check
rejection.

## PR #24 Safe CI Artifact Tests

- Added coverage for same-head required checks all-pass safe reason code.
- Added coverage that all-pass same-head metadata does not use `product_code_failure`.
- Added coverage for typecheck-failed test-not-run safe summary metadata.
- Added coverage that required CI safe artifact uploads use `if-no-files-found: error`.

## PR #25 v1.0.8 Rollout Tests

Latest local test evidence for the required/advisory split: 21 test files, 209 passed, and 6 skipped. Added coverage verifies that legacy self-test advisory status does not become `workflow_required_status_failure` for target rollout, while required target quality failure remains blocking. Existing same-head required-check tests still reject mixed-head, missing, and failed required checks.
