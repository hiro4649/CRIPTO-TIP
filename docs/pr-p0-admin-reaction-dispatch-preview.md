# Summary

Add local/internal admin reaction dispatch preview so operators can inspect safe reaction context without mutating support events or triggering runtime side effects.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: Add local/internal admin reaction dispatch preview so operators can inspect safe reaction context without mutating support events or triggering runtime side effects.

Allowed scope: local/internal admin reaction dispatch preview API, admin auth guard, safe context summary, character continuity metadata, reaction constraints, read-only preview behavior, docs, .codex evidence.

Forbidden scope: support event mutation, reaction enqueue, overlay enqueue, outbox enqueue, raw message output, raw payload output, wallet address output, secret output, real TTS call, real Live2D call, real renderer call, real OBS delivery, real WebSocket delivery, real YouTube API, real OAuth token, real DB connection, DB driver dependency, Redis dependency, Kafka dependency, package.json change, pnpm-lock change, contracts change, migrations change, real RPC, wallet/RPC/deploy changes, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, web UI, overlay app changes, token sale, token exchange, cash-out, custody, internal balance, investment wording.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: reaction dispatch preview requires admin bearer token; reaction dispatch preview rejects invalid auth; reaction dispatch preview returns 404 for unknown support event; reaction dispatch preview returns safe metadata only; reaction dispatch preview includes character continuity metadata; reaction dispatch preview includes safe context summary; reaction dispatch preview is read-only; reaction dispatch preview does not enqueue reaction overlay or outbox; reaction dispatch preview excludes raw message raw payload wallet address and secrets.

## Evidence Integrity

Head SHA: 4bb910049674ddcce1db2d35f5af01881bea3bbb

Base SHA: ffce428f0826f4d225d08a849fbec2708a0f7700

Product CI: success

Quality-gate: success

CI run: 27602290257

Quality-gate run: 27602290290

Quality-gate artifact: 7660376220

Tests: 78 test files, 1832 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-admin-reaction-dispatch-preview.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm vitest run apps/api/src/p0-admin-reaction-dispatch-preview.test.ts apps/api/src/p0-admin-support-event-work-queue.test.ts apps/api/src/p0-admin-support-event-resolution-status.test.ts apps/api/src/p0-admin-reaction-resend-controls.test.ts apps/api/src/p0-admin-overlay-resend-controls.test.ts apps/api/src/p0-admin-support-event-timeline.test.ts apps/api/src/p0-admin-support-side-effect-ledger.test.ts: pass
- corepack pnpm typecheck: pass
- corepack pnpm install: pass
- corepack pnpm lint: pass
- corepack pnpm test: pass
- npm test: pass
- corepack pnpm evidence:ci: pass
- corepack pnpm quality:self-protection: pass
- node scripts/write-test-summary.mjs: pass
- node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-p0-admin-reaction-dispatch-preview.md: pass
- node scripts/check-evidence-placeholders.mjs: pass
- node scripts/validate-evidence-freshness.mjs: pass
- node scripts/check-quality-gate-self-protection.mjs: pass
- node scripts/codex-secret-safety-scan.mjs: pass
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
- Compatibility statement: Adds local/internal admin reaction dispatch preview endpoints.

Runtime smoke rationale:

- No runtime readiness is claimed; this is local/internal admin preview only.

Review scope and verification:

- Scope: P0 admin reaction dispatch preview, admin auth, safe context, character continuity metadata, read-only behavior, tests, docs, and .codex evidence.
- Risk summary: Main risk is raw data exposure, support event mutation, side effects, external runtime execution, or readiness claims; tests and docs reject those outcomes.
- Verification oracle: Reaction dispatch preview tests, existing admin support event tests, full repository tests, evidence checks, quality self-protection, secret scan, and GitHub same-head checks.

## Test Coverage Evidence

Current recorded test summary: 78 files, 1832 passed, 6 skipped.

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
- Raw messages, raw payloads, wallet addresses, secrets, stack output, stdout, stderr, jobs_url, and logs_url are not returned.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is local/internal admin reaction dispatch preview only.
- Actual IRIS Core, VOXWEAVE, TTS, Live2D, renderer, OBS, and WebSocket execution remain future scoped work.

## Human Confirmation

- AI review is not human approval.
- AI review is not GitHub approval review.
- This PR does not create owner approval record.
- This PR does not create merge authority.
