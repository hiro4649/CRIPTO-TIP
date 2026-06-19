# Summary

Move read-only Admin moderation list and summary routes from server.ts into a dedicated dependency-injected route module without changing behavior.

PR profile: product_r3
Task mode: refactor

## Task Contract

Goal: Move read-only Admin moderation list and summary routes from server.ts into a dedicated dependency-injected route module without changing behavior.

Allowed scope: read-only Admin moderation route extraction, dependency-injected route registration, route parity tests, static route dependency assertions, product completion audit update, .codex evidence, PR evidence docs.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Google SDK dependency, real DB connection, migration change, contract change, workflow change, apps/web change, apps/overlay change, real network call, real YouTube API call, real OAuth execution, secret value read, wallet/RPC/deploy change, real TTS, real Live2D, renderer, OBS, real WebSocket delivery, token sale, token exchange, cash-out, custody, internal balance, investment wording.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: Admin moderation read routes are no longer implemented inline in server.ts; route module does not read process.env, import server, create a repository singleton, call global fetch, or access secrets; read-only behavior, auth, held-support list, moderation summary, and safe audit metadata remain covered; existing Admin moderation tests continue to pass; no package, lockfile, real network, OAuth, secret, runtime readiness, production readiness, legal compliance, or YouTube policy compliance claim.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: 95122d3fe27537652691f8aea85c72dae77271ad

Product CI: local_pre_pr

Quality-gate: local_pre_pr

CI run: pre_pr

Quality-gate run: pre_pr

Quality-gate artifact: pre_pr

Tests: 118 test files, 2049 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p1-api-admin-moderation-read-routes.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm test -- apps/api/src/p1-api-admin-moderation-read-routes.test.ts apps/api/src/p0-admin-moderation-hold-review-controls.test.ts apps/api/src/p0-admin-moderation-queue-summary.test.ts: pass
- corepack pnpm typecheck: pass
- corepack pnpm lint: pass
- corepack pnpm test: pass
- npm test: pass
- corepack pnpm evidence:ci: pass
- corepack pnpm quality:self-protection: pass
- node scripts/codex-secret-safety-scan.mjs: pass
- node scripts/codex-v126-self-test.mjs: pass
- node scripts/codex-v125-self-test.mjs: pass
- node scripts/codex-v124-self-test.mjs: pass
- node scripts/codex-v123-self-test.mjs: pass
- cd contracts && forge test: unavailable_nonblocking_local

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Google SDK dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: no
- Compatibility statement: Moves read-only Admin moderation list and summary routes out of server.ts; route behavior and external public API shape are unchanged.

Runtime smoke rationale:

- No production runtime readiness is claimed; this PR changes offline evidence tooling and tests, so repository checks are the applicable verification.

Review scope and verification:

- Scope: P1 read-only Admin moderation route extraction and evidence.
- Risk summary: Main risk is route parity drift while reducing server.ts route surface; focused tests cover auth, held list, summary, dependency boundaries, and existing admin moderation behavior.
- Verification oracle: Focused route parity and existing Admin moderation tests, typecheck, lint, full tests, evidence checks, quality self-protection, secret scan, self-tests, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 118 files, 2049 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver or Google SDK dependency is added.
- No real DB connection, migration, contract, workflow, web, or overlay path is changed.
- No real YouTube API, OAuth token, token exchange, token refresh, token revocation request, RPC, wallet, or deploy change is used.
- The extracted moderation routes remain read-only.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- Admin moderation approve/reject write routes and broader admin route families still live in server.ts.
- Real credential provider, OAuth consent, real list calls, quota observation, privacy review, data deletion review, and YouTube policy verification remain future owner-scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
