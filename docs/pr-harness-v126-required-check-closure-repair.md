# Harness v1.2.6 Required Check Closure Repair

## Task Contract

This repair closes the observed v1.2.6 post-merge required-check gap where the quality gate passed while the required TypeScript check failed on the v1.2.6 harness rollout head.

The change is limited to active harness source-of-record alignment and the existing compatibility test that still expected v1.2.5 as the active harness.

## Evidence Integrity

- PR #116 merge commit: `a11c204a879baa4483bb9ee0da4c0900030b06ed`
- Local repair branch: `codex/harness-v126-required-check-closure-repair`
- Raw GitHub logs were not read.
- PR body self-report is not treated as machine evidence.
- Quality-gate success alone does not create merge readiness when any required check fails.

## Testing And Review

Local verification completed:

- `corepack pnpm exec vitest run apps/api/src/harness-v120-adaptive-review-pool.test.ts apps/api/src/evidence-rendering.test.ts`
- `node scripts/codex-v126-self-test.mjs`
- `node scripts/codex-v125-self-test.mjs`
- `node scripts/codex-v124-self-test.mjs`
- `node scripts/codex-v123-self-test.mjs`
- `corepack pnpm test`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `npm test`
- `corepack pnpm evidence:ci`
- `corepack pnpm quality:self-protection`
- `node scripts/write-test-summary.mjs`
- `node scripts/check-evidence-placeholders.mjs`
- `node scripts/validate-evidence-freshness.mjs`
- `node scripts/check-quality-gate-self-protection.mjs`
- `node scripts/codex-secret-safety-scan.mjs`

## Security Boundaries

This repair does not change product runtime behavior, package dependencies, workflows, contracts, migrations, wallet/RPC behavior, YouTube connector behavior, Chain Listener behavior, or deployment behavior.

It does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.

## Residual Risks

GitHub same-head checks still need to pass on the repair PR before merge. The repair PR must not be merged on quality-gate success alone.

## Human Confirmation

This document is not human/project-owner approval, not a GitHub approval review, and not merge authority.
