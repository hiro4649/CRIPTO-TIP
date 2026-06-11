# DB Driver Candidate Review Stale Evidence

Stale DB driver candidate evidence is a blocker. It cannot be used for:

- driver selection
- owner approval
- dependency introduction
- package or lockfile changes
- runtime or production readiness claims
- legal or YouTube policy readiness claims

## Safe Evidence Sources

Only machine-readable evidence and safe artifacts may be used. Raw GitHub logs,
raw provider responses, stack traces, stdout or stderr dumps, DB connection
strings, token-like values, wallet addresses, and private URLs remain forbidden.

## Current Handling

The current freshness record is deliberately `not_ready`. It records that
reviews are missing and must be refreshed later. It does not approve a candidate
and does not change the DB runtime surface.
