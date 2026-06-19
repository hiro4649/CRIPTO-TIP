# Summary

Preserve safe YouTube currency metadata through `support.received` normalization and repository persistence.

PR profile: product_r3
Task mode: feature

## Task Contract

Goal: improve support event data fidelity by carrying safe currency metadata instead of losing it or replacing it with the support source.

Allowed scope: shared support schema metadata, YouTube Super Chat/Super Sticker normalization, Postgres repository persistence mapping, focused tests, docs, and machine-readable evidence.

Forbidden scope: real YouTube API, real OAuth token, real DB connection, DB driver dependency, package.json change, pnpm-lock change, contracts change, migrations change, real RPC, wallet/RPC/deploy changes, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, owner approval, GitHub approval review, or merge authority.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: Super Chat currency is retained; Super Sticker currency is retained; Token Tip does not invent currency metadata; Postgres persistence uses safe currency metadata when present; no package, lockfile, real network, real DB, readiness, legal, or policy claim is introduced.

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

- `corepack pnpm vitest run packages/shared/src/index.test.ts apps/api/src/repositories/postgres.test.ts`: pass required before PR

Product verification:

Focused local verification must cover shared normalization and repository persistence without live DB execution. Full repository verification and same-head GitHub checks are required before merge.

## Test Coverage Evidence

New tests cover safe currency metadata preservation and the regression where Postgres used support source as currency metadata.

## Security Boundaries

- No package.json or pnpm-lock change.
- No DB driver dependency is added.
- No real DB connection is used.
- No real YouTube API or OAuth token is used.
- No RPC, wallet, deploy, contracts, or migrations changes.
- No token sale, exchange, cash-out, custody, internal balance, investment wording, or speculative reward is introduced.
- No runtime, production, legal, or YouTube policy readiness is claimed.

## Residual risks

- This is safe metadata fidelity only.
- Public mock truthfulness, runtime repository selection, and controlled YouTube canary authorization remain follow-up work.

## Human Confirmation

- AI review is not human approval.
- This PR must not be merged until same-head required checks pass after PR creation.
