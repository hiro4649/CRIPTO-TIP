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

Done criteria: typed manual gate row parser rejects unknown or unsafe row shape; typed provider job row parser rejects unknown or unsafe row shape; provider job applied invariants are validated before adapter business logic; provider job compensation invariants are validated before adapter business logic; SQL parameter builders fix placeholder order and reject unsafe values; query result guards fail closed on rowCount 0 and rowCount greater than 1; adapter no longer relies on rows[0] type casts; adapter uses typed row parsers, SQL parameter builders, and result guards; migration 0004 to adapter mapping docs are present; owner approval checklist is present before any real DB driver work; no real DB connection is introduced; no DB driver dependency is added; no package.json or pnpm-lock change is introduced; no migration change is introduced; no real provider SDK apply is introduced; no runtime or production readiness claim is introduced; manual gate row parser enforces exact selected columns before unsafe data can enter adapter logic; provider job row parser enforces exact selected columns before unsafe data can enter adapter logic; manual gate status is limited to the persistent status vocabulary; manual gate and provider job timestamps must be ISO UTC timestamps with Z suffix; provider apply audit insert action is limited to provider_apply_transaction.* audit vocabulary; rowCount greater than one failures preserve metadata-limited phase context; adapter parser failures return safe operator actions without row contents or raw DB diagnostics.

## Evidence Integrity

Head SHA: 3def110e0ac0b5d94ed8776c034f09ff236b6776

Base SHA: e059a7525f735a827c095bbc66a5e534bb1153d6

Product CI: success

Quality-gate: success

CI run: 27219092574

Quality-gate run: 27219466844

Quality-gate artifact: 7513388618

Tests: 34 test files, 489 passed, 6 skipped

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
- corepack pnpm test: pass: 34 files, 489 passed, 6 skipped
- npm test: pass: 34 files, 489 passed, 6 skipped
- corepack pnpm evidence:ci: pass
- corepack pnpm quality:self-protection: pass
- node scripts/write-test-summary.mjs: pass: 34 files, 489 passed, 6 skipped
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

Current recorded test summary: 34 files, 489 passed, 6 skipped.

Changed area: `apps/api/src/repositories/postgres-provider-apply-row-parsers.ts`,
`apps/api/src/repositories/postgres-provider-apply-params.ts`,
`apps/api/src/repositories/postgres-query-result-guards.ts`,
`apps/api/src/repositories/postgres-provider-apply-transaction-adapter.ts`,
their tests, and the Postgres adapter contract docs/evidence.

Test command: `corepack pnpm test` and `npm test`.

What the test covers: exact manual gate row selected-column contract, exact
provider job row selected-column contract, manual gate persistent status
vocabulary, ISO UTC timestamp strictness, forbidden raw provider/display/YouTube
fields, provider_apply_transaction audit action allowlist, SQL placeholder
order and unsafe parameter rejection, rowCount zero and rowCount greater than
one guards, metadata-limited phase labels, rollback on typed parser failure,
safe parser-failure operator action, and existing provider apply transaction
skeleton regression behavior.

Edge cases: unexpected extra row key, raw_provider_response, provider_response,
display_name, youtube_author_id, unknown manual gate status, non-ISO date,
date without Z, invalid used_at, unknown audit action, safe-looking but unknown
audit action, rowCount greater than one, unsafe transaction ID, unsafe safe
summary, provider success followed by durable write failure, and parser failure
without row contents in operator action.

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

## Review Independence

- Writer evidence is limited to current-head local verification, tests, docs,
  and machine-readable .codex evidence.
- AI review recommendation is not human approval.
- Human owner confirmation is required before any real DB integration, DB
  driver dependency, live DB test environment, real provider SDK apply, or
  production-like deployment.

## Best of N Evidence

Candidate count: 3.

Selected candidate: B.

Candidate A: Add a real `pg` dependency and live DB adapter now.

Candidate B: Add exact typed row parsers, SQL parameter builders, query result
guards, mapping docs, and no real DB connection.

Candidate C: Only update docs.

Reason selected: Candidate B hardens the v1.1.6 adapter contract while
preserving the no-driver, no-real-DB, no-provider-SDK, no-production-apply
boundary.

Rejected alternatives: Candidate A was rejected because it would add real DB
driver and live DB scope before owner approval; Candidate C was rejected because
docs-only evidence would not harden exact parser, SQL parameter, rowCount, or
safe parser-failure paths.
