# DB Driver Source Evidence Revalidation

Source evidence must be revalidated when any binding input changes or when a
source freshness window expires.

Safe revalidation triggers:

- target commit change
- base commit change
- PR number change
- target branch change
- package name change
- package version change
- package file change
- lockfile change
- dependency graph change
- source category policy change
- advisory source expiry
- missing `source_checked_at`
- missing `source_expires_at`
- new advisory detected
- raw output detected
- selected-driver wording detected
- runtime, production, legal, or YouTube policy readiness claim detected

Revalidation must use safe summaries only. Raw advisory output, raw audit
output, OSV raw response, Snyk raw response, npm registry raw metadata, raw
dependency tree, terminal output, logs, stack traces, private URLs, DB
connection strings, wallet addresses, and token-like values are rejected.
