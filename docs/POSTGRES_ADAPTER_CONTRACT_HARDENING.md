# Postgres Adapter Contract Hardening

CODEX_QUALITY_HARNESS_FILE v1.1.5

This document records the v1.1.6 preparation contract for the Postgres provider
apply transaction adapter. The implementation remains mock-client only: no real
database connection, DB driver, package change, migration change, real provider
SDK apply, or production deployment apply is introduced.

## Consumed Manual Gate Columns

The adapter consumes these `manual_gates` columns through
`parseManualGateRow`:

| Column | Adapter field | Validation |
| --- | --- | --- |
| `id` | `id` | Required safe string. |
| `gate_type` | `gate_type` | Valid `ManualGateType`. |
| `status` | `status` | Must be one of `not_requested`, `requested`, `approved`, `rejected`, `expired`, or `used`; adapter use still requires `approved`. |
| `target_environment` | `target_environment` | Required safe string and must match idempotency. |
| `target_commit_sha` | `target_commit_sha` | Required 40-character hex SHA and must match idempotency. |
| `expires_at` | `expires_at` | Required ISO UTC datetime and must be after commit time. |
| `used_at` | `used_at` | `null` or absent before mark-used. |

The adapter row parser is exact and rejects unexpected manual gate columns.

## Consumed Provider Job Columns

The adapter consumes these `provider_deployment_jobs` columns through
`parseProviderJobRow`:

| Column | Adapter field | Validation |
| --- | --- | --- |
| `id` | `id` | Required safe string. |
| `operation` | `operation` | Valid `ManualGateType` and must match idempotency. |
| `status` | `status` | Valid provider job status; adapter entry accepts `planned` or `running`. |
| `manual_gate_id` | `manual_gate_id` | Required safe string and must match idempotency. |
| `target_environment` | `target_environment` | Required safe string and must match idempotency. |
| `target_commit_sha` | `target_commit_sha` | Required 40-character hex SHA and must match idempotency. |
| `external_provider_apply_started` | state flag | Required boolean. |
| `manual_gate_mark_used_attempted` | state flag | Required boolean. |
| `manual_gate_mark_used_succeeded` | state flag | Required boolean. |
| `compensation_required` | state flag | Required boolean. |
| `rollback_plan_ref` | `rollback_plan_ref` | Required safe reference. |
| `operator_runbook_ref` | `operator_runbook_ref` | Required safe reference. |

The adapter row parser is exact and rejects unexpected provider job columns.

`applied` rows are valid only when provider apply started, manual gate mark-used
was attempted and succeeded, and compensation is false. Compensation-required
rows are valid only in the failed state after provider side effects started and
manual gate mark-used did not succeed.

## Written Audit Columns

The adapter writes safe summaries only:

| Table | Columns controlled by adapter |
| --- | --- |
| `provider_deployment_audit_logs` | `id`, `job_id`, `operation`, `action`, `target`, `safe_summary`, `created_at` |
| `manual_gate_audit_logs` | `id`, `gate_id`, `action`, `actor_type`, `target_environment`, `target_commit_sha`, `safe_summary`, `created_at` |

Audit rows are not secret storage. They must not contain raw provider response,
private URLs, wallet addresses, raw messages, display names, stdout, stderr, or
stack traces.

## Placeholder-To-Param Mapping

| SQL placeholder | Parameter builder source |
| --- | --- |
| `$1` | `manual_gate_id` |
| `$2` | `job_id` |
| `$3` | provider job `status` |
| `$4` | provider job `safe_summary` |
| `$5` | `committedAt` |
| `$6` | provider audit id |
| `$7` | operation |
| `$8` | provider audit action from the existing `provider_apply_transaction.*` allowlist |
| `$9` | target environment |
| `$10` | provider audit safe summary |
| `$11` | manual gate audit id |
| `$12` | manual gate target environment predicate |
| `$13` | manual gate target commit predicate |
| `$14` | manual gate audit safe summary |
| `$15` | `external_provider_apply_started` |
| `$16` | `manual_gate_mark_used_attempted` |
| `$17` | `manual_gate_mark_used_succeeded` |
| `$18` | `compensation_required` |

The parameter builders return readonly arrays and reject unsafe IDs, unsafe
references, unsafe summaries, invalid timestamps, invalid applied-state flags,
and invalid compensation flags before query execution.

Query result guards preserve a safe metadata-limited phase when `rowCount > 1`,
for example `metadata_limited_external_blocked:provider_job_transition_invalid`.
The phase helps operator triage without exposing row contents or raw DB
diagnostics.

## Migration 0004 Correspondence

Migration `0004_provider_apply_transaction_indexes.sql` defines the state flag
columns and consistency checks that the adapter mirrors:

- `external_provider_apply_started`
- `manual_gate_mark_used_attempted`
- `manual_gate_mark_used_succeeded`
- `compensation_required`
- `provider_deployment_jobs_applied_consistency`
- `provider_deployment_jobs_compensation_consistency`

The adapter does not modify this migration. The current PR only makes the
TypeScript contract explicit before a future real DB adapter is authorized.

## Why Typed Parsers Are Required

The real DB adapter will receive `unknown` row shapes from a driver. The mock
client now exercises the same trust boundary by parsing rows through typed
validators before business validation. This prevents `rows[0] as T` from
turning missing fields, wrong primitive types, invalid state flags, unsafe raw
payloads, unexpected extra columns, loose timestamps, unknown audit actions, or
stale schema assumptions into accepted state.

## Future Owner Approval

Introducing a real DB driver, live Postgres connection, migration application,
or production-like deployment remains future work. It requires explicit owner
approval under `docs/POSTGRES_ADAPTER_OWNER_APPROVAL_CHECKLIST.md`.

## DB Integration Scope Gate v1.1.6 Prep

The v1.1.6 preparation path requires a DB integration scope gate before any real DB driver, live DB integration test, migration execution, package change, real DB connection, provider SDK apply, or runtime readiness claim can be proposed.
