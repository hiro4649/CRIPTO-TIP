# DB Driver Advisory Safe Summary Rules

Safe summaries may include bounded counts, high-level status words such as
`not_reviewed`, source category names, package names, candidate driver names,
timestamps, and refresh requirements.

Safe summaries must not include:

- raw JSON
- raw logs
- raw dependency trees
- raw advisory payloads
- npm audit raw JSON
- GitHub Advisory raw responses
- OSV raw responses
- Snyk raw responses
- npm registry raw metadata
- stdout or stderr bodies
- stack traces
- token-like values
- private URLs
- DB URLs
- wallet addresses
- raw provider output

Current evidence must not say `clean`, `no vulnerabilities`, `secure`,
`approved`, `safe to install`, `dependency approved`, `production ready`,
`legal compliant`, `policy compliant`, `recommended`, `winner`, `preferred`, or
similar wording that could be mistaken for advisory review completion or driver
selection.

Future reviewed fixtures may appear only in tests. Committed current evidence
must remain `not_reviewed`.
