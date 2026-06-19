# feat: add youtube canary authorization preflight gate

## Summary

Adds a canonical YouTube controlled-canary authorization preflight gate.

The new gate is the single source of truth for authorization preview evaluation,
typed blocker codes, stable safe hashing, legacy controlled-canary preflight
projection, and real connector readiness projection.

## Task Contract

This PR implements the P1 YouTube canary authorization preflight gate for
Harness v1.2.7.

It does not execute OAuth, read secrets, call YouTube, enable network access,
or create owner approval.

It does not change product runtime execution behavior beyond adding read-only
admin preview evaluation routes and shared preflight evaluation logic.

## Evidence Integrity

Local head before commit: `d516c603f63c8512d2b96a46444bb215d88db0fc`

Base SHA before PR creation: `d516c603f63c8512d2b96a46444bb215d88db0fc`

Local verification status:

- focused canary authorization tests: pass
- lint: pass
- typecheck: pass
- full test: pass
- npm test: pass
- evidence placeholder check: pass
- evidence freshness validation: pass
- quality-gate self-protection: pass
- secret safety scan: pass

Current recorded test summary:

- 120 test files
- 2097 passed
- 6 skipped

GitHub same-head CI, quality-gate run, and artifact metadata must be refreshed
on the opened PR before merge.

## Test Coverage Evidence

The added and updated tests cover:

- default canonical bundle is awaiting owner authorization
- complete preview is accepted while execution remains forbidden
- unknown fields are rejected
- unsafe-looking values are rejected without echoing raw values
- execution flags set to true are rejected
- side effects set to true are rejected
- first-canary limits above bounds are rejected
- stable hash is key-order independent and independent of `evaluated_at`
- legacy preflight delegates to canonical evaluation
- real readiness delegates to canonical evaluation
- canonical GET/POST admin routes preserve auth and safe validation
- POST preview input does not mutate GET defaults
- runtime authorization path does not read `.codex` or docs

## Security Boundaries

- no package.json change
- no pnpm-lock change
- no workflow change
- no contracts change
- no migrations change
- no DB driver dependency
- no real DB connection
- no YouTube network execution
- no OAuth execution
- no secret access
- no wallet/RPC/deploy change
- no runtime readiness claim
- no production readiness claim
- no legal compliance claim
- no YouTube policy compliance claim
- no owner approval created
- no GitHub approval review created
- no merge authority created

## Residual Risks

This PR still does not run a real YouTube canary. It only makes the
authorization preview contract deterministic and shared by the legacy preflight
and real readiness gates.

The next product step still requires explicit owner scope before any real
credential provider, network authorization record, OAuth execution, or YouTube
API call is introduced.

## Human Confirmation

AI review can recommend merge after current-head checks and evidence pass.

This is not human/project-owner approval.

This is not GitHub approval review.

This does not create owner approval record.

This does not create merge authority.
