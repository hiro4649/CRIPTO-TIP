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

Head SHA: 5794bb75213095e253faad45ad91e930e83a104d

Base SHA: 0dbf5d2a86294d67d7c7d5e1ae198918f157dc24

Product CI: success

Quality-gate: success

CI run: 27323160883

Quality-gate run: 27323480197

Quality-gate artifact: 7554670955

Tests: 45 test files, 1240 passed, 6 skipped

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

Current recorded test summary: 45 files, 1240 passed, 6 skipped.

Changed area: DB driver advisory source policy validator, allowed source categories, source binding rules, timestamp/freshness rules, raw output policy, committed not-reviewed evidence, docs, and .codex evidence.

Test command: corepack pnpm test and npm test, plus targeted Vitest coverage for DB driver advisory source policy and advisory review envelope.

What the test covers: default not_reviewed policy state, exact allowed source categories, pg/postgres candidate source policies, raw output rejection, selected-driver rejection, future reviewed fixture isolation, committed evidence safety defaults, stale machine-readable evidence rejection, pending PR creation evidence rejection, and knownBlockers null semantics.

Edge cases: raw advisory/audit/OSV/npm registry/dependency tree text, terminal output markers, private URLs, DB connection strings, wallet addresses, token-like values, missing/extra/duplicate source categories, missing/extra/duplicate candidates, reviewed/fresh/pass claims, knownBlockers clean proof, permission flags, stale head SHA, stale target commit SHA, and pending CI/quality-gate fields.

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

## Harness Version Scope

This is v1.1.8 prep only. It does not roll out harness v1.1.8. Active harness evidence remains v1.1.7 unless a separate harness rollout PR updates it.

## Review Independence

- Review role: implementation agent plus safety audit pass.
- Independent reviewer status: pending human review after PR creation.
- AI-only approval: not claimed.
- Owner approval: not granted.

## Best of N Evidence

Candidate count: 3.

Candidates:

- Candidate A: source-policy-only validator and docs, no dependency/runtime change.
- Candidate B: advisory review plus source policy in one PR.
- Candidate C: dependency introduction with advisory source policy.

Selected candidate: Candidate A.

Reason selected: it is the smallest change that establishes allowed source categories and raw-output rejection without selecting a DB driver, adding package dependencies, claiming advisory review completion, or changing runtime behavior.

Rejected alternatives: Candidate B would mix source policy with actual advisory review; Candidate C would violate the no dependency/package-change boundary for this PR.

## Advisory Source Policy Evidence

- Advisory source policy status: `not_reviewed`.
- Allowed source categories: `npm_registry_metadata`, `github_advisory_summary`, `osv_summary`, `npm_audit_safe_summary`, `maintainer_release_notes_summary`.
- Allowed source categories are future acceptable source types only; they do not mean the source was checked, the package is safe, no advisory exists, or dependency installation is allowed.
- Raw output categories remain forbidden, including GitHub raw logs, raw audit JSON, raw advisory responses, terminal stdout/stderr, raw dependency trees, provider raw responses, private URLs, and DB connection strings.
- Driver choice status: `not_selected`.
- `knownBlockers: null` means not reviewed. `knownBlockers: []` is not committed as clean proof in this PR.
- Current committed evidence blocks selected driver, reviewed/fresh/pass advisory claims, knownBlockers clean proof, package permission, lockfile permission, real DB permission, migration permission, live DB test permission, provider SDK permission, production deployment permission, and runtime readiness permission.
