# Initial Audit Report

Date: 2026-06-02

## Critical

None open in the MVP source snapshot.

## High

None open in the MVP source snapshot.

## Medium

- File: `docs/RUNBOOK.md`
  Risk: Queue, DLQ, chain cursor, and confirmation window are documented but not implemented beyond in-memory mocks.
  Fix: Implement durable PostgreSQL storage, queue workers, and chain listener before production use.
  Test recommendation: Add integration tests with duplicated logs, delayed confirmations, and simulated reorg.

## Low

- File: `apps/api/src/server.ts`
  Risk: MVP bearer tokens have development defaults.
  Fix: Require environment-provided secrets outside local development.
  Test recommendation: Add config tests that production mode refuses default tokens.

- File: local toolchain
  Risk: `forge`, `gitleaks`, `semgrep`, and `slither` were not installed in this Windows environment, so those checks could not be completed locally.
  Fix: Run GitHub Actions and install local security tools before production hardening.
  Test recommendation: Require CI contract and static analysis jobs before merging production deployments.

- File: `apps/api/src/server.ts`
  Risk: Overlay WebSocket uses a shared mock token in MVP.
  Fix: Replace with stream-scoped hashed overlay tokens before production.
  Test recommendation: Add token rotation and per-stream authorization tests.

## Info

- File: `contracts/src/TipRouterV1.sol`
  Risk: Production owner must be a multisig address; MVP constructor accepts an owner address.
  Fix: Enforce multisig operationally at deployment.
  Test recommendation: Add deployment script checks when deployment artifacts are introduced.

## Checks Performed

- TypeScript lint: passed.
- TypeScript typecheck: passed.
- Vitest unit tests: passed.
- Secret/risky pattern grep: no code hits for committed secret patterns or dangerous HTML rendering.
- Risk wording scan: findings are limited to rule/compliance documents and test-only prohibited phrase lists.
- Foundry tests: not run locally because `forge` was unavailable.

## Follow-up Hardening Added

- Duplicate `/internal/events` now checks `source + source_event_id` before affinity calculation, overlay emission, or AI reaction building.
- Public TipIntent status now returns a DTO that excludes wallet address, raw display name, raw message, message hash, and client tip id.
- `message_hash` and `client_tip_id` are bytes32-compatible `0x` + 64 hex strings.
- Wallet address detection is deterministic across repeated calls.
- YouTube Super Chat comments now pass through moderation.
- Overlay WebSocket messages tolerate malformed JSON.
- Overlay WebSocket requires a mock token in the query string.
- Contract tests now include zero stream/character id reverts and stronger ABI-level TipSent event field checks.
