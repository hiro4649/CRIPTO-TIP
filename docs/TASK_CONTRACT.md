# Task Contract

Task mode: product_minor_r2.

PR Profile: product_minor_r2.

## Goal

Add durable event storage, repository boundary, outbox/DLQ boundary, config validation, and quality evidence for CRIPTO-TIP PR #2.

## Allowed Scope

- Migration.
- Repository boundary.
- Outbox/DLQ.
- Config validation.
- Quality evidence docs.
- Tests/docs.
- Test evidence.
- CI contract dependency pinning.

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
- YouTube scraping.

## Runtime Readiness Claim

No. PR #2 does not claim production runtime readiness.

## Product Code Changed

Yes. PR #2 changes API repository boundaries, outbox worker boundaries, config validation, tests, docs, and package/test configuration.

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

`corepack pnpm test` passed with 9 test files and 45 tests. `npm test` passed locally with 9 test files and 45 tests. Node 20 Vitest reproduction passed with 9 test files and 45 tests after the WebSocket negative auth test compatibility repair. GitHub CI run `26860944234` passed `typescript` and `contracts`.

## Verification Surface

- API repository boundary.
- Public TipIntent DTO safety.
- Moderation gate side effects.
- Support event idempotency.
- Postgres SQL parameterization.
- Outbox retry and DLQ boundary.
- Config validation.
- Overlay token and text-only boundary.
- Package and lockfile test compatibility.
- Contracts CI.

## Load-Bearing Evidence

- `.codex/task-contract.json` records `doneCriteria`, `verificationSurface`, storage oracle, release gate oracle, and split plan.
- `.codex/product-verification.json` records pass/partial/not_started product verification statuses.
- `.codex/test-coverage-evidence.json` records 9 test files and 45 tests.
- `.codex/review-independence.json` records writer evidence, review evidence, and human review fields.
