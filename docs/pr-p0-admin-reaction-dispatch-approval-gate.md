# Summary

Add a local/internal admin approval gate for persisted safe reaction dispatch candidates without dispatching runtime work or exposing raw data.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add a local/internal admin approval gate for persisted safe reaction dispatch candidates without dispatching runtime work or exposing raw data.

Allowed scope: admin reaction dispatch approval gate, candidate approval metadata, candidate rejection metadata, admin auth guard, safe audit metadata, Support Event Contract v2 validation before approval, idempotent approval and rejection, docs, .codex evidence.

Forbidden scope: runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, package.json change, pnpm-lock change, DB driver dependency, Redis dependency, Kafka dependency, real DB connection, migration change, contract change, workflow change, real YouTube API, real OAuth token, real RPC, wallet/RPC/deploy changes, real TTS call, real Live2D call, real renderer call, real OBS delivery, real WebSocket delivery, IRIS Core call, VOXWEAVE call, support event mutation, reaction enqueue, overlay enqueue, outbox enqueue, AI generation execution, token sale, token exchange, cash-out, custody, internal balance, investment wording, refund.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: approval endpoints require admin bearer token; unknown candidate returns 404; candidate_ready can be approved_for_dispatch; approval is idempotent; candidate_ready can be rejected_by_admin; rejection is idempotent; invalid blocked superseded and unsafe candidates are blocked; safe audit metadata is written once per transition; no support event mutation; no reaction overlay or outbox enqueue; no external runtime execution; safe metadata only.

## Evidence Integrity

Head SHA: d4d68aecc017a780cec5d77c515cf3848d8d108f

Base SHA: d771698ffb279d3d9cd134e36a1ffdac080ea349

Product CI: success

Quality-gate: success

CI run: 27619687826

Quality-gate run: 27619687910

Quality-gate artifact: 7667702046

Tests: 82 test files, 1848 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-admin-reaction-dispatch-approval-gate.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm vitest run apps/api/src/p0-admin-reaction-dispatch-approval-gate.test.ts apps/api/src/p0-reaction-dispatch-safe-candidate-persistence.test.ts apps/api/src/p0-support-event-contract-v2-validator.test.ts apps/api/src/p0-support-event-contract-v2-admin-surface.test.ts apps/api/src/p0-admin-reaction-dispatch-preview.test.ts: pass
- corepack pnpm install: pass
- corepack pnpm lint: pass
- corepack pnpm typecheck: pass
- corepack pnpm test: pass
- npm test: pass
- corepack pnpm evidence:ci: pass
- corepack pnpm quality:self-protection: pass
- node scripts/write-test-summary.mjs: pass
- node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-admin-reaction-dispatch-approval-gate.md: pass
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
- Compatibility statement: Adds local/internal admin reaction dispatch candidate approval endpoints.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal approval metadata only.

Review scope and verification:

- Scope: P0 admin reaction dispatch approval gate, admin auth, candidate approval/rejection metadata, safe audit metadata, idempotency, tests, docs, and .codex evidence.
- Risk summary: Main risk is unsafe approval, raw data exposure, support event mutation, dispatch side effects, external runtime execution, or readiness claims; tests and docs reject those outcomes.
- Verification oracle: Approval gate tests, safe candidate persistence tests, contract v2 tests, reaction dispatch preview tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 82 files, 1848 passed, 6 skipped.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver, Redis, or Kafka dependency is added.
- No real DB connection is introduced.
- No migration is changed or executed.
- No contracts or workflows are changed.
- No real YouTube API or OAuth token is used.
- No real TTS, Live2D, renderer, OBS, WebSocket delivery, IRIS Core call, or VOXWEAVE call is performed.
- No support events are mutated.
- No reaction, overlay, or outbox side effects are enqueued.
- No RPC, wallet, deploy, web, or overlay app changes.
- Approval metadata excludes raw messages, raw payloads, wallet addresses, authorization strings, secrets, stdout, stderr, jobs_url, logs_url, full prompts, LLM output, model-generated TTS text, and private URLs.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal admin approval gate metadata only.
- Actual approved-candidate outbox boundary and external execution adapters remain future scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
