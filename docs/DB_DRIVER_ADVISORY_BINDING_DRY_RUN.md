# DB Driver Advisory Binding Dry Run

This dry-run prepares future DB driver advisory source binding validation for
v1.1.8 prep work. It does not select a driver, install a dependency, change
package files, connect to a real DB, execute migrations, or claim runtime or
production readiness.

Current committed evidence remains `not_reviewed`. The dry-run validator only
defines the evidence shape and rejects unsafe or stale binding claims.

Future binding fixture is non-operational test data. It is not advisory review
approval, owner approval, DB driver selection, or dependency approval.
Committed evidence must remain `not_reviewed`.

The test-only future fixture proves the validator can require:

## Source Evidence Staleness Link

Source evidence staleness policy is tracked separately in
`docs/DB_DRIVER_SOURCE_EVIDENCE_STALENESS.md`. That policy can make future
source evidence stale, but it does not review or approve the current binding.

- exact target commit binding
- exact PR number binding
- exact target branch binding
- exact package name and package version binding
- allowed source category binding
- ISO UTC source timestamps
- bounded freshness
- safe summary only
- no raw advisory, audit, OSV, npm registry, dependency tree, terminal, or log
  output

Future reviewed source binding evidence must be introduced in a separate
owner-approved dependency PR. This PR records no reviewed advisory source and no
approved final gate.
