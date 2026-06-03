# Summary

Adds the IRIS Core delivery adapter boundary for `iris.deliver` outbox jobs. The adapter delivers sanitized `support.received`, `character.reaction.requested`, `affinity.apply`, and `memory.write_candidate` payloads through an injected IRIS Core client with idempotency, timeout, retry/backoff, DLQ, and delivery status handling.

## Task Contract

Task mode: product_minor_r2

Goal: add production IRIS Core delivery adapter boundary for CRIPTO-TIP.

Allowed scope: IRIS Core client interface, mock client, `iris.deliver` outbox handler, delivery status tracking, retry/DLQ behavior, config env boundary, tests, docs, quality evidence.

Forbidden scope: official YouTube connector; token sale; token exchange; cash-out; custody; internal balance; investment wording; speculative reward; YouTube scraping; multiple IRIS Core automatic routing; multi-chain support; multi-token support; wallet custody.

Runtime readiness claim: no

Product code changed: yes

Done criteria: lint pass; typecheck pass; tests pass; contracts CI pass; quality-gate pass; wallet address and secrets excluded from IRIS delivery; reaction and memory payloads remain sanitized; idempotency, retry, and DLQ behavior are tested.

## Evidence Integrity

Base SHA: f9b4222a7bcb2c2c286965ba3971808ed78ec6f1

Head SHA: cbf4ab777dec0d4c6a20e56327d5c1e251b639fe

Product CI: pending for PR creation.

Quality-gate: pending for PR creation.

quality-gate run: pending

ci run: pending

Commit SHA: cbf4ab777dec0d4c6a20e56327d5c1e251b639fe

Stale evidence: current branch evidence only; PR checks must be re-read after push.

## Product Verification

Product verification commands:

- corepack pnpm install: required before merge.
- corepack pnpm lint: required before merge.
- corepack pnpm typecheck: required before merge.
- corepack pnpm test: required before merge.
- npm test: required before merge.
- contracts GitHub CI or local forge: required before merge.

Verified behavior expected from tests:

- support.received delivery success.
- character.reaction.requested delivery success.
- affinity.apply delivery success.
- memory.write_candidate delivery success.
- idempotent delivery by outbox idempotency key.
- HTTP timeout and 5xx retry/backoff.
- 401/403 DLQ behavior.
- wallet_address and secret not sent to IRIS Core payloads.
- delivery_status/outbox completion and failure integration.
- no unsafe valuation wording in reaction delivery payload.

## Test Coverage Evidence

Changed area: IRIS Core delivery adapter, `iris.deliver` outbox consumer, config validation, delivery DTO privacy, retry/DLQ behavior, and runbook/docs.

Test command: corepack pnpm test: pass, 11 test files, 67 passed, 6 skipped.

What the test covers: IRIS delivery success paths, idempotency, timeout/5xx retry, 401/403 DLQ, wallet/secret exclusion, outbox complete/fail integration, and safe reaction payload wording.

Edge cases: duplicate delivery jobs, terminal auth errors, transient HTTP failures, local forge unavailable with GitHub contracts CI fallback.

Failure paths: 401/403 are terminal DLQ failures; timeout and 5xx remain retryable through outbox backoff; delivery status changes to retrying or failed before the outbox moves forward.

Reason if no test: official YouTube connector, multiple IRIS Core routing, production credential storage, multi-chain support, and multi-token support are intentionally out of scope.

## Testing and review

Tests or checks run: corepack pnpm install pass; corepack pnpm lint pass; corepack pnpm typecheck pass; corepack pnpm test pass, 11 test files, 67 passed, 6 skipped; npm test pass, 11 test files, 67 passed, 6 skipped; local forge unavailable; security scans run.

Review focus: payload privacy, idempotency key construction, HTTP auth/signature boundary, retry/DLQ classification, and no production secret commit.

Project-owner manual review required before merge: quality-gate status, CI status, head SHA, remaining blockers, merge decision.

## Security Boundaries

This PR does not add production IRIS Core secrets. `.env.example` uses placeholders only. Wallet addresses, secrets, raw names, raw messages, YouTube IDs, and wallet labels are excluded from IRIS Core delivery payloads.

YouTube Super Chat payment is not replaced. IRIS Token Tip is not represented as YouTube Super Chat. No token sale, exchange, cash-out, custody, internal balance, investment wording, speculative reward, or YouTube scraping is implemented.

## Known gaps

Official YouTube connector, multiple IRIS Core environment routing, production credential rotation automation, multi-chain support, multi-token support, and overlay token rotation remain follow-up work.


