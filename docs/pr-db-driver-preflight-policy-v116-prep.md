# Summary

Prepare DB driver dependency preflight policy for v1.1.6 before any real DB driver, package.json change, pnpm-lock change, real DB connection, live DB integration test, migration execution, provider SDK apply, or production deployment.

PR profile: product_r3
Task mode: feature

## Goal

Prepare DB driver dependency preflight policy for v1.1.6 before any real DB driver, package.json change, pnpm-lock change, real DB connection, live DB integration test, migration execution, provider SDK apply, or production deployment.

## Risk level

R3. Product-relevant preflight policy and evidence work. No DB driver dependency, package change, lockfile change, real DB connection, migration execution, provider SDK apply, or production deployment is introduced.

## Product verification

Local verification includes install, lint, typecheck, pnpm test, npm test, evidence CI, quality self-protection, placeholder check, quality self-protection script check, and secret safety scan. GitHub typescript, contracts, and quality-gate must pass on current head before merge.

## Affected entrypoints

- `apps/api/src/db-driver-preflight-policy.ts`
- `apps/api/src/db-driver-preflight-policy.test.ts`
- `.codex/db-driver-preflight-policy.json`
- DB driver preflight docs and quality evidence docs

## Failure paths considered

- A driver is selected without project-owner approval.
- A package or lockfile change is allowed before the dependency review.
- Real DB, live DB, migration, provider SDK, production, legal compliance, YouTube policy compliance, or readiness flags are enabled too early.
- Unsafe evidence values such as DB URLs, private URLs, wallet addresses, token-like values, raw provider responses, or raw GitHub logs are recorded.
- AI review recommendation is mistaken for human owner approval.

## Human confirmation needed

Human project-owner approval is still required before selecting a DB driver or introducing a DB driver dependency. This PR records `driver_choice_status: not_selected` and `owner_approval_status: not_approved`.

## Task Contract

Goal: Prepare DB driver dependency preflight policy for v1.1.6 before any real DB driver, package.json change, pnpm-lock change, real DB connection, live DB integration test, migration execution, provider SDK apply, or production deployment.

Allowed scope: db_driver_preflight_policy, candidate_driver_evaluation, license_review_policy, supply_chain_review_policy, security_advisory_review_policy, version_pinning_policy, lockfile_review_policy, package_diff_review_policy, tests, docs, .codex evidence.

Forbidden scope: real DB connection, DB driver dependency, package.json change, pnpm-lock change, migration change, migration execution, live DB integration test execution, real provider SDK apply, actual production deployment apply, secret manager real SDK integration, live YouTube operation, wallet/RPC/deploy changes, YouTube connector changes, Chain Listener changes, durable events runtime changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, raw GitHub log reading, quality-gate weakening.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: DB driver preflight policy validator exists; default record is not_selected; candidate drivers are the exact review set pg and postgres; candidate evaluations are required and complete; no selected driver is recorded; owner approval record remains required and not_approved; package and lockfile changes remain disabled; real DB, live DB, migration, provider SDK, production apply, legal compliance, YouTube policy compliance, and readiness flags remain disabled; license, supply-chain, advisory, version pinning, lockfile, package diff, and secret manager reviews remain required.

This PR defines preflight policy only and cannot select a driver.

## Evidence Integrity

Head SHA: 040573da0853d42032420919128bd3c48e027c91

Base SHA: 9b41e6453172ef9287c9ce41774a50589568a728

Product CI: success

Quality-gate: success

CI run: 27243372594

Quality-gate run: 27244093501

Quality-gate artifact: 7523339400

Tests: 37 test files, 695 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-db-driver-preflight-policy-v116-prep.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- `corepack pnpm install` - pass
- `corepack pnpm lint` - pass
- `corepack pnpm typecheck` - pass
- `corepack pnpm test` - pass
- `npm test` - pass
- `corepack pnpm evidence:ci` - pass
- `corepack pnpm quality:self-protection` - pass
- `node scripts/write-test-summary.mjs` - pass
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-db-driver-preflight-policy-v116-prep.md` - pass
- `node scripts/check-evidence-placeholders.mjs` - pass
- `node scripts/validate-evidence-freshness.mjs` - pass
- `node scripts/check-quality-gate-self-protection.mjs` - pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds an internal DB driver preflight policy validator and tests without DB driver, package change, lockfile change, real DB connection, migrations, provider SDK, public API, contract ABI, YouTube connector, Chain Listener, or IRIS delivery changes.

Runtime smoke rationale:

- No runtime readiness is claimed; this PR adds preflight policy, docs, evidence, and tests only.

Review scope and verification:

- Scope: DB driver preflight policy validator, tests, docs, candidate evaluation, review checklists, and machine-readable evidence.
- Risk summary: Main risk is accidentally selecting or installing a DB driver before owner approval and preflight review.
- Verification oracle: Vitest coverage, typecheck, evidence CI, quality self-protection, secret scan, no-scraping scan, DB driver import scan, package/lockfile diff check, and GitHub checks.

## Test Coverage Evidence

Current recorded test summary: 37 files, 695 passed, 6 skipped.

Changed area: `apps/api/src/db-driver-preflight-policy.ts`, `apps/api/src/db-driver-preflight-policy.test.ts`, DB driver preflight docs, and `.codex` evidence.

Test command: `corepack pnpm vitest run apps/api/src/db-driver-preflight-policy.test.ts`; `corepack pnpm test`; `npm test`; `corepack pnpm evidence:ci`; `corepack pnpm quality:self-protection`.

What the test covers: safe default `not_selected` state, exact `pg` and `postgres` candidate set, required candidate evaluations, selected driver rejection even with approved owner record, package/lockfile/real DB/live DB/migration/provider/production/readiness/legal/YouTube policy denials, review requirement enforcement, unsafe value rejection, context binding, and machine-readable evidence safe defaults.

Edge cases: missing `pg`, missing `postgres`, duplicate candidate evaluation, selected driver with approved owner record, forbidden capability flags, missing review requirement, DB connection string, private URL, wallet address, token-like value, password/client secret/API key/refresh token/access token/connection string/private key patterns, approval/selection/readiness/compliance wording, raw provider response, raw GitHub logs reference, and stale target commit binding.

## Best of N Evidence

Candidate count: 3
Selected candidate: Candidate B, preflight policy plus candidate/review evidence without dependency/package changes.
Reason selected: enforceable preflight guardrails with no DB driver or package/lockfile change.
Rejected alternatives: Candidate A adds a DB driver too early; Candidate C is docs-only and lacks machine-readable gates.

## Security Boundaries

- No DB driver dependency is added.
- No package.json or pnpm-lock change is introduced.
- No real DB connection is implemented.
- No migration is changed or executed.
- No live DB integration test is executed.
- No selected driver is recorded.
- GitHub raw logs remain forbidden.

## Residual risks

- Driver choice remains future owner-approved work.
- License review remains future work.
- Supply-chain review remains future work.
- Security advisory review remains future work.
- Lockfile and package diff review remain future work.
- Runtime and production readiness remain out of scope.

## Human Confirmation

- Owner approval status is not_approved for this PR.
- Driver choice status is not_selected for this PR.
- AI review recommendations are not recorded as human approval.
- Future DB driver dependency introduction requires a new project-owner-approved PR.
