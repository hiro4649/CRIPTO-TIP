# Summary

Harden the Postgres transaction adapter contract for v1.1.6 preparation with typed row parsers, SQL parameter builders, query result guards, and migration-to-adapter mapping, without real DB connection, DB driver, package changes, real provider SDK apply, or production deployment.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Harden the Postgres transaction adapter contract for v1.1.6 preparation with typed row parsers, SQL parameter builders, query result guards, and migration-to-adapter mapping, without real DB connection, DB driver, package changes, real provider SDK apply, or production deployment.

Allowed scope: postgres_adapter_contract_hardening, typed_row_parsers, sql_parameter_builders, query_result_guards, migration_to_adapter_mapping, owner_approval_checklist, tests, docs, .codex evidence.

Forbidden scope: real DB connection, DB driver dependency, package.json change, pnpm-lock change, migration change, real provider SDK apply, actual production deployment apply, secret manager real SDK integration, live YouTube operation, wallet/RPC/deploy changes, YouTube connector changes, Chain Listener changes, durable events runtime changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, raw GitHub log reading, quality-gate weakening.

Runtime readiness claim: no.

Product code changed: yes.

Risk level: R3 product contract hardening. The changed surface is internal
storage adapter contract code, typed row parsing, SQL parameter construction,
query result guarding, tests, docs, and evidence only.

Affected entrypoints: offline Postgres provider apply transaction adapter
skeleton, parser helpers, parameter helper functions, query result guards, and
repository tests. No public HTTP route, runtime worker, migration, package,
workflow, script, live DB connection, DB driver, or provider SDK entrypoint is
changed.

Failure paths considered: unsafe or unknown DB row shape, invalid manual gate
row, invalid provider job row, wrong applied/compensation state flags, unsafe
SQL parameter value, missing row, multiple rows, write rowCount zero, write
rowCount greater than one, provider success followed by durable DB failure, and
false production-readiness claims.

Human confirmation needed: owner approval is required before any real DB
driver, live DB integration test environment, migration execution against a
real DB, real provider SDK apply, or production-like deployment.

Done criteria: typed manual gate row parser rejects unknown or unsafe row shape; typed provider job row parser rejects unknown or unsafe row shape; provider job applied invariants are validated before adapter business logic; provider job compensation invariants are validated before adapter business logic; SQL parameter builders fix placeholder order and reject unsafe values; query result guards fail closed on rowCount 0 and rowCount greater than 1; adapter no longer relies on rows[0] type casts; adapter uses typed row parsers, SQL parameter builders, and result guards; migration 0004 to adapter mapping docs are present; owner approval checklist is present before any real DB driver work; no real DB connection is introduced; no DB driver dependency is added; no package.json or pnpm-lock change is introduced; no migration change is introduced; no real provider SDK apply is introduced; no runtime or production readiness claim is introduced.

## Evidence Integrity

Head SHA: 6fc1233c4c4120a9d1c021492dbafed71025e94b

Base SHA: e059a7525f735a827c095bbc66a5e534bb1153d6

Product CI: success

Quality-gate: current_head_quality_gate_replay_required

CI run: 27218289313

Quality-gate run: current_head_quality_gate_replay_required

Quality-gate artifact: current_head_quality_gate_replay_required

Tests: 34 test files, 467 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-postgres-adapter-contract-hardening-v116-prep.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm install: pass
- corepack pnpm lint: pass
- corepack pnpm typecheck: pass
- corepack pnpm test: pass: 34 files, 467 passed, 6 skipped
- npm test: pass: 34 files, 467 passed, 6 skipped
- corepack pnpm evidence:ci: pass
- corepack pnpm quality:self-protection: pass
- node scripts/write-test-summary.mjs: pass: 34 files, 467 passed, 6 skipped
- node scripts/check-evidence-placeholders.mjs: pass
- node scripts/validate-evidence-freshness.mjs: pass
- node scripts/check-quality-gate-self-protection.mjs: pass
- node scripts/codex-secret-safety-scan.mjs: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds internal parser, parameter-builder, and query-result guard contracts for the Postgres adapter skeleton without DB driver, real DB connection, provider SDK, external API, contract ABI, YouTube connector, Chain Listener, or IRIS delivery changes.

Runtime smoke rationale:

- No runtime readiness is claimed; this PR hardens offline adapter contracts only.

Review scope and verification:

- Scope: Postgres adapter typed row parsers, SQL parameter builders, query result guards, adapter wiring, migration-to-adapter docs, owner approval checklist, tests, and evidence.
- Risk summary: Main risk is accidentally implying real DB readiness or trusting unknown DB row shapes before a real adapter exists.
- Verification oracle: Vitest coverage, typecheck, evidence CI, quality self-protection, secret scan, no-scraping scan, no DB driver import scan, and GitHub checks.

## Test Coverage Evidence

Current recorded test summary: 34 files, 467 passed, 6 skipped.

Changed area: `apps/api/src/repositories/postgres-provider-apply-row-parsers.ts`,
`apps/api/src/repositories/postgres-provider-apply-params.ts`,
`apps/api/src/repositories/postgres-query-result-guards.ts`,
`apps/api/src/repositories/postgres-provider-apply-transaction-adapter.ts`,
their tests, and the Postgres adapter contract docs/evidence.

Test command: `corepack pnpm test` and `npm test`.

What the test covers: manual gate row parser required fields and unsafe value
rejection; provider job row parser status, operation, reference, and invariant
validation; SQL placeholder order and unsafe parameter rejection; rowCount
guards for reads and writes; adapter rollback on parser failure; adapter
fail-closed behavior on unsafe parsed rows; no pg/postgres import in the
adapter contract files; and existing provider apply transaction skeleton
regression behavior.

Edge cases: rowCount zero, rowCount greater than one, missing row object,
unknown operation/status, invalid 40-character SHA, private URL, wallet address,
raw provider response fields, non-boolean state flags, applied state without
manual gate used success, compensation state without failed status, unsafe
transaction ID, unsafe safe summary, and provider success followed by durable
write failure.

## Security Boundaries

- No real DB connection is implemented.
- No DB driver dependency is added.
- No package.json or pnpm-lock change is introduced.
- No migration change is introduced.
- No real provider SDK apply is implemented.
- No actual production deployment apply is implemented.
- Provider apply remains outside the DB transaction.
- Typed parsers reject unsafe row values and forbidden raw payload fields.
- SQL parameter builders reject unsafe ids, references, and summaries.
- GITHUB_LOG_POLICY_SAFE_SUMMARY_ONLY
- YouTube scraping remains forbidden.

## Residual risks

- Real Postgres adapter implementation remains future work.
- Real DB driver selection remains future work and requires owner approval.
- Live DB integration tests remain future work.
- Migration application remains future work.
- Provider apply executor remains future work.
- Operator compensation execution remains future work.
- Production deployment remains out of scope.

## Human Confirmation

- Human owner confirmation is required before production-like apply.
- AI review recommendations are not recorded as human approval.
- No runtime, production, legal, or YouTube policy readiness is claimed.
