# H0 v1.2.7 Post-Check Evidence Closure

This H0 repair keeps required-check evidence from being generated inside a
required check while that check is still in progress. Required-check metadata is
now produced by a separate `required-check-evidence` job after `quality-gate`.

The repair does not change product runtime behavior, package dependencies,
contracts, migrations, DB wiring, YouTube wiring, wallet/RPC code, or readiness
claims.

## Evidence Rule

Required-check evidence passes only when:

- target head SHA is a valid exact 40-character SHA.
- head provenance is `commit_check_runs_api` or `fixture_exact_head`.
- artifact generation phase is `post_required_checks`.
- `quality-gate`, `typescript`, and `contracts` are present on the same head.
- each required check is the latest same-head check by workflow creation time,
  run attempt, started time, then completed time.
- each required check is completed with success.
- check run ID, workflow run ID, and positive run attempt are present.

Running checks remain pending. Failed latest checks remain failed. Older success
does not override a newer running or failed check.
