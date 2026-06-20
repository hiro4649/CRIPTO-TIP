# fix: separate technical readiness from review advisories

PR profile: harness_workflow_r3
Risk level: R3
Task mode: bugfix

## Goal
Separate load-bearing technical readiness from review advisories and owner-only merge authorization. A PR can be technically green while still not merge-ready because owner approval, GitHub approval review, or merge authority has not been created.

## Risk level
R3 harness workflow repair. This changes quality-gate interpretation and safe-summary validation, not product runtime behavior.

## Files or scope
- Harness scripts for technical readiness classification, PR profile compatibility, safe artifact budget tiers, safe summary validation, and v0.8.5 stability reporting.
- A safe projection fixture for the PR #172 advisory-only candidate state.
- Focused tests for technical readiness separation.

## Evidence Integrity
Technical failures, unsafe output, stale evidence, missing required artifacts, profile downgrades, and unknown reason codes remain fail-closed. Owner review, GitHub approval review, and merge authority are reported as review states and do not become generated approvals.

## Security impact
No secret, token, endpoint, OAuth, YouTube API, DB, RPC, wallet, deployment, production, legal, or YouTube policy operation is added. No raw GitHub logs are read or stored.

## Validation commands
- node --check scripts/codex-local-quality-gate.mjs
- node --check scripts/codex-workflow-quality-runner.mjs
- node --check scripts/validate-quality-gate-safe-summary.mjs
- node --check scripts/codex-pr-profile-gate.mjs
- node --check scripts/codex-safe-artifact-index.mjs
- node --check scripts/codex-technical-readiness-policy.mjs
- node --check scripts/codex-v085-stability-gate.mjs
- node scripts/codex-h3-v127-technical-readiness-self-test.mjs
- corepack pnpm vitest run apps/api/src/evidence-rendering.test.ts

## Product verification
Not applicable. This PR does not change product runtime behavior.
Skip reason: harness-only/docs-only H3 repair with no product runtime change and no runtime readiness claim.

## Tests or checks run
Pending current-head verification.

## Testing and review
The added harness self-test covers PR #172-style manual advisories, unknown manual reasons failing closed, soft-versus-hard artifact budget behavior, compatible profile escalation, profile downgrade rejection, and harness-only formal precedence.

## Best of N Evidence
Candidate count: 3

Selected candidate: typed technical readiness classification with separate owner-review and advisory fields.

Reason selected: keeps same-head technical checks load-bearing while preventing review-only states from blocking technical readiness.

Rejected approach B: special-case PR #172. That would hide a general harness defect and create stale exception risk.

Rejected approach C: treat all manual_confirmation_required states as pass. That would weaken security and evidence gates.

## Test Coverage Evidence
Focused coverage is added in scripts/codex-h3-v127-technical-readiness-self-test.mjs. The fixture is a safe projection only and contains no raw logs or raw outputs.

## Residual risks
Remote quality-gate behavior must be confirmed on the PR head using safe artifacts only. This PR does not create owner approval, GitHub approval review, merge authority, release authority, deploy authority, runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

## Human confirmation needed
Human/project-owner approval remains separate from this AI technical review. Merge authority is not created by this PR body.
