# Quality Gate Evidence

## PR production-chain-listener-reorg update

Latest local Chain Listener evidence:

- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: passed with 10 test files, 60 passed tests, and 6 skipped tests.
- New tests cover TipSent decode, duplicate log idempotency, `eth_getLogs` catch-up, WebSocket subscription boundary, confirmation window gating, reorg status transition, `support.normalize` enqueue only after confirmation, RPC error retry/backoff boundary, block cursor persistence, and no user personal text fields in decoded on-chain log payloads.

Quality-gate status for the new PR is pending until the branch is pushed and GitHub Actions run. Evidence files are updated for Harness v1.0.4 ingestion and current changed files are classified in `.codex/change-classification.json`.

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
- Quality-gate expected status: pending until GitHub run completes.

Machine-readable evidence should classify `apps/api/src/iris/**`, docs, `.env.example`, package metadata, and any test files. The adapter sends sanitized delivery DTOs only and does not commit production IRIS Core secrets.
