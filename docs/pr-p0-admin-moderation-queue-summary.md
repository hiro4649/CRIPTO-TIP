# Summary

Add GET /admin/moderation/summary with safe moderation queue counts and per-stream grouping.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add GET /admin/moderation/summary with safe moderation queue counts and per-stream grouping.

Allowed scope: local/internal admin moderation queue summary API, admin auth guard, safe moderation queue counts, per-stream grouping, docs, .codex evidence.

Forbidden scope: real YouTube API, real OAuth token, real DB connection, DB driver dependency, Redis dependency, Kafka dependency, package.json change, pnpm-lock change, contracts change, migrations change, real RPC, wallet/RPC/deploy changes, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, web UI, overlay changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: admin moderation summary requires admin bearer token; admin moderation summary rejects missing or invalid auth; admin moderation summary returns safe metadata only; admin moderation summary includes held_count; admin moderation summary includes approved_count; admin moderation summary includes rejected_count; admin moderation summary groups by stream_id; admin moderation summary excludes raw message; admin moderation summary excludes raw payload; admin moderation summary excludes secrets URLs stacks stdout stderr logs_url jobs_url; existing moderation hold review and admin operations health tests still pass.

## Evidence Integrity

Head SHA: cb83690e9c63275227d323f8e219fad16ac07e86

Base SHA: c7d53cf2b6cf524a7caf6296942c867b5793d124

Product CI: success

Quality-gate: success

CI run: 27522651721

Quality-gate run: 27522899106

Quality-gate artifact: 7628727191

Tests: 62 test files, 1764 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-admin-moderation-queue-summary.md`
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
- Compatibility statement: Adds local/internal admin moderation queue summary.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal admin moderation queue summary only.

Review scope and verification:

- Scope: P0 admin moderation queue summary, admin auth, safe queue counts, per-stream grouping, tests, docs, and .codex evidence.
- Risk summary: Main risk is exposing raw messages or implying readiness; tests and docs reject those outcomes.
- Verification oracle: Admin moderation queue summary tests, existing moderation hold review tests, existing admin operations tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 62 files, 1764 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No real DB connection is introduced.
- No migration is changed or executed.
- No real YouTube API or OAuth token is used.
- No RPC, wallet, deploy, contracts, workflows, web, or overlay changes.
- Raw messages, raw payloads, secrets, URLs, stack output, stdout, stderr, jobs_url, and logs_url are not returned.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal admin moderation queue summary only.
- Production Admin Console readiness, durable review analytics, real audit retention, and operational policy remain future scoped work.

## Human Confirmation

- AI review is not human approval.
- Merge remains blocked until PR creation, evidence refresh, and same-head checks pass.
