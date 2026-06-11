# DB Driver Advisory Source Policy

This document defines the DB driver advisory source policy envelope for a future
DB driver dependency PR. It does not review an advisory source, select a driver,
add a dependency, change `package.json`, change `pnpm-lock.yaml`, connect to a
real DB, execute migrations, or claim runtime, production, legal, or YouTube
policy readiness.

Current committed source policy status is `not_reviewed`. The policy only
defines which source categories may be used later, how those sources must bind
to a target package and commit, and what safe-summary output is allowed.

Required current state:

- `sourcePolicyStatus`: `not_reviewed`
- `driverChoiceStatus`: `not_selected`
- `selectedDriver`: `null`
- `candidateDrivers`: `pg`, `postgres`
- `sourceBindingStatus`: `not_reviewed`
- `sourceTimestampStatus`: `not_reviewed`
- `sourceFreshnessStatus`: `not_reviewed`
- `safeSummaryPolicyStatus`: `safe_summary_only`
- `rawOutputPolicyStatus`: `raw_output_forbidden`
- `knownBlockersStatus`: `not_reviewed`
- `knownBlockers`: `null`

The current PR must not store reviewed advisory source evidence, advisory pass
evidence, raw advisory output, raw audit output, OSV raw responses, Snyk raw
responses, raw dependency trees, terminal output, private URLs, DB connection
strings, wallet addresses, token-like values, approved owner records, approved
final gate records, or selected driver state.

