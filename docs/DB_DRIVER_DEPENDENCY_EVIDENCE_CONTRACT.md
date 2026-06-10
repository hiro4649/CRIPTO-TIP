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

