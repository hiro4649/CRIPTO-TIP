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

## Requested Scope Allowlist

`requested_scope` is machine-validated. Only these values are accepted:

- `db_integration_scope_gate`
- `owner_approval_record_schema`
- `db_driver_introduction_checklist`
- `live_db_integration_test_plan`
- `db_secret_boundary`
- `migration_apply_rollback_plan`
- `tests`
- `docs`
- `codex_evidence`

Unknown scope names, spaces, URLs, token-like strings, raw log references, real
DB connection scope, DB driver dependency scope, provider SDK apply scope,
production deployment scope, and readiness claim scope are rejected.

## Approval Status Semantics

This PR defines the future approved shape but does not create an approved
record. The repository evidence for PR #44 must remain `not_approved`.

`approved` requires `owner_approved_by: project-owner` and an ISO UTC
`owner_approved_at` timestamp on the target commit. AI review cannot populate
approved fields.

`rejected` is a terminal owner decision placeholder. It requires
`owner_decided_by: project-owner` and an ISO UTC `owner_decided_at` timestamp.
This PR does not emit a rejected record by default.

Approved schema acceptance is a validator capability, not current approval. A
future PR may use `approved` only after human project-owner confirmation on the
target commit.
