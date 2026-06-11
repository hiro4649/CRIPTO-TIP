# DB Driver Advisory Review Envelope

This document defines the future DB driver security advisory review envelope.
It is a review contract only. It does not select a driver, add a dependency,
change package files, connect to a database, run migrations, execute live DB
integration tests, or claim runtime, production, legal, or YouTube policy
readiness.

## Current Status

Committed advisory envelope evidence must remain:

- `advisoryEnvelopeStatus`: `not_reviewed`
- `driverChoiceStatus`: `not_selected`
- `selectedDriver`: `null`
- `candidateDrivers`: `pg`, `postgres`
- `cveReviewStatus`: `not_reviewed`
- `securityAdvisoryReviewStatus`: `not_reviewed`
- `packageAuditReviewStatus`: `not_reviewed`
- `knownBlockersStatus`: `not_reviewed`
- `knownBlockers`: `null`
- `rawOutputPolicyStatus`: `safe_summary_only`
- `advisorySourcePolicyStatus`: `not_reviewed`
- `freshnessStatus`: `not_ready`

`knownBlockers: null` means the blockers have not been reviewed. It is not
evidence that no blockers exist. This PR must not commit `knownBlockers: []`
because an empty list could be mistaken for a clean advisory result.

## Candidate Reviews

Each candidate advisory review records the shape of a future review for `pg`
and `postgres`. Current candidate review entries remain `not_reviewed`,
`knownBlockers: null`, `lastReviewedAt: null`, `expiresAt: null`, and
`refreshRequired: true`.

Future dependency work may only use `knownBlockers: []` after a separate
owner-approved review has safe-summary source evidence and advisory status
`pass`. That future status is not committed here.

## Non-Goals

- No DB driver selection.
- No package or lockfile change.
- No DB driver dependency.
- No real DB connection.
- No migration execution.
- No live DB integration test execution.
- No raw advisory, raw audit, raw terminal, raw dependency tree, or raw GitHub
  log evidence.
