# DB Driver Candidate Review Expiry Policy

Freshness evidence expires quickly enough to prevent old package or advisory
data from being reused.

## Expiry Windows

| Evidence | Expiry |
| --- | --- |
| License review | 30 days |
| Supply-chain review | 30 days |
| Security advisory review | 7 days |
| Package metadata review | 14 days |
| Version policy review | 30 days |
| Package diff evidence | Immediately invalidated by package file change |
| Lockfile evidence | Immediately invalidated by lockfile change |

Owner approval is never inferred from freshness evidence. Any future owner
approval record must carry its own target commit binding and expiry boundary.
Expiry never authorizes selection by itself. Even evidence inside its expiry
window still requires project-owner approval and a separate dependency PR
before package or lockfile changes are allowed. Expired evidence must set
`refreshRequired: true`. Security advisory evidence has the shortest expiry
window at 7 days.

## Current PR Boundary

The current PR does not include fresh review evidence. It records the expiry
policy and keeps all current review statuses at `not_reviewed`, `not_selected`,
or `missing`.

## Advisory Envelope Expiry Boundary

The advisory review envelope does not start the advisory expiry window. Expiry begins only after a future safe-summary advisory review records reviewed source evidence.
