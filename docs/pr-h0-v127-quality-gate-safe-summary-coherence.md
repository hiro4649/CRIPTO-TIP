PR profile: harness_h0
Risk level: H0
Task mode: bugfix

## Goal

Enforce coherence between the quality-gate workflow conclusion and the load-bearing safe summary.

This PR makes the workflow fail when the safe summary reports technical failure, `technicalChecksReady: false`, or technical blocking statuses. It keeps safe artifact upload before the final validator so failure diagnosis remains safe-artifact-only.

## Risk level

H0 harness repair. The change affects the quality-gate harness and does not change product runtime behavior.

## Security impact

- raw GitHub logs read: false
- product runtime changed: false
- package.json changed: false
- pnpm-lock.yaml changed: false
- network execution: false
- OAuth execution: false
- secret access: false
- real YouTube API execution: false
- real DB execution: false
- RPC execution: false
- wallet execution: false
- deploy execution: false
- owner approval created: false
- GitHub approval review created: false
- merge authority created: false

## Validation commands

- `corepack pnpm vitest run apps/api/src/evidence-rendering.test.ts`: pass
- `corepack pnpm lint`: pass
- `corepack pnpm typecheck`: pass
- `corepack pnpm test`: pass
- `npm test`: pass
- `corepack pnpm evidence:ci`: pass
- `corepack pnpm quality:self-protection`: pass
- `node scripts/check-evidence-placeholders.mjs`: pass
- `node scripts/validate-evidence-freshness.mjs`: pass
- `node scripts/check-quality-gate-self-protection.mjs`: pass
- `node scripts/codex-secret-safety-scan.mjs`: pass
- `node scripts/codex-v127-self-test.mjs`: pass
- `node scripts/codex-v126-self-test.mjs`: pass
- `node scripts/codex-v125-self-test.mjs`: pass
- `node scripts/codex-v124-self-test.mjs`: pass
- `node scripts/codex-v123-self-test.mjs`: pass

## Product verification

No product runtime verification is introduced by this H0 repair. The changed surface is workflow and harness validation.

## Tests or checks run

Focused H0 regression coverage verifies:

- failed safe summary is rejected
- `technicalChecksReady: false` is rejected
- technical blocking statuses are rejected
- owner-only merge authorization absence is not a technical failure by itself
- workflow self-protection requires the validator step
- workflow runner no longer exits early only because final decision exit code is zero

## Testing and review

The runner now evaluates workflow report failures before honoring `finalDecision.exitCode === 0`.

The workflow uploads safe artifacts first, then runs `scripts/validate-quality-gate-safe-summary.mjs` as a load-bearing final step.

## Best of N Evidence

Candidate count: 3

Candidates:

- A: Add a load-bearing safe summary validator after artifact upload and block runner early-success bypass.
- B: Only change the PR body/evidence expected by the existing gate.
- C: Only make the local quality gate tolerate the current safe summary state.

Selected candidate: A

Reason selected: It fixes the direct workflow/safe-summary inconsistency while preserving safe artifact availability and keeping owner authority separate from technical readiness.

Reasons alternatives rejected: B leaves workflow success masking technical failure. C weakens the local gate without fixing the remote workflow contract.

## Test Coverage Evidence

Current test summary: 119 files, 2093 passed, 6 skipped.

Tested head: `6fa0c116bdb1ee4abd2a56e29ecda684a5590e18`

## Security Boundaries

This PR does not add a DB driver, package dependency, lockfile change, product runtime behavior, real network call, OAuth exchange, secret provider access, YouTube API call, DB connection, RPC, wallet execution, deployment, runtime readiness claim, production readiness claim, legal compliance claim, or YouTube policy compliance claim.

## Residual risks

Remote quality-gate must prove that a safe-summary failure now fails the workflow while still uploading safe artifacts.

PR #172 remains merge-blocked until this H0 repair is merged and PR #172 is refreshed against the updated main.

## Human confirmation needed

AI technical review is not human/project-owner approval.

AI technical review is not GitHub approval review.

This PR does not create owner approval record.

This PR does not create merge authority.
