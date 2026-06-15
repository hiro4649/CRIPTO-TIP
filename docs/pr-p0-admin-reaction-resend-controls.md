# Summary

Add POST /admin/support-events/:eventId/reaction-resend for safe local/internal reaction resend candidate enqueueing.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add POST /admin/support-events/:eventId/reaction-resend for safe local/internal reaction resend candidate enqueueing.

Allowed scope: local/internal admin reaction resend API, admin auth guard, approved support reaction resend candidate enqueue, held and rejected support blockers, reaction resend idempotency, safe audit metadata, docs, .codex evidence.

Forbidden scope: real TTS call, real Live2D call, real renderer call, real OBS delivery, real WebSocket delivery, real YouTube API, real OAuth token, real DB connection, DB driver dependency, Redis dependency, Kafka dependency, package.json change, pnpm-lock change, contracts change, migrations change, real RPC, wallet/RPC/deploy changes, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, web UI, overlay app changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: admin reaction resend requires admin bearer token; admin reaction resend rejects missing or invalid auth; admin reaction resend returns 404 for unknown event; admin reaction resend blocks held support until approval; admin reaction resend blocks rejected support; admin reaction resend enqueues one resend candidate for approved support; admin reaction resend is idempotent by support event and character; admin reaction resend does not duplicate affinity, overlay, original support, or original source fields; admin reaction resend excludes raw message and raw payload from response; admin reaction resend writes safe audit log.

## Evidence Integrity

Head SHA: 3299f8b51e49ac213e8fe45aa74190dcc583e64b

Base SHA: 5d5274ac2dfba423ac615c3c21643f2aa8f9e144

Product CI: success

Quality-gate: success

CI run: 27530487357

Quality-gate run: 27530585694

Quality-gate artifact: 7631473624

Tests: 66 test files, 1790 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-admin-reaction-resend-controls.md`
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
- Compatibility statement: Adds local/internal admin reaction resend controls.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal admin reaction resend candidate enqueueing only.

Review scope and verification:

- Scope: P0 admin reaction resend controls, admin auth, approved-only resend, idempotent reaction/outbox enqueue, side-effect blockers, safe audit metadata, tests, docs, and .codex evidence.
- Risk summary: Main risk is resending held or rejected support, duplicating reaction/outbox jobs, mutating support financial/source fields, or implying real TTS/renderer/runtime readiness; tests and docs reject those outcomes.
- Verification oracle: Admin reaction resend tests, existing overlay resend tests, existing support adjustment tests, existing manual support tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 66 files, 1790 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No real DB connection is introduced.
- No migration is changed or executed.
- No real YouTube API or OAuth token is used.
- No real TTS, Live2D, renderer, OBS, or WebSocket delivery is performed.
- No RPC, wallet, deploy, contracts, workflows, web, or overlay app changes.
- Raw messages, raw payloads, secrets, URLs, stack output, stdout, stderr, jobs_url, and logs_url are not returned.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal admin reaction resend candidate enqueueing only.
- Production Admin Console UI, durable persistence, TTS/renderer delivery workers, and operational replay policy remain future scoped work.

## Human Confirmation

- AI review is not human approval.
- Merge remains blocked until PR creation, evidence refresh, and same-head checks pass.
