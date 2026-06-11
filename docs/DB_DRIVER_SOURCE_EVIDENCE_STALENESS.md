# DB Driver Source Evidence Staleness

This policy prepares future DB driver source evidence review for v1.1.8. It is
not advisory review approval, DB driver selection, owner approval, dependency
approval, runtime readiness, production readiness, legal compliance, or YouTube
policy compliance.

Committed evidence for this PR must remain `policy_ready` and `not_reviewed`.
The policy only defines when future source evidence becomes stale and must be
revalidated.

The current PR keeps:

- `driverChoiceStatus: not_selected`
- `selectedDriver: null`
- `candidateDrivers: ["pg", "postgres"]`
- `sourceEvidenceStatus: not_reviewed`
- `knownBlockers: null`
- all package, lockfile, dependency, DB, migration, provider apply, production
  apply, runtime readiness, production readiness, legal compliance, and YouTube
  policy permission flags as `false`

Stale or missing source evidence cannot support driver selection. Future DB
driver dependency work must bind fresh safe summaries to the exact PR number,
target branch, target commit, base commit, package name, package version, source
category, checked timestamp, and expiry timestamp.
