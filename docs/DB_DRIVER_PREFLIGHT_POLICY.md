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
- Runtime readiness claim: not allowed
- Production readiness claim: not allowed
- Legal compliance claim: not allowed
- YouTube policy compliance claim: not allowed
- Candidate driver set: exactly `pg`, `postgres`
- Candidate evaluations: required for both `pg` and `postgres`

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

This PR defines preflight policy only and cannot select a driver. `driver_choice_status` must remain `not_selected`, `selected_driver` must remain null, and candidate evaluations may only use neutral review states such as `needs_owner_review`, `not_selected`, or `rejected_future_review`.
