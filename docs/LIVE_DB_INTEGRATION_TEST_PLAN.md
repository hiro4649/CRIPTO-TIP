# Live DB Integration Test Plan

No live DB integration tests are executed in this PR.

Before live DB integration tests are enabled, the future approved PR must define:

- Dedicated test DB environment.
- No production data.
- Ephemeral credentials.
- Secret manager-only credential source.
- Migration apply dry-run.
- Migration rollback dry-run.
- Transaction happy path.
- Transaction rollback path.
- Lock timeout simulation.
- Deadlock or serialization simulation.
- Audit safe summary verification.
- Secret scan.
- No raw logs.
- No provider SDK apply.
- No production deployment.

The test environment must be isolated from production and must not contain
viewer personal data, wallet secrets, private endpoints, or raw provider
payloads.

