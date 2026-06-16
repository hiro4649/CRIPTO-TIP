# Summary

Add a local/internal read-only admin endpoint for Support Event Contract v2 validation status without exposing raw data or triggering side effects.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add a local/internal read-only admin endpoint for Support Event Contract v2 validation status without exposing raw data or triggering side effects.

Allowed scope: Support Event Contract v2 admin visibility endpoint, admin auth guard, safe metadata only, read-only behavior, validator and reaction dispatch preview alignment, docs, .codex evidence.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Redis dependency, Kafka dependency, real DB connection, migration change, contract change, workflow change, real YouTube API, real OAuth token, real RPC, wallet/RPC/deploy changes, real TTS call, real Live2D call, real renderer call, real OBS delivery, real WebSocket delivery, support event mutation, reaction enqueue, overlay enqueue, outbox enqueue, token sale, token exchange, cash-out, custody, internal balance, investment wording, refund.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: admin contract v2 surface requires admin bearer token; admin contract v2 surface rejects missing and invalid auth; admin contract v2 surface returns 404 for unknown support event; admin contract v2 surface returns safe metadata only; admin contract v2 surface includes validation status and safe reason codes; admin contract v2 surface is read-only; admin contract v2 surface does not enqueue reaction overlay or outbox; existing contract v2 validator and reaction dispatch preview tests still pass.

## Evidence Integrity

Head SHA: 8853a8fc171e9dc88bb4fdabf1e3869f0f466fe0

Base SHA: 8853a8fc171e9dc88bb4fdabf1e3869f0f466fe0

Product CI: success

Quality-gate: success

CI run: 27615034765

Quality-gate run: 27615181516

Quality-gate artifact: 7665786700

Tests: 80 test files, 1839 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-support-event-contract-v2-admin-surface.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm vitest run apps/api/src/p0-support-event-contract-v2-admin-surface.test.ts apps/api/src/p0-support-event-contract-v2-validator.test.ts apps/api/src/p0-admin-reaction-dispatch-preview.test.ts: pass
- corepack pnpm typecheck: pass
- corepack pnpm install: pass
- corepack pnpm lint: pass
- corepack pnpm test: pass
- npm test: pass
- corepack pnpm evidence:ci: pass
- corepack pnpm quality:self-protection: pass
- node scripts/write-test-summary.mjs: pass
- node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-support-event-contract-v2-admin-surface.md: pass
- node scripts/check-evidence-placeholders.mjs: pass
- node scripts/validate-evidence-freshness.mjs: pass
- node scripts/check-quality-gate-self-protection.mjs: pass
- node scripts/codex-secret-safety-scan.mjs: pass
- node scripts/codex-v125-self-test.mjs: pass
- node scripts/codex-v124-self-test.mjs: pass
- node scripts/codex-v123-self-test.mjs: pass
- cd contracts && forge test || true: unavailable_nonblocking

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts, runtime dependencies, DB driver dependency, Redis/Kafka dependency, package.json, or pnpm-lock changes are introduced.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds local/internal read-only admin Support Event Contract v2 visibility endpoint.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal admin visibility only.

Review scope and verification:

- Scope: P0 Support Event Contract v2 admin surface, admin auth, safe metadata, read-only behavior, tests, docs, and .codex evidence.
- Risk summary: Main risk is raw data exposure, support event mutation, side effects, external runtime execution, or readiness claims; tests and docs reject those outcomes.
- Verification oracle: Admin surface tests, validator tests, reaction dispatch preview tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 80 files, 1839 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No real DB connection is introduced.
- No migration is changed or executed.
- No real YouTube API or OAuth token is used.
- No real TTS, Live2D, renderer, OBS, or WebSocket delivery is performed.
- No support events are mutated.
- No reaction, overlay, or outbox side effects are enqueued.
- No RPC, wallet, deploy, contracts, workflows, web, or overlay app changes.
- Admin surface excludes raw messages, raw payloads, wallet addresses, authorization strings, secrets, stdout, stderr, jobs_url, and logs_url.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal admin Support Event Contract v2 visibility only.
- Actual reaction approval, durable candidate persistence, and external execution adapters remain future scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
