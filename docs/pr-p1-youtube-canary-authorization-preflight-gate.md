# Summary

Canonicalize owner authorization evaluation while keeping YouTube canary execution forbidden and admin preflight routes read-only.

PR profile: security_r3
Task mode: feature

## Task Contract

Goal: Canonicalize owner authorization evaluation while keeping YouTube canary execution forbidden and admin preflight routes read-only.

Allowed scope: canonical YouTube canary authorization domain evaluator, read-only admin authorization preflight routes, legacy controlled-canary preflight projection, real connector readiness projection, typed blocker tests, .codex evidence, PR evidence docs.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Google SDK dependency, real DB connection, migration change, contract change, workflow change, apps/web change, apps/overlay change, real network call, real YouTube API call, real OAuth execution, secret value read, wallet/RPC/deploy change, token sale, token exchange, cash-out, custody, internal balance, investment wording.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: canonical domain schema and evidence wrapper schema are separated; GET default evaluation uses committed_safe_bundle input trust; POST preview evaluation uses untrusted_preview input trust; legacy coarse statuses do not infer owner-only credential refs or test stream fields; real readiness never emits controlled_canary_candidate; complete authorization fields keep execution forbidden and network disabled; no package, lockfile, workflow, contract, migration, real network, OAuth, secret, runtime readiness, production readiness, legal compliance, or YouTube policy compliance claim.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: d516c603f63c8512d2b96a46444bb215d88db0fc

Product CI: metadata_limited

Quality-gate: metadata_limited

CI run: metadata_limited

Quality-gate run: metadata_limited

Quality-gate artifact: metadata_limited

Tests: 120 test files, 2099 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p1-youtube-canary-authorization-preflight-gate.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm install --frozen-lockfile: pass
- corepack pnpm vitest run apps/api/src/youtube-live-chat-canary-authorization-gate.test.ts apps/api/src/p1-admin-youtube-controlled-canary-preflight.test.ts: pass
- corepack pnpm vitest run apps/api/src/p0-superchat-support-received-vertical-slice.test.ts apps/api/src/p0-superchat-event-pipeline-hardening.test.ts: pass
- corepack pnpm lint: pass
- corepack pnpm typecheck: pass
- corepack pnpm test: pass
- npm test: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Google SDK dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: yes
- Internal runtime API changed: yes
- Compatibility statement: Adds read-only admin canary authorization preflight routes and keeps legacy aliases delegated to the same handler. It does not enable execution.

Runtime smoke rationale:

- No production runtime readiness is claimed; this PR changes offline evidence tooling and tests, so repository checks are the applicable verification.

Review scope and verification:

- Scope: P1 YouTube canary authorization preflight gate hardening.
- Risk summary: Main risk is accidentally implying execution readiness or inferring owner-only fields from coarse compatibility inputs.
- Verification oracle: Focused authorization, route, readiness, typed blocker, trust-boundary, and evidence wrapper tests plus full repo checks.

## Test Coverage Evidence

Current recorded test summary: 120 files, 2099 passed, 6 skipped.

## Security Boundaries

- Admin authorization is required on all routes.
- POST preview input is untrusted.
- GET committed bundle input is safe committed evidence.
- POST does not persist state.
- POST does not mutate default GET output.
- No network call is made.
- No OAuth execution is made.
- No secret access is made.
- No owner authority is created.
- No candidate wording enables execution.
- Unknown fields are rejected.
- Unsafe input is rejected without echoing raw values.
- Side effects remain literal false.
- Execution flags remain literal false.
- Complete fields still return execution forbidden.

## Residual risks

- This PR still does not run a real YouTube canary.
- Real credential provider, OAuth execution, network authorization, and YouTube API calls remain future owner-scoped work.
- Remote same-head checks and safe artifact refresh are required after push.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
