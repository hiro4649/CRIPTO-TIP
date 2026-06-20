PR profile: security_r3
Risk level: R3
Task mode: bugfix

## Goal

Fix YouTube canary preview truthfulness by removing historical fixed
`evaluated_at` defaults from runtime paths and adding a non-persistent safe audit
receipt derived from each authorization evaluation.

## Risk level

R3 security-sensitive product boundary change. The affected surface is the
admin YouTube canary preflight evaluation response. No real YouTube, OAuth,
network, secret, DB, wallet, RPC, or deployment behavior is enabled.

## Bugfix evidence

Reproduced: reproduced

Root cause: identified. Runtime evaluation paths could emit historical fixed
timestamps, and preview responses had top-level truthfulness fields but no
single safe receipt projection stating that the evaluation was non-persistent
and not retrievable as an audit record.

Verification: pass. Focused tests cover injected clocks, receipt projection,
receipt hash stability, non-persistence flags, and admin route GET/POST
truthfulness.

## Security impact

The audit receipt is safe metadata only. It is not an owner approval, GitHub
approval review, authorization record, server audit log, signature, or merge
authority. It excludes raw request bodies, credential values, owner identity,
URLs, channel IDs, live stream IDs, wallet addresses, database URLs, IP
addresses, user agents, and repository state.

## Validation commands

- `corepack pnpm vitest run apps/api/src/youtube-live-chat-canary-audit-receipt.test.ts apps/api/src/youtube-live-chat-canary-authorization-gate.test.ts apps/api/src/p1-admin-youtube-controlled-canary-preflight.test.ts`
- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm test`
- `corepack pnpm evidence:ci`
- `corepack pnpm quality:self-protection`
- `node scripts/codex-secret-safety-scan.mjs`

## Product verification

Repository checks and package verification are the applicable verification for
this offline safe-evaluation change. No real YouTube operation, OAuth token,
external API call, real RPC, real DB, production deployment, or readiness
verification is performed.

## Tests or checks run

Focused tests, lint, typecheck, full test, evidence:ci, quality self-protection,
and secret scan passed locally before PR creation.

## Testing and review

The review oracle is the canonical evaluator, the safe receipt builder, route
clock injection, route-level GET/POST behavior, and forbidden side-effect
assertions.

## Best of N Evidence

Candidates: A derive a non-persistent safe audit receipt from the canonical
evaluation and inject request clocks; B add a nested audit envelope that
duplicates existing fields; C persist every preview into repository audit logs.

Selected candidate: A.

Reason selected: A fixes false evaluation time and adds a safe correlation
contract without duplicating authorization logic or introducing persistence.

Rejected alternatives: B creates drift risk. C widens scope into persistence,
retention, deletion, and authorization-record semantics.

## Test Coverage Evidence

Changed area: clock injection, audit receipt projection, admin route response
truthfulness, and safe receipt hashing.

Test command: `corepack pnpm vitest run apps/api/src/youtube-live-chat-canary-audit-receipt.test.ts apps/api/src/youtube-live-chat-canary-authorization-gate.test.ts apps/api/src/p1-admin-youtube-controlled-canary-preflight.test.ts`.

What the test covers: committed evaluation receipt, preview evaluation receipt,
safe receipt hash determinism, evaluated_at hash drift, injected route clock,
non-persistence flags, and no mutation of committed GET output.

Edge cases: complete POST preview remains non-persistent; receipt is not
retrievable; unsafe input is rejected without echo; historical fixed runtime
dates are removed; execution, network, OAuth, secret access, and real API
execution remain false.

## Security Boundaries

No package.json change. No pnpm-lock change. No workflow change. No contracts
change. No migrations. No repository interface change. No DB schema change. No
real DB. No real YouTube OAuth. No real network request. No secret manager
access. No wallet/RPC/deploy change. No runtime readiness, production readiness,
legal compliance, or YouTube policy compliance claim.

## Residual risks

This PR does not implement persistent authorization records or server audit log
retrieval. Those remain separate owner-scoped work.

## Human confirmation needed

AI technical review is not human approval. This PR does not create owner
approval, GitHub approval review, merge authority, release authority, deploy
authority, runtime readiness, production readiness, legal compliance, or
YouTube policy compliance.
