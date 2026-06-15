# Summary

Add POST /admin/support-events/:eventId/overlay-resend for safe local/internal overlay resend candidate enqueueing.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add POST /admin/support-events/:eventId/overlay-resend for safe local/internal overlay resend candidate enqueueing.

Allowed scope: local/internal admin overlay resend API, admin auth guard, approved support resend candidate enqueue, held and rejected support blockers, overlay resend idempotency, safe audit metadata, docs, .codex evidence.

Forbidden scope: real OBS delivery, real WebSocket delivery, real YouTube API, real OAuth token, real DB connection, DB driver dependency, Redis dependency, Kafka dependency, package.json change, pnpm-lock change, contracts change, migrations change, real RPC, wallet/RPC/deploy changes, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, web UI, overlay app changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: admin overlay resend requires admin bearer token; admin overlay resend rejects missing or invalid auth; admin overlay resend returns 404 for unknown event; admin overlay resend blocks held support until approval; admin overlay resend blocks rejected support; admin overlay resend enqueues one resend candidate for approved support; admin overlay resend is idempotent by support event and stream; admin overlay resend does not duplicate affinity, reaction, original support, or original source fields; admin overlay resend excludes raw message and raw payload from response; admin overlay resend writes safe audit log.

## Evidence Integrity

Head SHA: 57a4bf798253e785941dd17a28be7fb5ef34b658

Base SHA: 1e4e1d8b9e93c83e534ce69b33c61af22b80f59e

Product CI: success

Quality-gate: success

CI run: 27527206332

Quality-gate run: 27527362067

Quality-gate artifact: 7630253989

Tests: 65 test files, 1784 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-admin-overlay-resend-controls.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:


Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Redis/Kafka dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds local/internal admin overlay resend controls.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal admin overlay resend candidate enqueueing only.

Review scope and verification:

- Scope: P0 admin overlay resend controls, admin auth, approved-only resend, idempotent overlay/outbox enqueue, side-effect blockers, safe audit metadata, tests, docs, and .codex evidence.
- Risk summary: Main risk is resending held or rejected support, duplicating overlay/outbox jobs, mutating support financial/source fields, or implying real OBS/runtime readiness; tests and docs reject those outcomes.
- Verification oracle: Admin overlay resend tests, existing support adjustment tests, existing manual support tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 65 files, 1784 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No real DB connection is introduced.
- No migration is changed or executed.
- No real YouTube API or OAuth token is used.
- No real OBS or WebSocket delivery is performed.
- No RPC, wallet, deploy, contracts, workflows, web, or overlay app changes.
- Raw messages, raw payloads, secrets, URLs, stack output, stdout, stderr, jobs_url, and logs_url are not returned.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal admin overlay resend candidate enqueueing only.
- Production Admin Console UI, durable persistence, OBS delivery workers, and operational replay policy remain future scoped work.

## Human Confirmation

- AI review is not human approval.
- Merge remains blocked until PR creation, evidence refresh, and same-head checks pass.
