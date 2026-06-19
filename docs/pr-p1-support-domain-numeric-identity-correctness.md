# Summary

Fix support-domain numeric and source identity boundaries by moving positive amount, YouTube micros, currency, and source event ID validation into shared schemas.

PR profile: product_r3
Task mode: bugfix

## Task Contract

Goal: reject ambiguous support amount and source identity values before they are normalized into `support.received`.

Allowed scope: shared support schemas, YouTube Super Chat fixture normalizer schema reuse, focused tests, docs, and machine-readable evidence.

Forbidden scope: real YouTube API, real OAuth token, real DB connection, DB driver dependency, package.json change, pnpm-lock change, contracts change, migrations change, real RPC, wallet/RPC/deploy changes, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, owner approval, GitHub approval review, or merge authority.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: positive decimal amount schema exists; YouTube amount micros schema rejects zero, leading-zero, decimal, and exponent values; currency schema rejects lowercase or malformed codes; source event IDs are non-empty; fixture normalizer reuses shared schemas; no package, lockfile, real network, real DB, readiness, legal, or policy claim is introduced.

## Evidence Integrity

Head SHA: pre_pr_local

Base SHA: pre_pr_local

Product CI: requires PR creation

Quality-gate: requires PR creation

CI run: requires PR creation

Quality-gate run: requires PR creation

Quality-gate artifact: requires PR creation

Raw GitHub logs read: false

## Testing and review

- `corepack pnpm vitest run packages/shared/src/index.test.ts apps/api/src/p0-youtube-superchat-fixture-normalizer.test.ts`: pass
- `corepack pnpm typecheck`: pass

Product verification:

Focused local verification was run for shared schema correctness and the local Super Chat fixture normalizer. Full repository verification and same-head GitHub checks are required before merge.

## Test Coverage Evidence

New tests reject ambiguous YouTube amount micros, malformed currency codes, empty source event IDs, and ambiguous token tip amount raw values.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver dependency is added.
- No real DB connection is used.
- No real YouTube API or OAuth token is used.
- No RPC, wallet, deploy, contracts, or migrations changes.
- No token sale, exchange, cash-out, custody, internal balance, investment wording, or speculative reward is introduced.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is schema correctness only.
- Data fidelity expansion, public mock truthfulness, runtime repository selection, and controlled YouTube canary authorization remain follow-up work.

## Human Confirmation

- AI review is not human approval.
- This PR must not be merged until same-head required checks pass after PR creation.
