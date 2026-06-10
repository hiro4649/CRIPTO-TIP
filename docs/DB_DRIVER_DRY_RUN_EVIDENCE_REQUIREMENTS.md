# DB Driver Dry-Run Evidence Requirements

A future DB driver approval dry-run can pass only when every safe evidence class is present:

- Project-owner approval record with valid fingerprint, target branch, PR number, target commit, base commit, expiry, and scope.
- DB driver preflight policy evidence that includes the candidate set and does not select a driver prematurely.
- Package diff review evidence with safe summary only.
- Lockfile review evidence with safe summary only.
- License review evidence with source checked, without legal compliance claims.
- Supply-chain review evidence covering maintainer, release cadence, transitive dependency, install script, and provenance review.
- Security advisory review evidence covering advisories, CVEs, audit result, and known blockers.
- Version pinning evidence using an exact or approved range policy.
- Secret boundary evidence using secret manager references only.

The dry-run fails if it detects package or lockfile changes without approval, real DB connection, migration execution, provider SDK apply, production deployment, runtime readiness claim, production readiness claim, legal compliance claim, YouTube policy compliance claim, raw log reference, or unsafe evidence values.

Current committed evidence remains incomplete by design: no selected driver, no approved owner record, no package change, no lockfile change, no real DB connection, and no readiness claim.

## Current Committed Evidence Requirements

Committed evidence requirements:

- `dryRunStatus` must remain `not_ready`.
- `selectedDriver` must remain `null`.
- `ownerApprovalRecordStatus` must remain `not_approved`.
- Review statuses for license, supply-chain, advisory, version pinning, lockfile, package diff, and secret boundary must remain `missing`.
- Package, lockfile, real DB, migration, provider SDK apply, production deployment, readiness, legal compliance, and YouTube policy claim detection flags must remain `false`.

Test-only fixture requirements:

- A pass fixture may exist only inside unit tests.
- The fixture must use fake review evidence and fake owner approval.
- The fixture must not be committed as current `.codex` evidence.

No pass status, selected driver, or approved owner record is allowed in committed evidence for this PR.
