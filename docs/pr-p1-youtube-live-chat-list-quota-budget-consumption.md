# Summary

Enforce per-page quota budget consumption in the fake YouTube Live Chat list connector before a next page can be read.

PR profile: product_r3
Task mode: bugfix

## Task Contract

Goal: Enforce per-page quota budget consumption in the fake YouTube Live Chat list connector before a next page can be read.

Allowed scope: fake YouTube Live Chat list connector quota budget accounting, per-page quota decrement before next-page planning, safe polling metadata preservation, focused unit tests, .codex evidence, PR evidence docs.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Google SDK dependency, real DB connection, migration change, contract change, workflow change, apps/web change, apps/overlay change, real network call, real YouTube API call, real OAuth execution, secret value read, wallet/RPC/deploy change, real TTS, real Live2D, renderer, OBS, real WebSocket delivery, token sale, token exchange, cash-out, custody, internal balance, investment wording.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: quota budget is decremented after each planned fake list page read; second page is blocked when the remaining quota cannot cover another estimated request; transport does not read a next page after quota is exhausted; safe polling metadata from the last successful page is preserved on quota block; no package, lockfile, real network, OAuth, secret, runtime readiness, production readiness, legal compliance, or YouTube policy compliance claim; token sale, token exchange, cash-out, custody, internal balance, and investment wording remain forbidden.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: 97c97c2e41635b5fc7cb288ee3a16297143e0978

Product CI: local_pre_pr

Quality-gate: local_pre_pr

CI run: pre_pr

Quality-gate run: pre_pr

Quality-gate artifact: pre_pr

Tests: 114 test files, 2026 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p1-youtube-live-chat-list-quota-budget-consumption.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm exec vitest run apps/api/src/p1-youtube-live-chat-list-connector-service.test.ts: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Google SDK dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: The fake list connector now decrements quota budget per page before planning another list read; public API shape is unchanged.

Runtime smoke rationale:

- No runtime readiness is claimed; focused fake_transport unit tests verify quota-budget behavior without real network or OAuth.

Review scope and verification:

- Scope: P1 fake YouTube Live Chat list connector quota budget accounting and evidence.
- Risk summary: Main risk is allowing multi-page fake connector runs to ignore quota budget; fix keeps quota accounting local and pre-network.
- Verification oracle: Focused list connector service tests, typecheck, full tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 114 files, 2026 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver or Google SDK dependency is added.
- No real DB connection, migration, contract, workflow, web, or overlay path is changed.
- No real YouTube API, OAuth token, token exchange, token refresh, token revocation request, RPC, wallet, or deploy change is used.
- The connector remains fake_transport only.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- Same-failure counting across scheduler runs remains a separate design item.
- Real quota cost must still be calibrated under future owner-scoped real YouTube canary work.
- Real credential provider, OAuth consent, real list calls, quota observation, privacy review, data deletion review, and YouTube policy verification remain future owner-scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
