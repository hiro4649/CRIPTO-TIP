# DB Driver Candidate Review Freshness

This document defines the DB driver candidate review freshness gate for v1.1.8
preparation. The gate prevents stale review evidence from being reused. It does
not select a driver, add a dependency, change package files, connect to a real
database, execute migrations, run live DB integration tests, apply provider SDK
actions, or claim runtime, production, legal, or YouTube policy readiness.

Machine-readable evidence lives in
`.codex/db-driver-candidate-review-freshness.json` and is validated by
`apps/api/src/db-driver-candidate-review-freshness.ts`.

## Current State

- `freshnessStatus`: `not_ready`
- `reviewPackStatus`: `not_ready`
- `driverChoiceStatus`: `not_selected`
- `selectedDriver`: `null`
- `candidateDrivers`: `pg`, `postgres`
- `licenseReviewFreshnessStatus`: `not_reviewed`
- `supplyChainReviewFreshnessStatus`: `not_reviewed`
- `securityAdvisoryFreshnessStatus`: `not_reviewed`
- `packageMetadataFreshnessStatus`: `not_reviewed`
- `versionPolicyFreshnessStatus`: `not_selected`
- `packageDiffFreshnessStatus`: `missing`
- `lockfileFreshnessStatus`: `missing`
- `secretBoundaryFreshnessStatus`: `not_reviewed`
- `refreshRequired`: `true`

`not_ready` means the evidence must be refreshed before any future dependency
review can use it. It is not an approval record and does not authorize package
or lockfile changes.

Review freshness status meanings:

- `not_reviewed`: the review has not been performed.
- `not_ready`: the candidate review cannot be used for selection.
- `fresh`: verified evidence for a future owner-approved dependency PR only.
- `stale`: expired or invalidated evidence; selection remains forbidden.
- `invalid`: malformed or unsafe evidence; selection remains forbidden.

The current PR must not commit `fresh`, `stale`, or `invalid` review evidence.
Future fresh fixtures are non-operational test data only. Copying a future
fresh fixture into `.codex` evidence is forbidden. Committed evidence must
remain `not_ready` until a separate owner-approved DB driver dependency PR.

## Candidate Freshness

Each candidate has a freshness entry:

- `driverName`
- `packageName`
- `candidateStatus`
- `lastReviewedAt`
- `expiresAt`
- `freshnessStatus`
- `refreshRequired`
- `refreshReasons`
- `safeSummary`

For the current committed evidence, `pg` and `postgres` remain
`candidateStatus: candidate`, `freshnessStatus: not_ready`, `refreshRequired:
true`, and both timestamp fields are `null`.

## Boundary

The freshness gate blocks stale evidence use. It does not make a driver
available for dependency work. Future driver selection still requires separate
project-owner approval, package diff review, lockfile review, and final approval
gate evidence.
