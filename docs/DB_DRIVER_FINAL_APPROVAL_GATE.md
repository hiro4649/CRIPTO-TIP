# DB Driver Final Approval Gate

This gate prepares the final owner approval boundary for a future DB driver dependency PR.
It does not add a DB driver, change `package.json`, change `pnpm-lock.yaml`, open a real
database connection, apply migrations, or run live DB integration tests.

## Required Inputs

- Owner approval record
- DB driver readiness report
- Preflight policy record
- Approval dry-run evidence
- Review evidence for license, supply chain, advisories, version pinning, lockfile, package diff, and secret boundary

## Committed State

The committed `.codex/db-driver-final-approval-gate.json` is intentionally blocked:

- `gate_status`: `blocked`
- `selected_driver`: `null`
- `owner_approval_status`: `not_approved`
- `readiness_report_status`: `not_ready`
- `approval_dry_run_status`: `not_ready`
- all package, lockfile, real DB, migration, provider SDK, production, readiness, legal, and YouTube policy permission flags: `false`

## Future Approval Boundary

A future dependency PR may reach `approved_for_dependency_pr` only when a testable owner-approved
record, readiness report, preflight policy, approval dry-run, and all required reviews are complete
and safe. That approval still does not authorize production readiness, legal compliance, YouTube
policy compliance, provider SDK apply, production deployment, or live database execution.

## Safety Rules

The final gate rejects unsafe evidence, including raw GitHub logs, raw provider responses, DB
connection strings, private URLs, wallet addresses, and token-like values. The committed evidence is
not a secret store and must contain safe summaries only.
