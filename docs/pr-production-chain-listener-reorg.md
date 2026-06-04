# Summary

Adds the production Chain Listener boundary for TipRouterV1 `TipSent` logs, including ABI decode, WebSocket subscription handling, `eth_getLogs` catch-up, block cursor persistence, confirmation window processing, reorg status transitions, and idempotent `support.normalize` outbox handoff after confirmation.

## Task Contract

Task mode: product_minor_r2

Goal: add production Chain Listener and confirmation/reorg handling for CRIPTO-TIP.

Allowed scope: chain listener service boundary; EVM RPC provider adapter; TipRouterV1 event ABI decode; WebSocket subscription boundary; `eth_getLogs` catch-up; block cursor persistence; confirmation window; reorg transition; repository methods for chain cursor and transaction status; tests; docs; quality evidence.

Forbidden scope: official YouTube connector; production IRIS Core delivery; token sale; token exchange; cash-out; custody; internal balance; investment wording; speculative reward; YouTube scraping; multiple chains; multiple tokens; wallet custody.

Runtime readiness claim: no

Product code changed: yes

Done criteria: lint pass; typecheck pass; tests pass; contract CI available; Chain Listener decodes TipSent logs; duplicate logs are idempotent; catch-up persists cursor; confirmation window gates `support.normalize`; reorged transactions do not normalize; no user personal text fields are decoded from on-chain logs.

## Evidence Integrity

Base SHA: 62c4795b134464596c8668276d0b51c91a060a45

Head SHA: updated in GitHub PR body after push

Product CI: archived before PR creation

Quality-gate: archived before PR creation

quality-gate run: pending

ci run: pending

Commit SHA: updated in GitHub PR body after push

Stale evidence: current branch evidence only; PR checks must be re-read after push.

Unknown file target: 0 intended through `.codex/change-classification.json`.

## Product Verification

Verified locally:

- TipSent log decode test.
- Duplicate log idempotency test.
- `eth_getLogs` catch-up test.
- WebSocket subscription boundary test.
- Confirmation window test.
- Reorg rollback/status transition test.
- `support.normalize` enqueue only after confirmed test.
- RPC error retry/backoff boundary test.
- Block cursor persistence test.
- No user personal data on-chain/log payload test.

Not implemented in this PR: official YouTube API connector, production IRIS Core delivery adapter, token sale, token exchange, cash-out, custody, internal balance, speculative reward, YouTube scraping, multiple chain support, multiple token support, wallet custody.

## Testing and review

Local commands run before PR:

- `corepack pnpm typecheck`: pass.
- `corepack pnpm test`: pass, 10 test files, 60 passed, 6 skipped.

Required before final merge:

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- contracts CI or `cd contracts && forge test`
- secret/risky rendering scan
- prohibited wording scan

Review focus: ABI decode correctness, RPC adapter boundary, durable cursor updates, idempotency key construction, confirmation/reorg state transitions, and outbox enqueue timing.

## Security Boundaries

This PR does not add production RPC secrets. User display names, comment text, YouTube names, YouTube IDs, and wallet labels are not decoded from logs and are not stored on-chain. `support.normalize` is only queued after confirmation. Reorged transactions are stopped before downstream support normalization.

## Known gaps

Production RPC endpoint configuration, listener process supervision, deployment metrics export, multi-chain routing, multi-token routing, official YouTube connector, production IRIS Core delivery, and overlay token rotation remain follow-up work.
