# DB Driver Introduction Checklist

No DB driver is introduced in this PR.

Before any future DB driver PR, the owner-approved record must cover:

- DB driver package choice.
- Version pinning policy.
- Security review.
- License review.
- Supply-chain review.
- Package.json change approval.
- pnpm-lock change approval.
- Secret manager scope.
- Connection string storage boundary.
- Connection pool policy.
- Query timeout policy.
- Transaction timeout policy.
- Retry policy.
- Migration application plan.
- Rollback plan.
- Live integration test plan.
- Observability plan.
- Operator runbook.
- Owner approval.
- DB driver preflight policy evidence covering candidate evaluation, license
  review, supply-chain review, security advisory review, version pinning,
  lockfile review, and package diff review.

Driver credentials must be references only. Real credential values, private
URLs, raw connection strings, OAuth tokens, API keys, provider tokens, and
production endpoints must not be committed, logged, or placed in PR evidence.

The owner approval record must be target-bound. It must include the exact PR
number, target branch, target commit SHA, base commit SHA, approval scope,
expiry, and fingerprint. Copying the record across branches, PRs, commits, or
scopes must fail validation.

Preflight policy evidence must be present before any dependency introduction.
The preflight policy must not select a driver or permit package and lockfile
changes until the owner approval record is approved for the exact future PR.
