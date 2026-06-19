# Summary

Allow the security lifecycle gate to recognize machine-readable security oracle evidence from `.codex/evidence-pack.json`.

PR profile: harness_workflow_r3
Risk level: H2
Task mode: bugfix
Skip reason: harness-only security gate evidence repair with no product runtime behavior.

## Task Contract

Goal: prevent product PRs with explicit security oracle evidence from failing `turn_diff_surface_scan` only because `CODEX_SECURITY_ORACLE_PRESENT` was not set.

Allowed scope: `scripts/codex-security-lifecycle-gate.mjs`, self-test coverage, and PR evidence docs.

Forbidden scope: product runtime, package or lockfile changes, DB driver dependency, real DB, migrations, contracts, real network, OAuth, secrets, wallet/RPC/deploy, readiness claims, owner approval, GitHub approval review, and merge authority.

## Goal

Treat a complete `securityOracle` object in `.codex/evidence-pack.json` as load-bearing machine-readable evidence for security lifecycle review.

## Risk level

H2 harness security-gate repair. The change affects evidence recognition only and does not change product runtime behavior.

## Files or scope

Changed files: `scripts/codex-security-lifecycle-gate.mjs`, `scripts/codex-v092-self-test.mjs`, and this PR evidence doc.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: 20a002c3ca7ebf32494cf9bb66593c1939fa3503

CI run: metadata_limited

Quality-gate run: metadata_limited

Quality-gate artifact: metadata_limited

## Validation commands

- `node scripts/codex-v092-self-test.mjs`: pass
- `node scripts/codex-secret-safety-scan.mjs`: pass
- `corepack pnpm evidence:ci`: pass
- `corepack pnpm quality:self-protection`: pass

## Product verification

Not applicable. This is a harness security evidence recognition repair with no product runtime behavior change.

## Tests or checks run

Self-test coverage verifies that runtime/security product surfaces still fail without an oracle and pass with complete machine-readable oracle evidence.

## Testing and review

The accepted oracle must include covered files plus authentication, untrusted input, negative path, unsafe no-echo, authority, network, OAuth, secret, and runtime execution assertions.

## Best of N Evidence

Best of N used or skipped: skipped with reason - direct security lifecycle evidence recognition repair.

## Test Coverage Evidence

Changed area: security lifecycle oracle evidence detection.

Test command: `node scripts/codex-v092-self-test.mjs`.

What the test covers: missing oracle remains blocking; complete machine-readable oracle satisfies security lifecycle review.

Edge cases: malformed oracle JSON is ignored and cannot create a pass.

## Security Boundaries

No raw logs are read or printed. No product runtime, package, lockfile, contract, migration, network, OAuth, secret, DB, RPC, wallet, deploy, readiness, approval, review, or merge authority behavior is introduced.

## Residual risks

Remote quality-gate must confirm PR #172 security lifecycle passes after this repair is merged and incorporated.

## Human confirmation needed

AI review is not human/project-owner approval. AI review is not GitHub approval review. This PR does not create owner approval record or merge authority.
