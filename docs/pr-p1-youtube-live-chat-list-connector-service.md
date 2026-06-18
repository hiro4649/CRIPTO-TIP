# Summary

Add a bounded, network-disabled YouTube Live Chat list connector service that uses injected fake transport and cursor gateway interfaces only.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add a bounded, network-disabled YouTube Live Chat list connector service that uses injected fake transport and cursor gateway interfaces only.

Allowed scope: bounded list connector service, fake transport only execution, cursor gateway interface, page token handoff, polling metadata capture, safe failure capsules, duplicate replay accounting, held moderation accounting, docs, .codex evidence.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Google SDK dependency, real DB connection, migration change, contract change, workflow change, apps/web change, apps/overlay change, real network call, real YouTube API call, real OAuth execution, secret value read, wallet/RPC/deploy change, token sale, token exchange, cash-out, custody, internal balance, investment wording.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: cursor missing and caught-up cursors do not call fake fetch; one-page and multi-page fake list flows complete; nextPageToken handoff is preserved; pollingIntervalMillis metadata is captured; duplicate replay remains idempotent; held moderation is counted safely; safe transport failures map to blocked or backoff statuses; cycle cap is enforced; constructor bounds reject unsafe loop settings; no global fetch, timer, sleep, real API, OAuth, secret, package, or lockfile change.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: 3a1ea4c81ab08cfa4b81a503e8aab4eca578bae2

Product CI: local_pre_pr

Quality-gate: local_pre_pr

CI run: pre_pr

Quality-gate run: pre_pr

Quality-gate artifact: pre_pr

Tests: 111 test files, 2012 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p1-youtube-live-chat-list-connector-service.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm exec vitest run apps/api/src/p1-youtube-live-chat-list-connector-service.test.ts apps/api/src/p1-youtube-live-chat-direct-rest-list-transport.test.ts apps/api/src/p1-youtube-live-chat-quota-polling-planner.test.ts apps/api/src/p0-youtube-live-chat-page-support-received-ingest.test.ts apps/api/src/p0-youtube-live-chat-fixture-cursor-boundary.test.ts: pass
- corepack pnpm typecheck: pass
- corepack pnpm lint: pass
- corepack pnpm test: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Google SDK dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds an internal network-disabled list connector service interface without changing public product runtime APIs.

Runtime smoke rationale:

- No runtime readiness is claimed; this service is verified with injected fake transport and in-memory cursor gateway tests only.

Review scope and verification:

- Scope: P1 YouTube Live Chat bounded list connector service, fake transport only, cursor gateway interface, safe counters, safe failure capsules, tests, docs, and .codex evidence.
- Risk summary: Main risk is accidental real network/OAuth/secret execution, unbounded looping, timer/sleep usage, raw metadata exposure, or readiness claims; tests and docs reject those outcomes.
- Verification oracle: Focused list connector tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 111 files, 2012 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Google SDK, Redis, or Kafka dependency is added.
- No real DB connection, migration, contract, workflow, web, or overlay path is changed.
- No real YouTube API, OAuth token, token exchange, token refresh, token revocation request, RPC, wallet, or deploy change is used.
- The service uses injected fake transport and cursor gateway interfaces only.
- The service does not import Fastify server or self-call HTTP endpoints.
- No global fetch, timer, sleep, real network, real OAuth, or secret value is used.
- Service output excludes raw pages, raw comments, display names, credentials, Authorization headers, private URLs, endpoint URLs, and query values.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- GitHub same-head checks and safe artifact are pending until PR creation.
- Real credential provider selection, real network canary, and production monitoring remain future owner-scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
