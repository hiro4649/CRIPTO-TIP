# DB Integration Scope Gate

This PR is a scope gate only. It prepares v1.1.6 DB integration approval
evidence before any real database work starts.

The default state is not approved:

- No DB driver.
- No real DB connection.
- No package change.
- No pnpm-lock change.
- No migration apply.
- No live DB integration test execution.
- No provider SDK apply.
- No production deployment.
- No runtime readiness claim.
- No production readiness claim.

Owner approval is required before v1.1.6 real DB work. AI approval is not owner
approval. The owner approval record is approval evidence, not secret storage.

Scope must be reopened by a new PR after owner approval. That future PR must
name the driver, version policy, secret manager boundary, test environment,
migration apply/rollback plan, and rollback owner.

