# Summary

Prepare DB driver advisory source policy for v1.1.8 without selecting a driver, adding a DB driver dependency, changing package.json or pnpm-lock, connecting to a real DB, executing migrations, running live DB integration tests, applying provider SDK actions, or claiming runtime/production/legal/YouTube policy readiness.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Prepare DB driver advisory source policy for v1.1.8 without selecting a driver, adding a DB driver dependency, changing package.json or pnpm-lock, connecting to a real DB, executing migrations, running live DB integration tests, applying provider SDK actions, or claiming runtime/production/legal/YouTube policy readiness.

Allowed scope: db_driver_advisory_source_policy, allowed_source_categories, source_binding_rules, source_timestamp_rules, safe_summary_rules, raw_output_forbidden_policy, tests, docs, .codex evidence.

Forbidden scope: real DB connection, DB driver dependency, package.json change, pnpm-lock change, migration change, migration execution, live DB integration test execution, real provider SDK apply, actual production deployment apply, secret manager real SDK integration, live YouTube operation, wallet/RPC/deploy changes, YouTube connector changes, Chain Listener changes, durable events runtime changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, raw GitHub log reading, raw advisory output, raw audit output, raw OSV response, raw npm registry metadata, quality-gate weakening, committed approved owner record, selected DB driver in committed evidence, approved final gate in committed evidence, DB driver selected in current PR.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: DB driver advisory source policy validator exists; committed sourcePolicyStatus remains not_reviewed; driverChoiceStatus remains not_selected; selectedDriver remains null; candidate drivers remain exactly pg and postgres; allowed source categories remain exact expected set; source binding, timestamp, and freshness remain not_reviewed; rawOutputPolicyStatus remains raw_output_forbidden; knownBlockersStatus remains not_reviewed; knownBlockers remains null; candidate source policies remain not_reviewed; all permission flags remain false; no package or lockfile change is introduced.

## Evidence Integrity

Head SHA: 89c42547329de00c96663ee6deaa8c0255898d1d

Base SHA: 0dbf5d2a86294d67d7c7d5e1ae198918f157dc24

Product CI: not_applicable_before_pr_creation

Quality-gate: not_applicable_before_pr_creation

CI run: not_applicable_before_pr_creation

Quality-gate run: not_applicable_before_pr_creation

Quality-gate artifact: not_applicable_before_pr_creation

Tests: 45 test files, 1197 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-db-driver-advisory-source-policy-v118-prep.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm lint: pass
- corepack pnpm typecheck: pass
- corepack pnpm test: pass
- npm test: pass
- corepack pnpm evidence:ci: pass
- corepack pnpm quality:self-protection: pass
- node scripts/check-evidence-placeholders.mjs: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, package.json, or pnpm-lock changes are introduced by this PR.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: no
- Compatibility statement: No product runtime API contract is changed by this evidence tooling PR.

Runtime smoke rationale:

- No runtime readiness is claimed; this PR changes offline advisory source policy evidence and tests only.

Review scope and verification:

- Scope: DB driver advisory source policy validator, allowed source categories, source binding rules, timestamp/freshness rules, raw output policy, committed not-reviewed evidence, and tests.
- Risk summary: Main risk is mistaking source policy for actual advisory review; committed evidence remains not-reviewed, no-driver, and no-package-change.
- Verification oracle: Vitest source policy coverage, typecheck, lint, evidence checks, quality self-protection, secret scan, and no-scraping scan.

## Test Coverage Evidence

Current recorded test summary: 45 files, 1197 passed, 6 skipped.

## Security Boundaries

- No DB driver dependency is added.
- No package.json or pnpm-lock change is introduced.
- No real DB connection is implemented.
- No migration is changed or executed.
- No live DB integration test is executed.
- No provider SDK apply or production deployment is introduced.
- No runtime, production, legal, or YouTube policy readiness is claimed.
- Raw advisory output, raw audit output, raw OSV response, raw npm registry metadata, raw dependency trees, terminal output, private URLs, DB connection strings, wallet addresses, and token-like values are rejected.

## Residual risks

- The source policy is not an advisory review.
- Allowed source categories can become stale and must be rebound in a future dependency PR.
- Future source evidence must bind to exact target commit, package version, PR number, source timestamp, and safe summary.
- Future dependency introduction still requires owner approval.
- Runtime and production readiness remain out of scope.

## Human Confirmation

- Owner approval status is not_approved for this PR.
- Driver choice status is not_selected for this PR.
- AI review recommendations are not recorded as human approval.
- Future DB driver dependency introduction requires a separate project-owner-approved PR.

## Review Independence

- Review role: implementation agent plus safety audit pass.
- Independent reviewer status: pending human review after PR creation.
- AI-only approval: not claimed.
- Owner approval: not granted.

## Best of N Evidence

- Local candidate implementation checked against policy, tests, docs, machine-readable evidence, and forbidden-scope scans.
- Current selected approach keeps this PR pre-dependency and source-policy-only.
- Rejected alternatives: adding a real DB driver dependency, using raw advisory output, or claiming source review completion in this PR.

## Advisory Source Policy Evidence

- Advisory source policy status: `not_reviewed`.
- Allowed source categories: `npm_registry_metadata`, `github_advisory_summary`, `osv_summary`, `npm_audit_safe_summary`, `maintainer_release_notes_summary`.
- Raw output categories remain forbidden, including GitHub raw logs, raw audit JSON, raw advisory responses, terminal stdout/stderr, raw dependency trees, provider raw responses, private URLs, and DB connection strings.
- Driver choice status: `not_selected`.
- Current committed evidence blocks selected driver, reviewed/fresh/pass advisory claims, knownBlockers clean proof, package permission, lockfile permission, real DB permission, migration permission, live DB test permission, provider SDK permission, production deployment permission, and runtime readiness permission.
