# DB Driver Candidate Review Refresh Policy

The candidate review freshness gate requires refresh when any evidence source
can no longer be trusted for a future dependency decision.

## Refresh Triggers

- target commit changes
- candidate package version changes
- package metadata changes
- security advisory changes
- maintainer ownership changes
- transitive dependency changes
- install script changes
- new security advisory
- dependency graph changes
- package.json changes
- lockfile changes
- pnpm-lock changes
- review evidence older than the expiry window
- owner approval target mismatch
- selected or recommended wording in committed evidence
- selection wording in committed evidence
- runtime, production, legal, or YouTube policy readiness wording in committed
  evidence

## Current Missing Review Reasons

The current evidence keeps `refreshRequired: true` and records these reasons:

- `license_review_missing`
- `supply_chain_review_missing`
- `security_advisory_review_missing`
- `package_metadata_not_reviewed`
- `version_policy_not_selected`
- `package_diff_missing`
- `lockfile_review_missing`
- `secret_boundary_not_reviewed`

These reasons are blockers. They are not a selection checklist and do not grant
permission to install a DB driver.

## Advisory Envelope Refresh Boundary

Advisory envelope evidence with CVE, security advisory, package audit, or known blockers status `not_reviewed` remains missing review evidence. It must be refreshed in a future safe-summary advisory review before dependency work can proceed.
