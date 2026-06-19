# Summary

Make the quality-gate workflow pass a stable pull-request changed-file list into target classification gates.

PR profile: harness_workflow_r3
Risk level: H1
Task mode: bugfix

## Task Contract

Goal: prevent remote PR classification from falling back to an unstable `origin/main...HEAD` diff when the pull_request base and head SHA are available.

Allowed scope: `.github/workflows/quality-gate.yml` and PR evidence docs.

Forbidden scope: product runtime, package or lockfile changes, DB driver dependency, real DB, migrations, contracts, real network, OAuth, secrets, wallet/RPC/deploy, readiness claims, owner approval, GitHub approval review, and merge authority.

## Goal

Prepare `CODEX_CHANGED_FILES` from the pull_request base/head SHA before product evidence and quality-gate steps run.

## Risk level

H1 harness workflow repair. The change affects remote evidence input preparation only and does not change product runtime behavior.

## Files or scope

Changed file: `.github/workflows/quality-gate.yml`.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: 8f6087920b7ecdd30d2c640926f15ca1f49459f3

CI run: metadata_limited

Quality-gate run: metadata_limited

Quality-gate artifact: metadata_limited

## Validation commands

- `node scripts/check-quality-gate-self-protection.mjs`: pass
- `corepack pnpm quality:self-protection`: pass
- `corepack pnpm evidence:ci`: pass
- `node scripts/codex-secret-safety-scan.mjs`: pass

## Product verification

Not applicable. This is a harness workflow input repair with no product runtime behavior change.

## Tests or checks run

The quality-gate self-protection check confirms the workflow still preserves the safe summary validator contract.

## Testing and review

The workflow now writes a multiline `CODEX_CHANGED_FILES` environment value from pull_request base/head SHA, with an `origin/main...HEAD` fallback.

## Best of N Evidence

Best of N used or skipped: skipped with reason - direct harness workflow input repair.

## Test Coverage Evidence

Changed area: quality-gate workflow changed-files metadata preparation.

Test command: `node scripts/check-quality-gate-self-protection.mjs`.

What the test covers: the workflow keeps the load-bearing safe-summary validator protection intact.

Edge cases: empty base/head diff falls back to `origin/main...HEAD`; product runtime is unchanged.

## Security Boundaries

No raw logs are read or printed. No product runtime, package, lockfile, contract, migration, network, OAuth, secret, DB, RPC, wallet, deploy, readiness, approval, review, or merge authority behavior is introduced.

## Residual risks

Remote quality-gate must confirm the new PR changed-file metadata resolves classification unknown on the current head.

## Human confirmation needed

AI review is not human/project-owner approval. AI review is not GitHub approval review. This PR does not create owner approval record or merge authority.
