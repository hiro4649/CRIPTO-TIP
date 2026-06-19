# Summary

Extract internal YouTube Live Chat fixture cursor operations from server.ts without changing route behavior.

PR profile: product_r3
Task mode: refactor

## Task Contract

Goal: Extract internal YouTube Live Chat fixture cursor operations from server.ts without changing route behavior.

Allowed scope: internal fixture cursor operation extraction, safe page fingerprint helper extraction, page token guard extraction, failure state transition helper extraction, page advance mutation helper extraction, focused operation tests, .codex evidence, PR evidence docs.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Google SDK dependency, real DB connection, migration change, contract change, workflow change, apps/web change, apps/overlay change, real network call, real YouTube API call, real OAuth execution, secret value read, wallet/RPC/deploy change, real TTS, real Live2D, renderer, OBS, real WebSocket delivery, token sale, token exchange, cash-out, custody, internal balance, investment wording.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: fixture cursor operations are no longer implemented inline in server.ts; fixture cursor operation helper is reusable outside server.ts; safe message id extraction excludes unknown placeholders and duplicate ids; existing fixture cursor behavior remains covered by focused route tests; no package, lockfile, real network, OAuth, secret, runtime readiness, production readiness, legal compliance, or YouTube policy compliance claim; token sale, token exchange, cash-out, custody, internal balance, and investment wording remain forbidden.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: eecafd43fa471f9bd89e77eef6244c34b0ee940e

Product CI: local_pre_pr

Quality-gate: local_pre_pr

CI run: pre_pr

Quality-gate run: pre_pr

Quality-gate artifact: pre_pr

Tests: 115 test files, 2040 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p1-youtube-fixture-cursor-operations.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm exec vitest run apps/api/src/p1-youtube-fixture-cursor-operations.test.ts apps/api/src/p0-youtube-live-chat-fixture-cursor-boundary.test.ts apps/api/src/p1-youtube-live-chat-network-disabled-e2e.test.ts: pass
- corepack pnpm typecheck: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Google SDK dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: no
- Compatibility statement: Moves internal fixture cursor operations out of server.ts; route behavior and external public API shape are unchanged.

Runtime smoke rationale:

- No runtime readiness is claimed; focused fixture cursor and network-disabled tests verify unchanged local behavior without real network or OAuth.

Review scope and verification:

- Scope: P1 internal YouTube fixture cursor operations extraction and evidence.
- Risk summary: Main risk is behavior drift while reducing server.ts cursor mutation surface; focused tests cover operation helpers and existing route paths.
- Verification oracle: Focused operations, cursor boundary, and network-disabled E2E tests, typecheck, full tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 115 files, 2040 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver or Google SDK dependency is added.
- No real DB connection, migration, contract, workflow, web, or overlay path is changed.
- No real YouTube API, OAuth token, token exchange, token refresh, token revocation request, RPC, wallet, or deploy change is used.
- The connector remains fake_transport only.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- The fixture cursor HTTP routes still live in server.ts and can be extracted in a later PR.
- Production repository persistence for cursor operations remains future owner-scoped work.
- Real credential provider, OAuth consent, real list calls, quota observation, privacy review, data deletion review, and YouTube policy verification remain future owner-scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
