# DB Driver Advisory Binding Evidence

Future DB driver advisory binding evidence must be a safe summary. Raw source
payloads are not evidence in this repository.

Required future binding fields:

- source category from the allowed category set
- source checked timestamp
- source expiry timestamp
- target commit SHA
- PR number
- target branch
- package name
- exact package version
- candidate driver
- safe summary
- known blockers review status

The evidence must bind to the exact dependency PR head and package version. A
binding collected for a different commit, PR, branch, package, or version is
stale and must be rejected.

Current evidence intentionally keeps `knownBlockers` as `null`. An empty array
is allowed only in a test-only future reviewed fixture or in a later
owner-approved advisory review scope.
