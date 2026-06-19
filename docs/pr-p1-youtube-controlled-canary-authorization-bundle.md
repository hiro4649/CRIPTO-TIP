# P1 YouTube Controlled Canary Authorization Bundle

## Task Contract

Document the owner authorization bundle required before any real YouTube
controlled canary can run.

## Evidence Integrity

This PR is docs/evidence only. It does not execute a canary, call YouTube, run
OAuth, access secrets, change product runtime, or authorize network execution.

Current-head evidence will be refreshed after PR creation and same-head checks.

## Testing and Review

Focused validation:

- `node scripts/check-evidence-placeholders.mjs`: pass
- `node scripts/validate-evidence-freshness.mjs`: pass
- `node scripts/codex-secret-safety-scan.mjs`: pass

Full validation is required before merge.

## Test Coverage Evidence

Machine-readable evidence records `awaiting_owner_authorization`, absent network
authorization, absent credential refs, incomplete privacy/deletion review,
blocked kill switch status, and no real network or OAuth execution.

## Security Boundaries

No package, lockfile, workflow, product runtime, YouTube transport, OAuth token
exchange, secret manager connection, canary execution, runtime readiness,
production readiness, legal compliance, or YouTube policy compliance change is
introduced.

## Residual Risks

The canary cannot run until the owner separately supplies all required
authorization decisions and opaque credential reference statuses.

## Human Confirmation

This PR does not create owner approval, GitHub approval review, merge authority,
release authority, deploy authority, network authorization, or canary execution
authorization.
