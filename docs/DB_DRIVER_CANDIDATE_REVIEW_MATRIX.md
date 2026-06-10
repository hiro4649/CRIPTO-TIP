# DB Driver Candidate Review Matrix

The current matrix lists only candidate packages for future review. No package is
chosen in this PR.

| Candidate | Candidate status | License | Supply chain | Advisory | Version policy | Package diff | Lockfile | Secret boundary | Owner approval | Final gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `pg` | `candidate` | `not_reviewed` | `not_reviewed` | `not_reviewed` | `not_selected` | `missing` | `missing` | `not_reviewed` | `not_approved` | `blocked` |
| `postgres` | `candidate` | `not_reviewed` | `not_reviewed` | `not_reviewed` | `not_selected` | `missing` | `missing` | `not_reviewed` | `not_approved` | `blocked` |

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

