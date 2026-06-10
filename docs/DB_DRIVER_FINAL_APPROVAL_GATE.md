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

`ready_for_owner_review` is a future computed state only. `approved_for_dependency_pr`
is also a future computed state only. Committed `.codex` evidence for PR #50 must
remain `blocked`; AI review does not move the gate to `ready_for_owner_review`.
Human project-owner approval still requires a separate PR.

## Future Approval Boundary

A future dependency PR may reach `approved_for_dependency_pr` only when a testable owner-approved
record, readiness report, preflight policy, approval dry-run, and all required reviews are complete
and safe. That approval still does not authorize production readiness, legal compliance, YouTube
policy compliance, provider SDK apply, production deployment, or live database execution.

The selected driver must be present and consistent in all final-approval sources:
owner approval, preflight policy, approval dry-run, and readiness report. A driver
appearing in only one source, or disagreeing across sources, keeps the final gate
blocked.

`preflight_policy_status: pass` only means the preflight record is internally
consistent. It does not mean the driver dependency is approved. Final approval
still requires owner approval, readiness report, approval dry-run, and complete
review evidence.

For the current PR, package and lockfile changes are forbidden and absent. In a
future dependency PR, package and lockfile changes remain blocked until owner
approval and review evidence pass.

## Safety Rules

The final gate rejects unsafe evidence, including raw GitHub logs, raw provider responses, DB
connection strings, private URLs, wallet addresses, and token-like values. The committed evidence is
not a secret store and must contain safe summaries only.
