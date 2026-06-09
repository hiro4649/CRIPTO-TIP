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

Driver credentials must be references only. Real credential values, private
URLs, raw connection strings, OAuth tokens, API keys, provider tokens, and
production endpoints must not be committed, logged, or placed in PR evidence.

