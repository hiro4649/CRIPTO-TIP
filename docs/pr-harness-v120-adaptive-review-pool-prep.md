# Summary

This PR aligns CRIPTO-TIP harness source-of-record with v1.2.0 and adds adaptive review-pool profiles.

It does not weaken safety.

It does not create owner approval, GitHub approval review, merge authority, release authority, deploy authority, runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

It does not add a DB driver dependency.

It does not change package.json or pnpm-lock.

It does not change product runtime behavior.

Align CRIPTO-TIP harness source-of-record with v1.2.0 and add adaptive review-pool profiles without weakening safety, changing product runtime behavior, adding a DB driver dependency, changing package.json or pnpm-lock, or creating owner approval, GitHub approval review, merge authority, runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Align CRIPTO-TIP harness source-of-record with v1.2.0 and add adaptive review-pool profiles without weakening safety, changing product runtime behavior, adding a DB driver dependency, changing package.json or pnpm-lock, or creating owner approval, GitHub approval review, merge authority, runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

Allowed scope: harness_v120_source_of_record_alignment, token_aware_model_tier_routing_profile, typed_blocker_profile, review_pool_policy_profile, escalation_hysteresis_profile, high_tier_repair_planning_profile, tests, docs, .codex evidence.

Forbidden scope: product runtime implementation, real DB connection, DB driver dependency, package.json change, pnpm-lock change, migration change, migration execution, live DB integration test execution, real provider SDK apply, actual production deployment apply, real YouTube OAuth, real RPC, wallet/RPC/deploy changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, owner approval generation, GitHub approval review generation, merge authority generation, quality-gate weakening.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: machine-readable v1.2.0 adaptive review-pool profile exists; sourceOfRecordStatus is aligned; modelTierRoutingStatus is policy_ready; typedBlockerStatus is policy_ready; reviewPoolPolicyStatus is policy_ready; escalationHysteresisStatus is policy_ready; highTierRepairPlanningStatus is policy_ready; safetyReduction is false; qualityGateWeakening is false; mergeAuthorityCreated is false; ownerApprovalCreated is false; githubApprovalReviewCreated is false; selectedDriver remains null; no package or lockfile change is introduced.

## Evidence Integrity

Head SHA: 872541557dbc8f480b78cd941b1b50268a0c759b

Base SHA: 301c66b6560e4e1a7cd66bdd08a51a74f288da58

Product CI: success

Quality-gate: success

CI run: 27384710953

Quality-gate run: 27384898010

Quality-gate artifact: 7579705811

Tests: 50 test files, 1692 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-github-run-artifact-auto-injection.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm install: pass
- corepack pnpm lint: pass
- corepack pnpm typecheck: pass
- corepack pnpm test: pass
- npm test: pass
- corepack pnpm evidence:ci: pass
- corepack pnpm quality:self-protection: pass
- node scripts/check-evidence-placeholders.mjs: pass
- node scripts/validate-evidence-freshness.mjs: pass
- node scripts/check-quality-gate-self-protection.mjs: pass
- node scripts/codex-secret-safety-scan.mjs: pass
- forge test: nonblocking unavailable locally

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, package.json, or pnpm-lock changes are introduced by this PR.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: no
- Compatibility statement: No product runtime API contract is changed by this v1.2.0 profile alignment PR.

Runtime smoke rationale:

- No runtime readiness is claimed; this PR changes offline harness profile evidence and tests only.

Review scope and verification:

- Scope: AGENTS v1.2.0 source boundary, adaptive review-pool profile definitions, validator, tests, docs, and .codex evidence.
- Risk summary: Main risk is mistaking high-tier repair planning for owner approval or merge authority; validators reject those authority flags.
- Verification oracle: Vitest profile coverage, typecheck, lint, repository test suite, evidence checks, quality self-protection, and GitHub same-head required checks after PR creation.

## Test Coverage Evidence

Current recorded test summary: 50 files, 1692 passed, 6 skipped.

## Security Boundaries

- No DB driver dependency is added.
- No package.json or pnpm-lock change is introduced.
- No real DB connection is implemented.
- No migration is changed or executed.
- No provider SDK apply or production deployment is introduced.
- No runtime, production, legal, or YouTube policy readiness is claimed.
- No owner approval, GitHub approval review, or merge authority is created.
- Raw GitHub logs and raw advisory output remain forbidden.

## Residual risks

- Current-head GitHub run and artifact evidence must be refreshed after PR creation.
- v1.2.0 profile readiness does not advance the P0 product vertical slice.
- High-tier repair planning can be mistaken for approval unless the no-authority rule is preserved.

## Human Confirmation

- AI review is not human approval.
- High-tier repair planning is not owner approval.
- Profile readiness is not merge readiness.
- This PR must not be merged until same-head required checks pass.
