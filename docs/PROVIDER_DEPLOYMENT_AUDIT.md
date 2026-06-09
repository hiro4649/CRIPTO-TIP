# Provider Deployment Audit

Provider deployment audit records are safe summaries of planned, executed,
failed, and rollback-related operations. They are not raw provider responses and
not credential storage.

## Audit Actions

- `provider_deployment.apply.planned`
- `provider_deployment.apply.executed`
- `provider_deployment.apply.failed`
- `provider_deployment.rollback.planned`
- `provider_deployment.rollback.executed`
- `provider_deployment.job.planned`
- `provider_deployment.job.running`
- `provider_deployment.job.applied`
- `provider_deployment.job.failed`
- `provider_deployment.job.rollback_planned`
- `provider_deployment.job.rolled_back`
- `provider_deployment.job.cancelled`
- `provider_deployment.compensation.required`
- `provider_deployment.compensation.resolved`
- `provider_apply_transaction.draft_created`
- `provider_apply_transaction.provider_apply_started`
- `provider_apply_transaction.provider_apply_succeeded`
- `provider_apply_transaction.provider_apply_failed`
- `provider_apply_transaction.mark_gate_used_attempted`
- `provider_apply_transaction.mark_gate_used_succeeded`
- `provider_apply_transaction.mark_gate_used_failed`
- `provider_apply_transaction.audit_append_succeeded`
- `provider_apply_transaction.committed`
- `provider_apply_transaction.rolled_back`
- `provider_apply_transaction.compensation_required`

## Safe Persistence Boundary

Provider deployment jobs store operation, status, target, target environment,
target commit SHA, manual gate ID reference, rollback plan reference, operator
runbook reference, and safe summary.

They do not store provider credential values, webhook URLs, provider tokens,
OAuth tokens, API keys, private URLs, wallet addresses, raw messages, raw display
names, raw YouTube author IDs, raw payloads, raw provider responses, raw logs,
stdout, stderr, or stack traces.

`target`, `manual_gate_id`, `rollback_plan_ref`, `operator_runbook_ref`,
`target_environment`, `target_commit_sha`, and `safe_summary` are all part of
the safe audit boundary. Unsafe target or reference fields are rejected instead
of silently stored. Safe-summary fields are reduced to primitive safe values and
unsafe keys or values are not treated as durable evidence.

The in-memory audit repository mirrors the SQL primary-key boundary: duplicate
manual gate audit IDs, provider deployment audit IDs, and provider deployment
job IDs fail closed.

## Apply Semantics

Provider raw results are not persisted. PR #34 introduced projected safe result
shapes for dashboard and external alert wrappers; audit storage must use those
safe projections or smaller safe summaries.

Apply success may move a manual gate to `used`. Apply failure must not move the
manual gate to `used`. If `markUsed` fails after provider apply, the operation
must not be reported as successful.

## Current Limit

Real provider SDK apply and actual production deployment apply remain out of
scope. The provider deployment job state machine prepares transition validation,
compensation-required evidence, and safe repository boundaries for a later
persistent transaction implementation.

`provider_apply_transaction.*` actions are logical transaction-boundary audit
events. They record state and operator handoff facts only. They must not include
raw provider responses, raw GitHub logs, stdout/stderr bodies, stack traces,
secret values, or private endpoints.
