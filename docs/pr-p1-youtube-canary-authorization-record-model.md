PR profile: security_r3
Risk level: R3
Task mode: feature

## Goal

Add a pure non-executable YouTube canary authorization record model that can
reference a safe authorization bundle hash and safe audit receipt hash without
adding persistence, routes, or execution behavior.

## Risk level

R3 security-sensitive model change because the schema describes authorization
record state. It must not imply owner approval, persistence, network execution,
OAuth execution, secret access, or readiness.

## Security impact

The model is strict and safe-reference-only. It rejects unknown fields and does
not include owner identity, raw approval text, credential values, token values,
URLs, channel IDs, live stream IDs, wallet addresses, database URLs, IP
addresses, user agents, or raw request bodies.

## Validation commands

- `corepack pnpm vitest run apps/api/src/youtube-live-chat-canary-authorization-record.test.ts`
- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm test`
- `corepack pnpm evidence:ci`
- `corepack pnpm quality:self-protection`
- `node scripts/codex-secret-safety-scan.mjs`

## Product verification

Repository checks are the applicable verification for this pure model. No route,
repository, DB, migration, network, OAuth, secret manager, YouTube API, wallet,
RPC, deployment, or readiness verification is performed.

## Tests or checks run

Focused model test and typecheck passed locally before PR creation. Full checks
are required on the PR head before merge.

## Testing and review

The review oracle is the strict schema, evaluator priority order, injected clock
expiry behavior, forbidden raw field rejection, and non-executable output flags.

## Best of N Evidence

Candidates: A pure non-executable model; B immediate DB persistence; C store raw
owner or credential references.

Selected candidate: A.

Reason selected: A creates a safe contract for later owner-scoped persistence
without introducing retention, deletion, migration, access-control, or secret
handling scope.

Rejected alternatives: B is premature persistence scope. C violates secret and
privacy boundaries.

## Test Coverage Evidence

Changed area: YouTube canary authorization record schema and evaluator.

Test command: `corepack pnpm vitest run apps/api/src/youtube-live-chat-canary-authorization-record.test.ts`.

What the test covers: valid draft, recorded_non_executable, revoked priority,
expired evaluation with injected clock, temporal validation, hash validation,
forbidden unknown raw fields, missing references, and non-executable flags.

Edge cases: revoked beats expired; expires_at must be after created_at; revoked
records require revoked_at; non-revoked records reject revoked_at; all statuses
keep network/OAuth/secret/real API false and persistence not implemented.

## Security Boundaries

No package.json change. No pnpm-lock change. No workflow change. No contracts
change. No migrations. No route addition. No server change. No repository
interface change. No DB schema. No real DB. No real YouTube OAuth. No real
network request. No secret manager access. No wallet/RPC/deploy change. No
runtime readiness, production readiness, legal compliance, or YouTube policy
compliance claim.

## Residual risks

This PR does not persist authorization records. Persistence, retention,
deletion, owner approval capture, and admin mutation routes remain separate
owner-scoped work.

## Human confirmation needed

AI technical review is not human approval. This PR does not create owner
approval, GitHub approval review, merge authority, release authority, deploy
authority, runtime readiness, production readiness, legal compliance, or
YouTube policy compliance.
