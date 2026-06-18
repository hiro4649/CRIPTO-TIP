# Summary

Persist safe connector same-failure state on internal YouTube Live Chat fixture cursors and wire the app cursor gateway to the optional service hooks.

PR profile: product_r3
Task mode: bugfix

## Task Contract

Goal: Persist safe connector same-failure state on internal YouTube Live Chat fixture cursors and wire the app cursor gateway to the optional service hooks.

Allowed scope: internal fixture cursor failure-state metadata, AppCursorGateway optional same-failure hooks, safe failure-state validation, network-disabled E2E tests, .codex evidence, PR evidence docs.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Google SDK dependency, real DB connection, migration change, contract change, workflow change, apps/web change, apps/overlay change, real network call, real YouTube API call, real OAuth execution, secret value read, wallet/RPC/deploy change, real TTS, real Live2D, renderer, OBS, real WebSocket delivery, token sale, token exchange, cash-out, custody, internal balance, investment wording.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: internal fixture cursor can store safe connector failure state; invalid failure state returns safe 400 instead of raw error behavior; internal fixture cursor can clear connector failure state; AppCursorGateway persists same-failure state through service hooks; network-disabled E2E reaches same_failure_repeated across service runs without real network execution; no package, lockfile, real network, OAuth, secret, runtime readiness, production readiness, legal compliance, or YouTube policy compliance claim; token sale, token exchange, cash-out, custody, internal balance, and investment wording remain forbidden.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: 6794c90740351d19a9764e0aea3c7244ea11a382

Product CI: local_pre_pr

Quality-gate: local_pre_pr

CI run: pre_pr

Quality-gate run: pre_pr

Quality-gate artifact: pre_pr

Tests: 114 test files, 2032 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p1-youtube-live-chat-fixture-cursor-failure-state.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm exec vitest run apps/api/src/p0-youtube-live-chat-fixture-cursor-boundary.test.ts apps/api/src/p1-youtube-live-chat-network-disabled-e2e.test.ts: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Google SDK dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds internal fixture cursor failure-state endpoints and app cursor gateway hooks for fake connector control; external public API shape is unchanged.

Runtime smoke rationale:

- No runtime readiness is claimed; app.inject and fake_transport tests verify failure-state persistence without real network or OAuth.

Review scope and verification:

- Scope: P1 internal fixture cursor failure-state persistence and network-disabled E2E hook wiring.
- Risk summary: Main risk is repeated connector failures being forgotten when using app-backed cursor gateway; fix stores safe failure-state metadata on internal fixture cursor and clears it on success.
- Verification oracle: Focused cursor boundary and network-disabled E2E tests, typecheck, full tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 114 files, 2032 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver or Google SDK dependency is added.
- No real DB connection, migration, contract, workflow, web, or overlay path is changed.
- No real YouTube API, OAuth token, token exchange, token refresh, token revocation request, RPC, wallet, or deploy change is used.
- The connector remains fake_transport only.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- Production repository persistence for connector failure state remains future owner-scoped work.
- Real quota cost and real failure fingerprints must still be calibrated under future owner-scoped real YouTube canary work.
- Real credential provider, OAuth consent, real list calls, quota observation, privacy review, data deletion review, and YouTube policy verification remain future owner-scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
