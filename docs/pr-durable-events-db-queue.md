# Summary

Adds the durable event storage and queue boundary needed before production chain listener, official YouTube connector, and IRIS Core delivery work.

Follow-up fix completes the server-side repository boundary so `buildServer(repo)` no longer reads `InMemoryRepository` internals.

# Goal

Make PR #2 reviewable as a durable idempotency, repository, outbox, and DLQ boundary without adding production chain listener, production YouTube connector, production IRIS delivery, token sale, token exchange, cash-out, custody, internal balance, investment wording, or speculative reward behavior.

## Task Contract

Task mode:
product_minor_r2

Goal:
Add durable event storage, repository boundary, outbox/DLQ boundary, config validation, and quality evidence for CRIPTO-TIP PR #2.

Allowed scope:
migrations
repository boundary
api internal flow
outbox/DLQ boundary
config validation
test evidence
quality evidence docs
CI contract dependency pinning

Forbidden scope:
production chain listener
official YouTube connector
production IRIS delivery
token sale
token exchange
cash-out
custody
internal balance
investment wording
speculative reward
YouTube scraping

Runtime readiness claim:
no

Product code changed:
yes

Done criteria:
typescript CI pass
contracts CI pass
quality-gate pass
server.ts no direct InMemory internals
public DTO safety preserved
moderation gates preserved
idempotency preserved
evidence docs updated
PR body test count matches actual test output

## Evidence Integrity

Base SHA:
287d9540d59a0bea52f94964890f5d400ac3280c

Head SHA:
current PR head

Quality-gate artifact:
7374500499 or latest rerun artifact

CI runs:
typescript/contracts run `26859906074`
quality-gate run `26859916066`

Stale evidence:
current head only

## Testing and review

- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- contracts CI
- quality-gate
- repository internals scan
- secret/risky rendering scan
- prohibited wording scan

Latest test files count:
9

Latest test count:
45

# Scope

- Adds `migrations/0001_durable_events.sql`.
- Adds repository interface, `InMemoryRepository`, and `PostgresRepository` boundary.
- Adds DB-backed outbox/DLQ types and worker boundary.
- Adds config validation for production rejection of default mock tokens.
- Updates API event flow to use repository/outbox methods.
- Adds migration, repository, outbox, config, and existing API safety tests.
- Adds server tests that inject `new InMemoryRepository()` explicitly.
- Adds PostgresRepository tests for server-path methods, public DTO safety, default affinity, and parameterized SQL.
- Adds quality-gate evidence docs for classification, product verification, test coverage, review independence, task contract, complexity governance, contract governance, API compatibility, and risk tracking.
- Adds Node 20-compatible WebSocket negative auth test handling for the quality-gate remote npm path without skipping or weakening the test.

# Security boundaries

YouTube LIVE remains the broadcast and chat surface. IRIS Web Companion remains the external Tip surface. YouTube Super Chat payment is not replaced.

CRIPTO-TIP does not implement token sale, swap, exchange, cash-out, custody, internal crypto balances, lottery, NFT prize, ranking reward, token price chart, or investment language.

# DB schema decisions

The migration separates raw and sanitized fields, stores bytes32-compatible `message_hash` and `client_tip_id`, keeps chain idempotency via `chain_id + contract_address + tx_hash + log_index`, and stores overlay token hashes rather than raw production tokens.

# Outbox/DLQ design

The outbox is DB-backed by design and at-least-once. Jobs use unique `idempotency_key`, lock fields, retry counters, next-attempt scheduling, and DLQ movement after max retries. Consumers must be idempotent.

# Repository boundary

API code now depends on `CriptoTipRepository`. Tests use `InMemoryRepository`. `PostgresRepository` defines the SQL boundary without requiring a live database in CI.

The server path now uses repository methods for recent tip counts, current affinity, stream support event listing, and durable event side effects. The global default repository export remains only as the default injected implementation.

# Product verification

The product verification scope is the API/repository/outbox boundary and docs. Verification checks that duplicate events stay idempotent, public TipIntent DTOs do not expose raw viewer or wallet fields, moderation gates prevent unsafe side effects, Postgres SQL uses placeholders, and the overlay remains token-gated and text-only. No production YouTube API, RPC, or IRIS Core endpoint is connected in this PR.

See `docs/PRODUCT_VERIFICATION.md`.

# Quality gate failure response

This PR now includes explicit evidence for the previously failing quality-gate categories:

- Change classification: `docs/CHANGE_CLASSIFICATION.md`
- Product verification: `docs/PRODUCT_VERIFICATION.md`
- Test coverage evidence: `docs/TEST_COVERAGE_EVIDENCE.md`
- Review independence: `docs/REVIEW_INDEPENDENCE.md`
- Task contract: `docs/TASK_CONTRACT.md`
- Code review monitor: `docs/CODE_REVIEW_MONITOR.md`
- Contract governance: `docs/CONTRACT_GOVERNANCE.md`
- Complexity governance: `docs/COMPLEXITY_GOVERNANCE.md`
- API compatibility summary: `docs/API_COMPATIBILITY_SUMMARY.md`
- Risk register: `docs/RISK_REGISTER.md`
- AC matrix: `docs/AC_MATRIX.md`
- Production gate: `docs/PRODUCTION_GATES.md`
- Quality gate reason matrix: `docs/QUALITY_GATE_EVIDENCE.md`

# Change Classification

All changed files are classified in `docs/CHANGE_CLASSIFICATION.md`, including DB schema, repository boundary, API internal flow, outbox/DLQ boundary, config validation, docs, tests, CI contract dependency pinning, env example, migration, and package manager compatibility.

# Review Scope

Review scope is limited to durable event storage, repository boundaries, outbox/DLQ worker boundary, config validation, test compatibility, and quality evidence. Production Chain Listener, official YouTube connector, production IRIS Core delivery, live Postgres integration, stale lock reclamation, admin DLQ retry endpoint, and production overlay token rotation are intentionally excluded and tracked as follow-up risks.

# Risk Summary

High risks remaining: production Chain Listener is not implemented, live PostgreSQL integration tests are not implemented, stale lock reclamation is not implemented, and admin DLQ retry endpoint is not implemented.

Medium risks remaining: official YouTube connector is not implemented, IRIS Core delivery adapter is not implemented, stream-scoped hashed overlay token rotation is not implemented, and migration status columns still need enum check constraints.

Low risk remaining: local Foundry is unavailable; GitHub contracts CI covers contract verification.

# Test Coverage Evidence

Latest local `corepack pnpm test` result: 9 test files passed and 45 tests passed.

Latest local `npm test` result for quality-gate remote npm diagnostic compatibility: 9 test files passed and 45 tests passed.

Latest local Node 20 Vitest reproduction for quality-gate compatibility: 9 test files passed and 45 tests passed.

# Package Verification

Root `npm test` remains a real product test entry. It runs the same Vitest suite as the pnpm path and is not a bypass. Node 20 compatibility was repaired by importing the test-only `ws` client in the overlay invalid-token negative test and handling rejected connection `error` events.

# Review Independence Evidence

`docs/REVIEW_INDEPENDENCE.md` records GitHub PR state, head SHA, CI run IDs, latest inspected quality-gate run, manual verification commands, code-level evidence files, known gaps, and human review fields. This avoids relying only on Codex self-report.

# API Compatibility Summary

`docs/API_COMPATIBILITY_SUMMARY.md` records that public TipIntent DTO remains safe, internal support-event flow now uses repository boundary, admin list uses `listSupportEventsByStream`, mock MVP APIs remain compatible, and no breaking changes are intended.

# Code Review Monitor Evidence

`docs/CODE_REVIEW_MONITOR.md` records auth surface evidence, negative auth tests, API compatibility evidence, runtime non-readiness statement, storage surface tests, and large-diff review scope.

# Complexity And Contract Governance

`docs/COMPLEXITY_GOVERNANCE.md` records solvability constraints, storage oracle, verification oracle, and why chain listener and YouTube connector are split out. `docs/CONTRACT_GOVERNANCE.md` records that PR #2 does not add contract functionality and that GitHub contracts CI passed with pinned dependencies.

# Commands run

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `npx -y node@20 ./node_modules/vitest/vitest.mjs run packages/shared apps/api apps/overlay apps/web`
- `cd contracts && forge test || true`
- secret/risky rendering grep, excluding lockfile and `.env.example`
- `rg -n "price increase|profit|yield|cash-out|cashout|swap|exchange|internal balance|lottery|NFT prize|token price" apps packages contracts docs README.md COMPLIANCE.md SECURITY.md AGENTS.md -g '!node_modules' || true`
- `gitleaks detect --source . --no-git || true`
- `semgrep scan --config auto || true`
- `slither contracts/src/TipRouterV1.sol || true`

# Tests or checks run

Local pnpm install, lint, typecheck, and unit tests passed on current head. Local Foundry execution was attempted but `forge` is not installed in this Windows environment; GitHub Actions runs the pinned Foundry contract job.

# Test results

- `corepack pnpm lint`: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm test`: passed, 9 test files and 45 tests.
- `npm test`: passed, 9 test files and 45 tests.
- Node 20 Vitest reproduction: passed, 9 test files and 45 tests.
- `forge test`: not run locally because `forge` is not installed in this environment.
- GitHub CI `typescript`: passed in runs `26835142098` and `26858338314`.
- GitHub CI `contracts`: passed in runs `26835142098` and `26858338314`.
- Latest inspected failed quality-gate before this evidence patch: runs `26835148559` and `26858353061`.

# Audit results

See `docs/AUDIT_REPORT_DB_QUEUE.md`.

# Known gaps

- Full Postgres repository implementation is not yet wired to a real pool.
- Production chain listener is still a follow-up.
- Official YouTube connector is still a follow-up.
- IRIS Core delivery remains a mock/outbox boundary.
- Stale lock reclamation and admin DLQ retry endpoint are not implemented yet.
- Migration status text columns still need enum check constraints in a follow-up migration.
- Quality-gate must be rerun on the new evidence commit.

# Residual risks

Postgres behavior is covered by SQL-boundary tests but not live integration tests. The outbox worker has retry/DLQ boundaries but no stale-lock reclaim job or admin DLQ retry endpoint yet. Production stream-scoped hashed overlay token storage and rotation remain follow-up work.

See `docs/RISK_REGISTER.md`.

# Follow-up issues

- Implement full PostgreSQL repository and integration tests.
- Add stale-lock reclamation and admin DLQ retry endpoint.
- Implement production chain listener with confirmation window and reorg handling.

# Commit SHA

See current PR head SHA in GitHub checks and final report.
