# DB Driver Final Approval Requirements

The final approval gate requires all of the following before a future DB driver dependency PR can
claim `approved_for_dependency_pr`.

## Required Approval

- Owner approval status is `approved`.
- Owner approval fingerprint is valid.
- Selected driver is present and consistent across all final-gate inputs.
- Target branch, target commit, base commit, repository, and PR number match across all inputs.

## Required Reviews

- License review: `pass`
- Supply-chain review: `pass`
- Security advisory review: `pass`
- Version pinning review: `pass`
- Lockfile review: `pass`
- Package diff review: `pass`
- Secret boundary review: `pass`

## Required Boundaries

- Package change is explicitly approved.
- Lockfile change is explicitly approved.
- Real database connection remains unapproved unless a later scoped owner gate authorizes it.
- Live DB integration tests remain unapproved unless a later scoped owner gate authorizes them.
- Migration apply remains unapproved unless a later scoped owner gate authorizes it.
- Provider SDK apply, production deployment, runtime readiness, production readiness, legal compliance, and YouTube policy compliance claims remain forbidden.

## Current PR Scope

This PR only adds the final approval gate, tests, safe evidence, and documentation. It intentionally
does not introduce a DB driver dependency or any runtime database behavior.

The future complete fixture in tests is non-operational test data. Copying that
fixture into `.codex` evidence is forbidden. An actual dependency PR must
regenerate evidence bound to the exact target commit and project-owner approval
record for that PR.

## Future Dependency PR Evidence

The final approval gate is necessary but not sufficient for dependency introduction. A future dependency PR must also attach package diff evidence, lockfile review evidence, license review, supply-chain review, security advisory review, version pinning, and secret boundary evidence as defined by the DB driver dependency PR template contract.
