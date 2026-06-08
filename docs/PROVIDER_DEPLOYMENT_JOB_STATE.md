# Provider Deployment Job State

Provider deployment job state is a preparation boundary for future
provider-specific apply work. It validates state transitions and records safe
audit summaries only. It does not execute real provider SDK apply and does not
claim production deployment readiness.

## Job Fields

Provider deployment jobs carry:

- `id`
- `operation`
- `status`
- `target`
- `target_environment`
- `target_commit_sha`
- `manual_gate_id`
- `rollback_plan_ref`
- `operator_runbook_ref`
- `safe_summary`
- `external_provider_apply_started`
- `manual_gate_mark_used_attempted`
- `manual_gate_mark_used_succeeded`
- `compensation_required`
- `created_at`
- `updated_at`

The safe summary must not include provider credentials, webhook URLs, OAuth
tokens, API keys, private URLs, wallet addresses, raw messages, raw display
names, raw YouTube author IDs, raw payloads, raw provider responses, raw logs,
stdout, stderr, or stack traces.

## Transition Rules

Allowed transitions:

- `planned -> running`
- `running -> applied`
- `running -> failed`
- `failed -> rollback_planned`
- `rollback_planned -> rolled_back`
- `planned -> cancelled`
- `running -> cancelled` only before `external_provider_apply_started`

Forbidden transitions:

- `applied -> running`
- `applied -> failed`
- `failed -> applied`
- `rolled_back -> applied`
- `cancelled -> running`
- `cancelled -> applied`

An `applied` job requires `manual_gate_mark_used_succeeded = true`. This keeps
provider apply success from being recorded as complete unless the approved
manual gate was successfully marked used.

## Audit Actions

The state-machine boundary can emit:

- `provider_deployment.job.planned`
- `provider_deployment.job.running`
- `provider_deployment.job.applied`
- `provider_deployment.job.failed`
- `provider_deployment.job.rollback_planned`
- `provider_deployment.job.rolled_back`
- `provider_deployment.job.cancelled`
- `provider_deployment.compensation.required`
- `provider_deployment.compensation.resolved`

These are safe summaries. They are not raw provider logs or provider responses.

## Transaction Boundary Prep

Future DB-backed apply must atomically bind provider job transition, manual gate
mark-used, and audit log write. Until that persistent transaction exists, the
state machine records `compensation_required` when external provider apply has
succeeded but manual gate mark-used did not succeed.
