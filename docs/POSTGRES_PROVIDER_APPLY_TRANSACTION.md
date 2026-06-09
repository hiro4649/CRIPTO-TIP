# Postgres Provider Apply Transaction

This document defines the future persistent transaction boundary for provider
apply state recording. It is a design and repository contract only. This PR does
not open a real database connection, call a real provider SDK, or perform
production deployment apply.

## Boundary

External provider apply is outside the database transaction. The database
transaction records the durable result after the provider side effect and must
never claim that provider apply is fully atomic with Postgres state.

If provider apply succeeds but the durable transaction cannot complete,
`compensation_required` is required. The retry path must not re-execute provider
apply. Operators reconcile through the approved manual-gated compensation
handoff.

## Lock Order

The lock order is fixed to reduce deadlock risk:

1. `manual_gates`
2. `provider_deployment_jobs`
3. `provider_deployment_audit_logs` insert
4. `manual_gate_audit_logs` insert

The repository contract uses `SELECT ... FOR UPDATE` for the manual gate row
before locking the provider deployment job row. Manual gate used state and job
applied state must be committed together with safe audit rows.

## Transaction Shape

```sql
BEGIN;
SELECT ... FROM manual_gates WHERE id = $1 FOR UPDATE;
VERIFY approved gate, gate type, target commit, target environment, expiry;
SELECT ... FROM provider_deployment_jobs WHERE id = $2 FOR UPDATE;
VERIFY job transition;
UPDATE provider_deployment_jobs ...;
UPDATE manual_gates SET status = 'used', used_at = now();
INSERT INTO provider_deployment_audit_logs ...;
INSERT INTO manual_gate_audit_logs ...;
COMMIT;
```

## Provider Job State Columns

`provider_deployment_jobs` persists the PR #38 state-machine flags:

- `external_provider_apply_started`
- `manual_gate_mark_used_attempted`
- `manual_gate_mark_used_succeeded`
- `compensation_required`

The DB design includes an applied consistency check: `applied` jobs require
provider apply started, manual gate mark-used attempted, manual gate mark-used
succeeded, and `compensation_required = false`.

The DB design also includes a compensation consistency check: compensation is
valid only on failed jobs after provider apply started and manual gate mark-used
was attempted but did not succeed.

`rollback_planned` is an accepted provider deployment job status. The provider
deployment audit action check accepts provider job state actions and
`provider_apply_transaction.*` actions, including
`provider_apply_transaction.draft_created` and
`provider_apply_transaction.compensation_required`.

## Idempotency

Allowed idempotency fields are `transaction_id`, `job_id`, `manual_gate_id`,
optional safe `provider_result_id`, `operation`, `target_commit_sha`, and
`target_environment`.

Forbidden idempotency contents include provider diagnostic payloads, webhook
URLs, tokens, secrets, wallet addresses, user message bodies, and display names.

## Safe Summaries

Audit logs are safe summaries only. They are not secret storage and must not
include provider diagnostic payloads, private URLs, wallet addresses, user
message bodies, display names, OAuth tokens, API keys, stdout/stderr bodies, or
stack traces.

## Out Of Scope

- No real DB connection.
- No production DB migration application.
- No real provider SDK apply.
- No actual production deployment apply.
- No runtime, production, legal, or YouTube policy readiness claim.
