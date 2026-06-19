# Summary

Canonicalize owner authorization evaluation while keeping YouTube canary execution forbidden and admin preflight routes read-only.

PR profile: security_r3
Risk level: R3
Task mode: feature

## Task Contract

Goal: add a single owner-authorization source of truth for YouTube canary preflight and project it into read-only admin routes, legacy controlled-canary output, and real connector readiness output.

Allowed scope: canonical authorization evaluator, read-only admin preflight routes, legacy projection, readiness projection, tests, `.codex` evidence, and PR evidence docs.

Forbidden scope: package or lockfile change, DB driver dependency, real DB, migration, contracts, workflow change, real network, real YouTube API, OAuth execution, secret access, wallet/RPC/deploy, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, owner approval, GitHub approval review, or merge authority.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: 8f6087920b7ecdd30d2c640926f15ca1f49459f3

CI run: metadata_limited

Quality-gate run: metadata_limited

Quality-gate artifact: metadata_limited

Tests: 120 test files, 2103 passed, 6 skipped

## Goal

Separate canonical authorization evaluation from compatibility projections so legacy status labels cannot infer owner-only credential fields, test stream fields, or execution readiness.

## Risk level

R3 security-sensitive product change. The risk is accidental readiness wording, owner field inference, unsafe input echo, or side-effect enablement.

## Security impact

Security oracle covers the canonical evaluator, controlled canary projection, real readiness projection, admin routes, route dependencies, and server route registration.

Security oracle assertions: authentication boundary tested, untrusted input tested, negative paths tested, unsafe input no-echo tested, authority creation blocked, network execution blocked, OAuth execution blocked, secret access blocked, and runtime execution blocked.

## Validation commands

Product verification commands:

- `corepack pnpm vitest run apps/api/src/youtube-live-chat-canary-authorization-gate.test.ts apps/api/src/p1-admin-youtube-controlled-canary-preflight.test.ts apps/api/src/p1-admin-youtube-real-connector-readiness-gate.test.ts apps/api/src/p1-youtube-live-chat-preflight-contract-hardening.test.ts apps/api/src/p1-api-admin-youtube-connector-routes.test.ts apps/api/src/p1-youtube-live-chat-network-disabled-e2e.test.ts`: pass
- `corepack pnpm lint`: pass
- `corepack pnpm typecheck`: pass
- `corepack pnpm test`: pass
- `npm test`: pass
- `corepack pnpm evidence:ci`: pass
- `corepack pnpm quality:self-protection`: pass
- `node scripts/codex-secret-safety-scan.mjs`: pass

## Product verification

Remote product evidence is expected from the same-head CI artifact. Local product verification passed with focused route/evaluator tests, full repo tests, lint, typecheck, evidence checks, self-protection, and secret scan.

## Tests or checks run

Focused tests cover canonical evaluation, admin authorization preflight, real connector readiness projection, contract hardening, admin route behavior, and network-disabled E2E boundaries.

Full repository tests passed: 120 files, 2103 passed, 6 skipped.

## Testing and review

The review oracle is the canonical evaluator plus route-level tests and compatibility projections. No real YouTube canary, OAuth, network call, secret read, or runtime readiness execution is performed.

## Best of N Evidence

Candidate count: 3

Candidates: A canonical authorization evaluator plus legacy and readiness projections; B legacy preflight extension only; C independent third evaluator.

Selected candidate: A

Reason selected: A creates one owner-authorization source of truth and reduces readiness taxonomy drift while preserving the network-disabled boundary.

Rejected alternatives: B rejected for readiness taxonomy drift; C rejected for evaluator drift.

## Test Coverage Evidence

Changed area: canonical authorization evaluator, legacy preflight projection, real readiness projection, read-only admin preflight routes, and network-disabled E2E guard.

Test command: `corepack pnpm test`.

What the test covers: committed GET trust, POST preview trust, execution-forbidden complete preview, legacy compatibility output, real readiness network blocking, unknown field rejection, unsafe value rejection, execution flag rejection, first canary limit rejection, and side-effect rejection.

Edge cases: owner-only credential refs are not inferred, unsafe preview values are not echoed, readiness output does not emit controlled-canary candidate wording, POST preview does not mutate GET committed output, and network/OAuth/secret/runtime execution remain blocked.

## Security Boundaries

Admin authorization is required on all routes. POST preview input is untrusted. GET committed bundle input is safe committed evidence. POST does not persist state or mutate default GET output. Side effects and execution flags remain false.

## Residual risks

This PR still does not run a real YouTube canary. Real credential provider, OAuth execution, network authorization, and YouTube API calls remain future owner-scoped work. Remote same-head checks and safe artifact refresh are required after push.

## Human confirmation needed

AI review is not human/project-owner approval. AI review is not GitHub approval review. This PR does not create owner approval record or merge authority.
