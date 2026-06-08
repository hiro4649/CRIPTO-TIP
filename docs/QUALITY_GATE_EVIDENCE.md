# Quality Gate Evidence

## PR github-run-artifact-auto-injection

This PR adds `scripts/fetch-github-run-evidence.mjs` as the evidence injection
boundary for active pull request head SHA, product CI run, quality-gate run, and
`codex-quality-gate-safe-artifacts` artifact ID.

Quality-gate relevant checks:

- `corepack pnpm lint`: pass locally before commit.
- `corepack pnpm typecheck`: pass locally before commit.
- `corepack pnpm test`: pass locally with 21 files, 196 passed, 6 skipped.
- `npm test`: pass locally with 21 files, 196 passed, 6 skipped.
- `node scripts/check-evidence-placeholders.mjs`: pass locally.
- `node scripts/check-quality-gate-self-protection.mjs`: pass locally.
- `node scripts/codex-secret-safety-scan.mjs`: pass locally.

The new fetcher stores only GitHub run IDs, artifact IDs, head/base SHA, and
safe status values. It does not fetch or persist secrets.

## PR production-chain-listener-reorg update

Latest local Chain Listener evidence:

- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: passed with 10 test files, 60 passed tests, and 6 skipped tests.
- New tests cover TipSent decode, duplicate log idempotency, `eth_getLogs` catch-up, WebSocket subscription boundary, confirmation window gating, reorg status transition, `support.normalize` enqueue only after confirmation, RPC error retry/backoff boundary, block cursor persistence, and no user personal text fields in decoded on-chain log payloads.

Quality-gate evidence is maintained for Harness v1.0.6. Current changed files are classified in `.codex/change-classification.json`, and GitHub Actions replay is required after each pushed head before merge.

Latest failed quality-gate runs inspected: `26859916066`, `26860961085`, `26861097867`, and `26861752050`.

Latest quality-gate artifact inspected: `7375148482`.

Latest product CI run inspected: `26860944234`.

Latest local test result: 9 test files, 45 tests.

Latest local root npm test result: 9 test files, 45 tests.

Latest clean npm reproduction result: `npm install --no-package-lock && npm test` passed with 9 test files and 45 tests.

Latest Node 20 reproduction result: `npx -y node@20 ./node_modules/vitest/vitest.mjs run packages/shared apps/api apps/overlay apps/web` passed with 9 test files and 45 tests after importing `ws` in the overlay rejection test.

PR #4 local test result after adding storage/queue recovery: `corepack pnpm test apps/api` passed with 9 test files, 49 passed tests, and 5 skipped live Postgres tests in the local environment. The skipped tests run in GitHub CI with `RUN_LIVE_POSTGRES_TESTS=true` and a Postgres service.

PR #4 live Postgres evidence added:

- `apps/api/src/repositories/postgres.test.ts` applies `migrations/0001_durable_events.sql` to a real Postgres database when `RUN_LIVE_POSTGRES_TESTS=true`.
- The live test verifies `tip_transactions`, `support_events`, `affinity_ledger`, and `outbox_events.idempotency_key` uniqueness.
- The live test verifies stale outbox lock reclaim and DLQ retry with audit log write.
- `.github/workflows/ci.yml` provides the Postgres service for the TypeScript job.

## Reason Code Matrix

| Reason code | Response | Evidence |
| --- | --- | --- |
| `secretScan` | No real secret is committed. `.env.example` contains safe local placeholders only. Production-like config rejects generated local mock defaults. | `.env.example`, `apps/api/src/config/env.ts`, `apps/api/src/config/env.test.ts`, security grep command. |
| `changeClassificationStatus` | Added complete file classification for PR #2 surfaces. | `docs/CHANGE_CLASSIFICATION.md`. |
| `productVerificationStatus` | Added explicit product behavior verification and unverified scope. | `docs/PRODUCT_VERIFICATION.md`. |
| `productVerificationEvidenceStatus` | Added command-backed evidence and risk-to-test mapping. | `docs/PRODUCT_VERIFICATION.md`, `docs/TEST_COVERAGE_EVIDENCE.md`. |
| `classificationCoverageStatus` | Classified docs, migration, workflow, package, env, tests, API, repository, and outbox files. | `docs/CHANGE_CLASSIFICATION.md`. |
| `remoteProductEvidenceExecutionStatus` | npm entry remains a real test entry and product CI passes through pnpm. Local `npm test` and Node 20 Vitest reproduction passed with 9 test files and 45 tests after the WebSocket test compatibility repair. If remote npm diagnostic still fails, inspect the latest safe artifact before changing code. | `package.json`, `apps/api/src/server.test.ts`, GitHub CI run `26860944234`. |
| `formalEvidencePrecedenceStatus` | Current-head evidence is documented by SHA, CI run, local commands, and PR body. | `docs/REVIEW_INDEPENDENCE.md`, `docs/pr-durable-events-db-queue.md`. |
| `remoteNpmDiagnosticNormalizationStatus` | npm diagnostic was failing with safe-summary-only because the raw npm log is not uploaded. Root npm entry is kept as real tests, not a bypass; local `npm test` and Node 20 Vitest reproduction passed with 9 test files and 45 tests after adding explicit `ws` test client handling. | `package.json`, `apps/api/src/server.test.ts`, `docs/QUALITY_GATE_EVIDENCE.md`. |
| `reviewIndependenceStatus` | Added evidence not based solely on Codex self-report. | `docs/REVIEW_INDEPENDENCE.md`. |
| `taskBriefCompilerStatus` | Added explicit task contract including goal, allowed scope, forbidden scope, and done criteria. | `docs/TASK_CONTRACT.md`. |
| `codeReviewMonitorStatus` | Added auth/API/runtime/storage/large-diff review monitor evidence. | `docs/CODE_REVIEW_MONITOR.md`, `docs/API_COMPATIBILITY_SUMMARY.md`, `docs/RISK_REGISTER.md`. |
| `contractGovernanceStatus` | Added contract governance evidence and pinned dependency statement. | `docs/CONTRACT_GOVERNANCE.md`, `.github/workflows/ci.yml`, `docs/DEPENDENCY_DECISIONS.md`. |
| `complexityGovernanceStatus` | Added complexity governance, solvability constraints, verification oracle, storage oracle, and split rationale. | `docs/COMPLEXITY_GOVERNANCE.md`. |
| `bestOfNEvidenceStatus` | Added current-head evidence docs and explicit residual risk tracking. | `docs/QUALITY_GATE_EVIDENCE.md`, `docs/RISK_REGISTER.md`. |
| `testCoverageEvidenceStatus` | Added exact test count and risk-to-test mapping. | `docs/TEST_COVERAGE_EVIDENCE.md`. |
| `targetQualityScoreStatus` | This evidence set addresses blocking documentation/evidence gaps without weakening checks. | This file and linked evidence docs. |
| `remoteProductBaselineStatus` | Manual confirmation required: baseline product CI is currently pass for TypeScript and contracts. | GitHub CI run `26860944234`. |
| `remoteNpmDiagnosticStatus` | Manual confirmation required: remote npm artifact was inspected; npm entry remains real tests and Node 20 compatibility was repaired. | quality-gate runs `26859916066`, `26860961085`, `26861097867`, `package.json`, `apps/api/src/server.test.ts`. |
| `v085StabilityStatus` | Manual confirmation required: PR profile is product durable MVP evidence repair, not production readiness. | `docs/PRODUCTION_GATES.md`, `docs/TASK_CONTRACT.md`. |

## Safe Placeholder Inventory

| Location | Placeholder type | Production behavior |
| --- | --- | --- |
| `.env.example` | local admin placeholder | Not a real secret; production must provide real value. |
| `.env.example` | local internal placeholder | Not a real secret; production must provide real value. |
| `.env.example` | local overlay placeholder | Not a real secret; production must provide stream-scoped hashed token storage and rotation. |

## Server Repository Internals Check

Command:

`rg -n "repository\\.(recentTipsByWallet|affinityByUser|supportEvents|tipIntents|outboxEvents|deadLetterEvents|auditLogs)" apps/api/src/server.ts`

Expected result: no match.

## Package Verification

- `corepack pnpm install`: passed locally.
- `corepack pnpm lint`: passed locally.
- `corepack pnpm typecheck`: passed locally.
- `corepack pnpm test`: passed locally with 9 test files and 45 tests.
- `npm test`: passed locally with 9 test files and 45 tests.
- Node 20 Vitest reproduction: passed locally with 9 test files and 45 tests.
- Quality-gate remote npm diagnostic failure root cause found locally: Node 20 lacks the newer global `WebSocket` used by the overlay token rejection test. The test now imports `ws` and handles rejected connection errors.

## Machine-Readable Evidence

- `.codex/change-classification.json`: classifies every PR #2 changed file, including `.codex/**`, `docs/**`, `.env.example`, migration, package, lockfile, and test config.
- `.codex/task-contract.json`: records `product_minor_r2`, `productCodeChanged: true`, `runtimeReadinessClaimed: false`, allowed scope, forbidden scope, done criteria, verification surface, storage oracle, release gate oracle, and split plan.
- `.codex/product-verification.json`: records pass/not_started product verification states.
- `.codex/test-coverage-evidence.json`: records 9 test files and 45 tests with risk coverage.
- `.codex/review-independence.json`: records reviewer role, review checklist, and human review required fields.
- `.codex/quality-gate-evidence.json`: maps reason codes to evidence files and safe placeholder inventory.
- `.codex/evidence-pack.normalized.json`: provides current-head safe evidence pack metadata for the quality-gate parser.

## PR iris-core-delivery-adapter Evidence

Current-head evidence to update in PR body:

- Product code changed: yes.
- Runtime readiness claim: no.
- Test command: `corepack pnpm test` passed with 11 test files, 68 passed tests, and 6 skipped tests.
- Terminal auth evidence: `apps/api/src/iris/delivery-worker.test.ts` verifies 401 and 403 move immediately to DLQ independent of `max_retry_count`.
- Retry evidence: `apps/api/src/iris/delivery-worker.test.ts` verifies timeout and 503 remain retryable and do not immediately DLQ when `max_retry_count` is 5.
- Worker evidence: `apps/api/src/outbox/worker.test.ts` verifies `TerminalOutboxError` moves to DLQ without completing or retrying the job.
- Security scan: secret/risky rendering grep and prohibited wording scan.
- Quality-gate expected status: rerun on the PR current head after push.

Machine-readable evidence should classify `apps/api/src/iris/**`, docs, `.env.example`, package metadata, and any test files. The adapter sends sanitized delivery DTOs only and does not commit production IRIS Core secrets.

## PR official-youtube-connector Evidence

- Product code changed: yes.
- Runtime readiness claim: no.
- Test command: `corepack pnpm test` passed with 13 test files, 79 passed tests, and 6 skipped tests.
- Connector evidence: `apps/api/src/youtube/connector.test.ts` verifies streamList, list fallback, Super Chat, Super Sticker, regular chat, 403 quota/rate-limit retry reasons, 429/5xx retry, non-retry auth/forbidden/page token cases, malformed error body safety, and no HTML/scraping endpoint use.
- Verification evidence: `apps/api/src/youtube/verification.test.ts` verifies `IRIS-XXXXXX` detection, 10-minute expiry, one-time use, and stream scoping.
- Shared schema evidence: `packages/shared/src/index.test.ts` verifies Super Sticker normalization and regular chat sanitization.

## PR youtube-ops-hardening Evidence

- Product code changed: yes.
- Runtime readiness claim: no.
- Targeted test command: `corepack pnpm test apps/api/src/youtube apps/api/src/config/env.test.ts` passed with 14 test files, 100 passed tests, and 6 skipped tests.
- Config evidence: `apps/api/src/config/env.test.ts` verifies production official YouTube connector mode rejects `local_env` and accepts managed `secret_manager` or `provider_specific` sources with a secret name.
- Deployment observability evidence: `apps/api/src/youtube/deployment-observability.test.ts` verifies metric snapshot, dashboard contract, alert routing, and manual live soak default skip behavior.
- Operations evidence: `apps/api/src/youtube/operations.test.ts` verifies metrics names, liveChatId acquisition boundary, quota/rate-limit classification, non-retry operator actions, reconnect bounds, fallback bounds, polling interval respect, and deterministic mock soak.
- Safe boundary evidence: `.env.example` contains placeholders only; no real YouTube API key or OAuth token is committed.
- Quality-gate status for PR #10: pass on run 26928828159.

## PR youtube-prod-observability Evidence

- Task mode: product_minor_r2 feature.
- Runtime readiness claim: no.
- Product code changed: yes, limited to YouTube credential provider and observability boundaries.
- Evidence files: `.codex/change-classification.json`, `.codex/task-contract.json`, `.codex/product-verification.json`, `.codex/test-coverage-evidence.json`.
- Secret safety: `.env.example` contains secret names and blank credential values only; no real YouTube API key or OAuth token is committed.
- Product verification: credential provider boundary, production local-env rejection, metrics mapping, manual live soak skip gate, and no-scraping scan.
- Complexity evidence: `.codex/task-contract.json` records verification surface, auth oracle, API compatibility summary, split reason, and reasoning evidence for the high-complexity credential/observability surface.
- Review independence evidence: `.codex/review-independence.json` and `docs/pr-youtube-prod-observability.md` record writer evidence, review evidence, review checklist, review scope, and known gaps.

## PR observability-exporter-integration Evidence

- Task mode: product_minor_r2 feature.
- Runtime readiness claim: no.
- Product code changed: yes, limited to YouTube observability exporter boundary and tests.
- Local targeted evidence before full-suite replay: `corepack pnpm test apps/api/src/youtube/observability-exporter.test.ts` passed as part of the workspace command with 17 test files, 140 passed tests, and 6 skipped tests.
- Exporter evidence: `apps/api/src/youtube/observability-exporter.test.ts` verifies mock publishing, Prometheus-compatible output, OpenTelemetry-compatible output, dashboard parity, alert label parity, and manual live soak safe-summary gate.
- Secret safety: no real dashboard provider key, YouTube API key, OAuth token, or Secret Manager payload is committed.
- Quality-gate expected status: GitHub Actions must pass on the pushed PR head before merge.

## PR external-alert-delivery-integration Evidence

- Task mode: product_minor_r2 feature.
- Runtime readiness claim: no.
- Product code changed: yes, limited to external alert delivery provider boundary and tests.
- Alert delivery evidence: `apps/api/src/youtube/alert-delivery.test.ts` verifies mock provider, provider-specific wrapper, plan generation, dry-run, manual apply gate, credential missing fail-closed behavior, alert routing parity, safe payload labels, provider error mapping, and rollback/disable plan.
- Secret safety: no real alert provider key, webhook URL, dashboard provider key, YouTube API key, OAuth token, or Secret Manager payload is committed.
- Quality-gate expected status: GitHub Actions must pass on the pushed PR head before merge.

## PR dashboard-exporter-deployment Evidence

- Task mode: product_minor_r2 feature.
- Runtime readiness claim: no.
- Product code changed: yes, limited to dashboard provider deployment boundary and tests.
- Local targeted evidence before full-suite replay: `corepack pnpm test apps/api/src/youtube/dashboard-deployment.test.ts` passed as part of the workspace command with 18 test files, 151 passed tests, and 6 skipped tests.
- Deployment evidence: `apps/api/src/youtube/dashboard-deployment.test.ts` verifies mock provider, provider-specific wrapper, deployment plan generation, dry-run, manual apply gate, credential missing fail-closed behavior, dashboard contract parity, alert stub, provider error mapping, and rollback plan.
- Secret safety: no real dashboard provider key, alert provider key, YouTube API key, OAuth token, or Secret Manager payload is committed.
- Quality-gate expected status: GitHub Actions must pass on the pushed PR head before merge.

## PR manual-gate-registry Evidence

Manual gate registry evidence: `.codex/manual-gates/schema.json`, `apps/api/src/manual-gates.ts`, and `apps/api/src/manual-gates.test.ts` define gate types, required fields, secret-reference safety, target commit binding, target environment binding, expiry, and single-use behavior. Dashboard apply, external alert apply, live YouTube soak, and provider secret rotation have production-like gate tests.

## Production-Like Apply Enforcement Update

Production-like apply is not authorized by `manualApproval: true` alone. Dashboard apply, external alert apply, and provider-specific deployment apply require both an approved manual gate record and the `ManualGateRegistry` containing that record before provider apply starts. Successful apply marks the gate `used`; failed provider apply and dry-run do not mark it used. Used, expired, wrong-type, wrong-target-commit, or wrong-target-environment gates cannot authorize apply. Manual gate records store secret references only and are not secret storage.
## Evidence Single Source Of Truth

This PR adds `.codex/evidence-pack.json` as the safe summary source for generated PR evidence, plus placeholder and freshness validators. It does not weaken quality-gate behavior; it makes stale evidence easier to reject before merge.

## Quality-Gate Self-Protection Requiredization

This PR makes quality-gate self-protection and evidence placeholder/freshness
checks part of the CI verification path through `evidence:ci`. The check is
non-mutating in CI: it does not edit PR bodies, fetch live secrets, or perform
provider apply. It verifies the quality-gate workflow still runs the gate, writes
the safe summary, uploads `codex-quality-gate-safe-artifacts`, rejects
`continue-on-error: true`, and fails if safe artifacts are absent.

Provider-safe deployment evidence remains manual-gated. Dashboard apply,
external alert apply, live YouTube soak, provider secret rotation, and
provider-specific deployment apply must keep approved manual gate evidence and
must not store secret values, private URLs, wallet addresses, raw messages, raw
display names, API keys, OAuth tokens, or webhook URLs.

## Safe CI Failure Artifact Hardening

CRIPTO-TIP remains on active harness v1.0.7. PR #23 is closed without merge and
is not reused as evidence. This hardening adds raw-log-free CI safe summaries for
pnpm typecheck, pnpm test, same-head required checks metadata, and safe failure
classification.

Quality-gate pass alone is not merge readiness. `quality-gate`, `typescript`,
and `contracts` must all pass on the same head SHA. Failed CI without a safe
artifact is classified as `safe_artifact_missing_for_failed_ci`. Metadata-limited
failures use `metadata_limited_external_blocked` without reading raw logs.

## PR #24 Safe CI Artifact Hardening

- `same_head_required_checks_all_pass` is the safe reason code for all required checks passing on the same head; `product_code_failure` is not used for this success state.
- Safe CI artifact uploads for pnpm typecheck, pnpm test, CI failure metadata, and required checks metadata use fail-closed missing-file handling.
- Quality-gate pass alone is not merge readiness; same-head `quality-gate`, `typescript`, and `contracts` pass is required.
- PR #23 remains closed without merge and is not reused as evidence. CRIPTO-TIP remains active harness v1.0.7.

## PR #25 v1.0.8 Required/Advisory Separation

PR #25 keeps CRIPTO-TIP active harness at v1.0.7 until the fresh v1.0.8 rollout passes same-head required checks, target gate, safe artifact availability, and quality-gate. Required statuses remain blocking: typescript, contracts, quality-gate, target-gate, same-head required checks, safe artifact availability, evidence freshness, placeholder check, and self-protection. Legacy self-test and version-lineage findings are advisory safe-summary evidence and do not emit `workflow_required_status_failure` unless they prove wrong source, wrong target, stale current-head evidence, or another required-status failure. Raw logs were not read.
## Safe pnpm Test Failure Repair PR

- PR #28 is closed without merge and is not reused as merge evidence.
- CRIPTO-TIP is not treated as v1.1.0 complete from PR #28.
- Repair source is safe artifact metadata only.
- GitHub raw logs were not read.
- Safe reason code: `pnpm_typecheck_passed_but_test_failed`.
- Safe classification: `pnpm_typecheck_result=success`, `pnpm_test_result=failure`, `product_code_failure=true`, `raw_log_allowed=false`.
- Local reproduction found one `pnpm test` timeout in `apps/api/src/evidence-rendering.test.ts`.
- Repair keeps quality-gate self-protection execution and assertion intact; only the affected test timeout budget is adjusted to 180 seconds for full-suite I/O contention.

## Full Repository Audit v1.1.3

- PR #29 was merged and is the current main baseline for this audit.
- PR #28 remains closed without merge and is not reused for merge readiness.
- PR #26 and PR #22 were closed without merge after PR #33 audit merge and are not reused as merge-readiness evidence.
- Critical findings: 0 unresolved.
- High findings: 0 unresolved.
- Medium/Low findings are documented in `docs/AUDIT_REPORT_FULL_REPO_V113.md` and `docs/RISK_REGISTER.md`.
- No product runtime, workflow, script, provider apply, manual gate behavior, wallet/RPC/deploy, YouTube connector, or Chain Listener change is made by this audit PR.
- New PR required checks must pass before merge.

## Provider-Safe Deployment Apply v1.1.3

Provider-safe deployment evidence adds `apps/api/src/provider-deployment.ts` and `apps/api/src/provider-deployment.test.ts`. Production-like provider apply requires an approved manual gate record and the `ManualGateRegistry` before provider apply starts. `manualApproval: true` alone is not sufficient. Dry-run does not mark a gate `used`; successful production-like apply marks the approved gate `used`; failed provider apply does not. Safe summaries exclude secret values, private URLs, wallet addresses, raw messages, raw display names, OAuth tokens, API keys, and webhook URLs.

Wrapper hardening evidence adds dashboard and external alert result projection tests. Provider raw results are not returned directly; extra fields are stripped and invalid count values are rejected. Provider deployment evidence also verifies that a `markUsed` failure after provider apply rejects the operation instead of returning success.
