# DB Driver Candidate Review Pack

This document defines the v1.1.7 DB driver candidate review pack. It is a
pre-dependency review artifact only. It does not select a DB driver, authorize a
package change, authorize a lockfile change, connect to a real database, execute
migrations, run live DB integration tests, apply provider SDK actions, or claim
runtime or production readiness.

Machine-readable evidence lives in `.codex/db-driver-candidate-review-pack.json`
and is validated by `apps/api/src/db-driver-candidate-review-pack.ts`.

## Current State

- `reviewPackStatus`: `not_ready`
- `driverChoiceStatus`: `not_selected`
- `selectedDriver`: `null`
- `candidateDrivers`: `pg`, `postgres`
- `ownerApprovalStatus`: `not_approved`
- `finalApprovalGateStatus`: `blocked`
- `dependencyPrTemplateStatus`: `template_ready`

The candidate list is a review queue. It is not a dependency decision.

## Candidate Status Semantics

- `candidateStatus: candidate` means the package is included in the future
  review queue.
- `candidateStatus: candidate` is not adoption, selection, approval, dependency
  authorization, runtime readiness, or production readiness.
- `driverChoiceStatus: not_selected` is the current driver choice state.
- `selectedDriver: null` is the committed evidence state.
- `pg` and `postgres` are comparison candidates only.

## Required Blocking Evidence

The pack remains blocked until a future owner-approved dependency PR supplies all
of the following evidence:

- License review for the chosen package.
- Supply-chain review for maintainers, release cadence, provenance, transitive
  dependencies, and install scripts.
- Security advisory review for advisories, CVEs, and package audit output.
- Exact version policy.
- Package diff review.
- Lockfile review.
- Secret boundary review.
- Project-owner approval record.
- Final approval gate record.

## Forbidden In This Pack

- DB driver dependency introduction.
- `package.json` or `pnpm-lock.yaml` changes.
- Real DB connection.
- Migration changes or execution.
- Live DB integration tests.
- Runtime readiness, production readiness, legal compliance, or YouTube policy
  compliance claims.
- Raw GitHub logs, raw provider responses, secrets, private URLs, wallet
  addresses, or DB connection strings in evidence.

## Validation

`validateCurrentDbDriverCandidateReviewPackRecord` rejects:

- selected driver or `driverChoiceStatus: selected`
- `reviewPackStatus: ready_for_owner_review`
- candidate drivers other than exactly `pg` then `postgres`
- missing, extra, or duplicate candidate reviews
- candidate review status that implies selection
- pass or approved statuses in committed evidence
- any permission flag set to true
- unsafe values or keys in evidence
