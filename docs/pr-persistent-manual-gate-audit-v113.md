# Summary

Add persistent manual gate and provider deployment audit storage boundaries under harness v1.1.3 without real provider SDK apply or production deployment.

PR profile: harness_workflow_r3
Task mode: feature

## Task Contract

Goal: Add persistent manual gate and provider deployment audit storage boundaries under harness v1.1.3 without real provider SDK apply or production deployment.

Allowed scope: manual_gate_persistence_boundary, manual_gate_audit_log_boundary, provider_deployment_audit_boundary, safe_summary_persistence, postgres_migration_design, tests, docs, .codex evidence.

Forbidden scope: real provider SDK apply, actual production deployment apply, secret manager real SDK integration, live YouTube operation, wallet/RPC/deploy changes, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, raw GitHub log reading, quality-gate weakening.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: manual gate persistent repository creates requested and approved gates; manual gate persistent repository rejects unsafe secret references; manual gate persistent repository marks used once and rejects double use; manual gate audit logs reject wallet addresses private URLs and token-like values; provider deployment audit logs store planned executed failed and rollback planned safe summaries; provider deployment jobs store rollback and runbook references; provider deployment jobs strip unsafe safe-summary fields; migration defines manual gate and provider deployment audit tables; migration includes status check constraints and no secret defaults; PR #34 provider-safe deployment regression tests still pass; no secret scan passes; no scraping scan passes; required checks pass on PR head.

## Evidence Integrity

Head SHA: 4743261f5649dc92d7ced39856b04f8c7ca99fe2

Base SHA: 73e54a5df289a9b9bf04e1586a04a8224f5c890d

Product CI: success

Quality-gate: success

CI run: 27128269803

Quality-gate run: 27128616175

Quality-gate artifact: 7476428258

Tests: 24 test files, 254 passed, 6 skipped

## Testing and review

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `node scripts/write-test-summary.mjs`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-persistent-manual-gate-audit-v113.md`
- `node scripts/check-evidence-placeholders.mjs`

Product verification:

Repository checks and package verification were run on the current evidence head.

Tests or checks run:

The commands below are the merge-relevant checks for this evidence tooling change.

Product verification commands:

- corepack pnpm install: pass
- corepack pnpm lint: pass
- corepack pnpm typecheck: pass
- corepack pnpm test: pass
- npm test: pass
- corepack pnpm evidence:ci: pass
- corepack pnpm quality:self-protection: pass
- node scripts/write-test-summary.mjs: pass
- node scripts/check-evidence-placeholders.mjs: pass
- node scripts/validate-evidence-freshness.mjs: local advisory before PR creation
- node scripts/check-quality-gate-self-protection.mjs: pass
- node scripts/codex-secret-safety-scan.mjs: pass

Package verification:

- Package scripts changed: no
- Runtime dependencies added: no
- Verification: No package scripts or runtime dependencies are changed.

API Compatibility Summary:

- Public API changed: no
- Internal runtime API changed: yes
- Compatibility statement: Adds internal manual gate persistence and audit storage boundaries, provider deployment audit records, and migration design without changing external API, contract ABI, YouTube connector, Chain Listener, IRIS delivery payloads, or real provider SDK execution.

Runtime smoke rationale:

- No runtime readiness is claimed; this PR adds offline persistent audit storage boundaries and migration design, not production deployment execution.

Review scope and verification:

- Scope: Persistent manual gate repository, audit log repository, provider deployment audit records, migration design, docs, and evidence.
- Risk summary: Main risk is accepting unsafe audit target/ref values, invalid manual gate transitions, duplicate audit IDs, or leaking provider secrets in safe summaries.
- Verification oracle: Vitest coverage, typecheck, evidence CI, quality self-protection, secret scan, no-scraping scan, and GitHub checks.

## Test Coverage Evidence

Current recorded test summary: 24 files, 254 passed, 6 skipped.

Changed area: manual gate persistent repository boundary, manual gate audit log
boundary, provider deployment audit boundary, safe summary persistence, and
PostgreSQL migration design.

Test command: `corepack pnpm test` and `npm test`.

What the test covers: manual gate create/approve/use-once behavior, invalid
state transition rejection, duplicate ID rejection, unsafe secret reference
rejection, audit record rejection for wallet/private/token-like values, provider
deployment planned/executed/failed/rollback audit records, unsafe target and
reference rejection, safe job summary stripping, rollback/runbook reference
persistence, and migration table/constraint coverage.

Edge cases and failure paths: missing target commit, unsafe secret reference,
double used gate, approve after used/rejected, mark used before approval, raw
provider response fields, webhook URL fields, API-key-like fields, wallet
address fields, duplicate audit/job IDs, unsafe provider target/ref values, and
migration secret default values.

## Security Boundaries

- No real provider SDK apply is implemented.
- No actual production deployment apply is implemented.
- Audit records store safe summaries only, never secret values or raw provider responses.
- Manual gate records are approval evidence, not secret storage.
- GitHub unsafe log sources were not read.
- YouTube scraping remains forbidden.

## Residual risks

- Persistent transaction boundary remains future work; not a merge blocker because this PR only adds repository interfaces, in-memory parity tests, and migration design without claiming DB-backed production execution.
- Real provider SDK apply remains future work; not a merge blocker because no real provider SDK, credential, webhook, or provider call path is introduced.
- Actual production deployment apply remains out of scope; not a merge blocker because production-like apply still requires approved manual gate evidence and a separate owner-controlled execution path.
- Secret rotation audit remains future work; not a merge blocker because current records accept secret references only and do not persist secret values.
- Live YouTube operation remains manual-gated; not a merge blocker because this PR does not change the YouTube connector or run live account operations.

## Human Confirmation

- Human owner confirmation is required before production-like apply.
- AI review recommendations are not recorded as human approval.
- No runtime, production, legal, or YouTube policy readiness is claimed.
