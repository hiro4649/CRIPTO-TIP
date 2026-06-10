# DB Driver Dependency Evidence Contract

`.codex/db-driver-dependency-pr-template.json` is the machine-readable contract for the future DB driver dependency PR shape.

## Current PR Contract

Current committed evidence is allowed to be `template_ready` only when:

- no selected driver exists
- owner approval remains `not_approved`
- final approval gate remains `blocked`
- package diff evidence is missing
- lockfile review evidence is missing
- license, supply-chain, security advisory, version pinning, and secret boundary reviews are missing
- `packageJsonChangeAllowed`, `pnpmLockChangeAllowed`, and `dbDriverDependencyAllowed` are `false`
- real DB, migration execution, live DB integration test, provider SDK apply, production deployment, and readiness claim flags are `false`

## Future Complete Fixture

Future complete dependency evidence may exist only as test data. Copying a complete fixture into `.codex` evidence is forbidden unless a future owner-approved dependency PR regenerates evidence for the exact target commit.

The current committed `.codex/db-driver-dependency-pr-template.json` must not contain `packageDiffEvidence`, `lockfileEvidence`, `licenseReviewEvidence`, `supplyChainReviewEvidence`, `securityAdvisoryEvidence`, `versionPinningEvidence`, or `secretBoundaryEvidence` objects. Those objects are valid only in a future dependency PR after owner approval and final gate approval.

Allowed future driver package names are limited to `pg` and `postgres`. Any placeholder package such as `future-db-driver`, unrelated dependency, package mismatch, non-`dependencies` section, or non-exact version spec is invalid evidence.

Version evidence must use exact semver only. `latest`, `*`, caret ranges, tilde ranges, workspace/file/link/git/http URLs, and other floating or remote specs are not valid dependency evidence.

## Required Future Sections

Future dependency PR body evidence must include:

- Task Contract
- Owner Approval Record
- Final Approval Gate
- Selected Driver
- Package Diff Evidence
- Lockfile Review Evidence
- License Review Evidence
- Supply-Chain Review Evidence
- Security Advisory Evidence
- Version Pinning Evidence
- Secret Boundary Evidence
- Testing and review
- Test Coverage Evidence
- Review Independence
- Best of N Evidence
- Security Boundaries
- Residual risks
- Human Confirmation
- Production Go/No-Go

Raw logs, secrets, private URLs, DB connection strings, wallet addresses, raw provider responses, legal compliance claims, and YouTube policy compliance claims are forbidden in evidence.

License review evidence is package license metadata review only. It is not legal advice, legal approval, or a legal compliance claim.

## Candidate Review Pack Contract

`.codex/db-driver-candidate-review-pack.json` is the machine-readable contract
for candidate comparison before a future dependency PR. It is valid only while:

- `candidateDrivers` is exactly `pg`, `postgres`
- `driverChoiceStatus` is `not_selected`
- `selectedDriver` is `null`
- `reviewPackStatus` is `not_ready`
- license, supply-chain, advisory, version, package, lockfile, and secret
  evidence remain incomplete
- owner approval is `not_approved`
- final approval gate is `blocked`
- package, lockfile, dependency, real DB, migration, live DB test, provider
  apply, deployment, readiness, legal, and YouTube policy flags are false

The candidate pack is not a dependency decision and cannot replace owner
approval or final approval gate evidence.
