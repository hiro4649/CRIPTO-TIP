# DB Driver Candidate Review Matrix

The current matrix lists only candidate packages for future review. No package is
chosen in this PR.

`candidateStatus: candidate` means review-queue inclusion only. It is not
driver selection, approval, dependency authorization, package installation, or
runtime readiness. The current choice remains `driverChoiceStatus:
not_selected` and `selectedDriver: null`.

| Candidate | Candidate status | Runtime dependency suitability | TypeScript support review status | Transaction support review status | Pooling support review status | Timeout/cancellation support review status | Maintenance review status | Known unknowns | License | Supply chain | Advisory | Version policy | Package diff | Lockfile | Secret boundary | Owner approval | Final gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `pg` | `candidate` | `future_review_required` | `not_reviewed` | `not_reviewed` | `not_reviewed` | `not_reviewed` | `not_reviewed` | `open_question` | `not_reviewed` | `not_reviewed` | `not_reviewed` | `not_selected` | `missing` | `missing` | `not_reviewed` | `not_approved` | `blocked` |
| `postgres` | `candidate` | `future_review_required` | `not_reviewed` | `not_reviewed` | `not_reviewed` | `not_reviewed` | `not_reviewed` | `open_question` | `not_reviewed` | `not_reviewed` | `not_reviewed` | `not_selected` | `missing` | `missing` | `not_reviewed` | `not_approved` | `blocked` |

## Required Future Comparison

A future dependency PR must attach a comparison that covers:

- license metadata source and no legal advice claim
- maintainer and release cadence review
- provenance and transitive dependency review
- install script and native module review
- advisory, CVE, and audit result review
- exact version policy
- package diff and lockfile review
- secret boundary review without raw DB connection strings

## Current Outcome

The outcome is `not_ready`. The matrix is not an approval record and cannot be
used as final selection evidence.

## Freshness Boundary

The freshness gate adds expiry and refresh requirements for this matrix. It does
not rank `pg` or `postgres`. Both candidates remain `candidate` entries with
freshness status `not_ready` until future review evidence is supplied and
approved in a separate dependency PR.
