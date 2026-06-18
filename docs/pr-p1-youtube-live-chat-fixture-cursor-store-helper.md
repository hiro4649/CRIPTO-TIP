# Summary

Move internal YouTube Live Chat fixture cursor WeakMap stores and store lookup helper out of server.ts without changing route behavior.

PR profile: product_r3
Task mode: refactor

## Task Contract

Goal: Move internal YouTube Live Chat fixture cursor WeakMap stores and store lookup helper out of server.ts without changing route behavior.

Allowed scope: internal fixture cursor store helper extraction, WeakMap store relocation, identity mapping relocation, network-disabled evidence test, .codex evidence, PR evidence docs.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Google SDK dependency, real DB connection, migration change, contract change, workflow change, apps/web change, apps/overlay change, real network call, real YouTube API call, real OAuth execution, secret value read, wallet/RPC/deploy change, real TTS, real Live2D, renderer, OBS, real WebSocket delivery, token sale, token exchange, cash-out, custody, internal balance, investment wording.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: fixture cursor WeakMap stores are no longer defined inline in server.ts; fixture cursor store lookup helper is reusable outside server.ts; identity mapping behavior remains covered by focused cursor tests; existing fixture cursor and network-disabled E2E tests continue to pass; no package, lockfile, real network, OAuth, secret, runtime readiness, production readiness, legal compliance, or YouTube policy compliance claim; token sale, token exchange, cash-out, custody, internal balance, and investment wording remain forbidden.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: 25551500cf26e7b15743ee84105acb251be1926f

Product CI: local_pre_pr

Quality-gate: local_pre_pr

CI run: pre_pr

Quality-gate run: pre_pr

Quality-gate artifact: pre_pr

Tests: 114 test files, 2034 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p1-youtube-live-chat-fixture-cursor-store-helper.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm exec vitest run apps/api/src/p0-youtube-live-chat-fixture-cursor-boundary.test.ts apps/api/src/p1-youtube-live-chat-network-disabled-e2e.test.ts: pass
- corepack pnpm typecheck: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Google SDK dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: no
- Compatibility statement: Moves internal fixture cursor store helpers out of server.ts; route behavior and external public API shape are unchanged.

Runtime smoke rationale:

- No runtime readiness is claimed; focused fixture cursor and network-disabled tests verify unchanged local behavior without real network or OAuth.

Review scope and verification:

- Scope: P1 internal YouTube fixture cursor store helper extraction and evidence.
- Risk summary: Main risk is behavior drift while reducing server.ts store surface; focused tests cover cursor identity and network-disabled E2E paths.
- Verification oracle: Focused cursor boundary and network-disabled E2E tests, typecheck, full tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 114 files, 2034 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver or Google SDK dependency is added.
- No real DB connection, migration, contract, workflow, web, or overlay path is changed.
- No real YouTube API, OAuth token, token exchange, token refresh, token revocation request, RPC, wallet, or deploy change is used.
- The connector remains fake_transport only.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- The fixture cursor routes still live in server.ts and can be extracted in a later PR.
- Production repository persistence for connector failure state remains future owner-scoped work.
- Real credential provider, OAuth consent, real list calls, quota observation, privacy review, data deletion review, and YouTube policy verification remain future owner-scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
