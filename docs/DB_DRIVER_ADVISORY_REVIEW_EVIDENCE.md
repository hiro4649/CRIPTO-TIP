# DB Driver Advisory Review Evidence

Advisory evidence for a future DB driver dependency PR must be safe-summary
only. The evidence envelope stores status fields and a short safe summary, not
raw provider output.

## Required Shape

The envelope contains:

- candidate driver names
- CVE review status
- security advisory review status
- package audit review status
- known blockers status
- raw output policy status
- advisory source policy status
- freshness status

Current committed values remain `not_reviewed`, `not_ready`, or
`safe_summary_only`. They do not authorize dependency installation.

## Safe Summary Boundary

Safe summaries may say that review is missing, pending, blocked, expired, or
requires refresh. They must not claim a clean audit, no CVEs, no blockers,
owner approval, final approval, production readiness, legal compliance, or
YouTube policy compliance.

## Forbidden Evidence

Do not commit raw advisory API responses, raw package audit output, raw terminal
output, raw dependency trees, raw logs, private URLs, DB connection strings,
wallet addresses, token-like values, or provider responses.
