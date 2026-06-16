# Summary

Add GET /admin/support-events/:eventId/action-plan for safe local/internal read-only support event action planning.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add GET /admin/support-events/:eventId/action-plan for safe local/internal read-only support event action planning.

Allowed scope: local/internal admin support event action plan API, admin auth guard, read-only action allowlist, blocked action reason metadata, side-effect ledger summary, timeline reference, safe metadata only, docs, .codex evidence.

Forbidden scope: support event mutation, reaction enqueue, overlay enqueue, audit log write, raw support message output, raw payload output, real TTS call, real Live2D call, real renderer call, real OBS delivery, real WebSocket delivery, real YouTube API, real OAuth token, real DB connection, DB driver dependency, Redis dependency, Kafka dependency, package.json change, pnpm-lock change, contracts change, migrations change, real RPC, wallet/RPC/deploy changes, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, web UI, overlay app changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: admin support event action plan requires admin bearer token; admin support event action plan rejects invalid auth; unknown support event returns 404; held events include safe eligible action allowlist and blocked resend reasons; approved events include already approved and side-effect already applied reasons; rejected events include already rejected reasons; side-effect ledger summary is included; timeline reference is safe; action plan is read-only and enqueues no reaction or overlay.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: current_pr_base

Product CI: not_created_pre_pr

Quality-gate: not_created_pre_pr

CI run: not_created_pre_pr

Quality-gate run: not_created_pre_pr

Quality-gate artifact: not_created_pre_pr

Tests: 72 test files, 1813 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-admin-support-event-action-plan.md`
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
- Compatibility statement: Adds local/internal admin support event action plan read model.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal admin action planning only.

Review scope and verification:

- Scope: P0 admin support event action plan, admin auth, safe allowlist, blocked reason metadata, side-effect summary, read-only tests, docs, and .codex evidence.
- Risk summary: Main risk is exposing raw support data, mutating state from a read endpoint, enqueueing runtime side effects, or implying runtime readiness; tests and docs reject those outcomes.
- Verification oracle: Action plan tests, existing admin support event tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 72 files, 1813 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No real DB connection is introduced.
- No migration is changed or executed.
- No real YouTube API or OAuth token is used.
- No real TTS, Live2D, renderer, OBS, or WebSocket delivery is performed.
- No support event mutation, reaction enqueue, overlay enqueue, or audit log write is performed by the action-plan endpoint.
- No RPC, wallet, deploy, contracts, workflows, web, or overlay app changes.
- Raw messages, raw payloads, secrets, URLs, stack output, stdout, stderr, jobs_url, and logs_url are not returned.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal admin action planning only.
- Production Admin Console UI, durable persistence, and operational action execution policy remain future scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
