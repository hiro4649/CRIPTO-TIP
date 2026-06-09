# DB Driver Preflight Policy

This policy prepares the future DB driver introduction review path for v1.1.6. It is policy-only.

Current status:

- Driver choice status: `not_selected`
- Selected driver: none
- Candidate drivers for future review: `pg`, `postgres`
- Package changes: not allowed
- `pnpm-lock.yaml` changes: not allowed
- Real DB connection: not allowed
- Live DB integration test execution: not allowed
- Migration apply: not allowed
- Provider SDK apply or production deployment: not allowed

Future DB driver introduction requires the owner approval record boundary from PR #45 and a fresh project-owner-approved record for the specific target commit, branch, PR, and base commit.

Before a future DB driver PR may add a dependency, it must include:

- License review evidence.
- Supply-chain and maintainer review evidence.
- Security advisory review evidence.
- Version pinning policy evidence.
- Package diff review evidence.
- Lockfile diff review evidence.
- Secret manager boundary review evidence before any real DB connection.

This document does not claim runtime readiness, production readiness, legal compliance, or YouTube policy compliance.
