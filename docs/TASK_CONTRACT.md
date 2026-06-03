# Task Contract

Task Mode: feature.

PR Profile: product_minor_r2.

## Goal

Durable event storage and queue boundary.

## Allowed Scope

- Migration.
- Repository boundary.
- Outbox/DLQ.
- Config validation.
- Quality evidence docs.
- Tests/docs.

## Forbidden Scope

- Production chain listener.
- Official YouTube connector.
- Production IRIS delivery.
- Token sale.
- Token exchange.
- Cash-out.
- Custody.
- Internal balance.
- Investment wording.
- Speculative reward.

## Done Criteria

- TypeScript CI pass.
- Contracts CI pass.
- Quality-gate pass.
- `server.ts` has no direct `InMemoryRepository` internals.
- Public DTO safety preserved.
- Moderation gates preserved.
- Idempotency preserved.
- Evidence docs updated.
- PR body test count matches actual test output.

## Current Verification

`corepack pnpm test` passed with 9 test files and 45 tests. `npm test` passed locally with 9 test files and 45 tests. Node 20 Vitest reproduction passed with 9 test files and 45 tests after the WebSocket negative auth test compatibility repair. GitHub CI runs `26835142098` and `26858338314` passed `typescript` and `contracts`.
