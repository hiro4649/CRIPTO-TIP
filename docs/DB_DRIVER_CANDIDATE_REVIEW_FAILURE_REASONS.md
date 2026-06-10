# DB Driver Candidate Review Failure Reasons

The current review pack is invalid if any of these conditions are present:

- `selectedDriver` is not `null`.
- `driverChoiceStatus` is `selected`.
- `reviewPackStatus` is `ready_for_owner_review`.
- `candidateDrivers` is not exactly `pg`, `postgres`.
- A candidate review is missing, duplicated, or uses an extra package.
- A candidate review claims approval, selection, readiness, or compliance.
- Any review status is `pass`.
- Owner approval is `approved`.
- Final approval gate is `approved_for_dependency_pr`.
- Any package, lockfile, dependency, DB connection, migration, live integration,
  provider apply, deployment, or readiness permission flag is true.
- Evidence includes raw logs, raw provider output, secrets, token-like values,
  wallet addresses, private URLs, or DB connection strings.

These failures are merge blockers for this review-pack PR.

