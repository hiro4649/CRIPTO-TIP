# DB Driver Review Attachment Rules

Future DB driver dependency PRs must attach review evidence as safe summaries. The current template PR does not attach completed review evidence and does not authorize a package change.

## Owner Approval

Owner approval must be a project-owner record bound to the exact future target commit. AI review is not owner approval.

## Final Approval Gate

The final approval gate must be regenerated for the future dependency PR and must approve the same selected driver as owner approval, package diff evidence, lockfile evidence, and readiness evidence.

## Review Evidence

Required review attachments:

- package diff evidence
- lockfile review evidence
- license metadata review evidence without legal compliance, legal approval, or legal advice claims
- supply-chain review evidence
- security advisory review evidence
- version pinning evidence
- secret boundary evidence

## Safety Rules

Attachments must not include:

- raw GitHub logs
- stdout or stderr dumps
- stack traces
- raw provider responses
- secrets
- private URLs
- DB connection strings
- wallet addresses
- YouTube OAuth token or API key values
- legal compliance claims
- YouTube policy compliance claims

Secret boundary evidence may reference secret manager scope names, but it must not store secret values.

License review is limited to package metadata such as the declared license name and source. It must not state that a package is legally compliant, legally approved, or approved as legal advice. A future project owner may require separate legal counsel outside repository evidence before approving a real dependency PR.
