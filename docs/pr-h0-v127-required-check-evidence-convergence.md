# fix: converge v127 required-check evidence

## Goal

Fix v1.2.7 required-check evidence convergence so workflow conclusions and
safe technical artifacts agree on same-head required checks.

## Risk level

H0 harness evidence repair. Product runtime behavior is unchanged.

## Files or scope

Changed scope is limited to safe CI metadata scripts, safe fixtures,
evidence-rendering regression tests, and docs/process notes.

## Evidence Integrity

- Head SHA: current_pr_head
- Base SHA: current_pr_base
- CI run: local_pre_pr
- Quality-gate run: local_pre_pr
- Safe artifact ID: local_pre_pr
- Required-check metadata artifact ID: local_pre_pr
- Raw GitHub logs read: false

## Validation commands

- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm vitest run apps/api/src/evidence-rendering.test.ts apps/api/src/harness-v120-adaptive-review-pool.test.ts`
- `corepack pnpm test`
- `npm.cmd test`
- `corepack pnpm evidence:ci`
- `corepack pnpm quality:self-protection`
- `node scripts/check-evidence-placeholders.mjs`
- `node scripts/validate-evidence-freshness.mjs`
- `node scripts/check-quality-gate-self-protection.mjs`
- `node scripts/codex-secret-safety-scan.mjs`
- `node scripts/codex-v127-self-test.mjs`
- `node scripts/codex-v126-self-test.mjs`
- `node scripts/codex-v125-self-test.mjs`
- `node scripts/codex-v124-self-test.mjs`
- `node scripts/codex-v123-self-test.mjs`

## PR #158 Regression

The new exporter uses safe GitHub `statusCheckRollup` metadata instead of
display-oriented `gh pr checks` buckets. For PR #158 metadata, it projects
completed successful `typescript`, `contracts`, and `quality-gate` checks on
the same head with non-empty check and workflow run IDs.

The committed contradiction fixture preserves the old failure artifact shape
and remains fail-closed.

## Security Boundaries

- Product code changed: false
- Package or lockfile changed: false
- Runtime changed: false
- Contracts changed: false
- Migrations changed: false
- Raw logs read: false
- Real network execution: false
- OAuth execution: false
- Secret access: false
- Real DB/RPC/wallet/deploy: false
- Runtime, production, legal, or YouTube policy readiness claim: false

## Residual risks

This PR only repairs required-check evidence convergence. It does not advance
numeric identity, data fidelity, public mock truthfulness, runtime repository
selection, or YouTube canary authorization.

## Human confirmation needed

AI technical review is not human approval. This is not a GitHub approval
review. This creates no owner approval record, release authority, deploy
authority, network authority, OAuth authority, secret authority, wallet
authority, RPC authority, production authority, legal authority, or policy
authority.
