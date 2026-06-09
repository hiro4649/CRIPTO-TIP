# Provider Deployment Compensation

Provider deployment compensation is required when an external provider apply has
succeeded but the approved manual gate could not be marked `used`.

This PR records the state and audit boundary only. It does not run real provider
SDK apply, does not run rollback automatically, and does not perform production
deployment apply.

## Compensation Required

Set `compensation_required = true` when all are true:

- external provider apply succeeded or side effects may have started
- manual gate mark-used was attempted
- manual gate mark-used did not succeed
- job status is `failed`

The job must not be recorded as `applied` in this case. Record a failed job
state plus `provider_deployment.compensation.required` audit evidence.

Normal failure and compensation failure share the `failed` status, but the flags
are distinct:

- normal failure: `manual_gate_mark_used_attempted = false` and
  `compensation_required = false`
- compensation failure: `external_provider_apply_started = true`,
  `manual_gate_mark_used_attempted = true`,
  `manual_gate_mark_used_succeeded = false`, and
  `compensation_required = true`

## Operator Handling

The operator must use the referenced rollback plan and runbook to decide whether
to disable, roll back, or reconcile the external provider state. The evidence
must include only safe summaries and references.

`docs/PROVIDER_APPLY_COMPENSATION_HANDOFF.md` defines the handoff contract for
this state. It is an operator action record, not an automatic provider rollback
or live provider operation.

Do not paste provider tokens, API keys, webhook URLs, OAuth tokens, private
URLs, wallet addresses, raw messages, raw display names, raw provider payloads,
or raw logs into compensation evidence.

## Future Persistent Transaction

Future DB-backed apply should make these updates atomic:

- provider job transition
- manual gate mark-used
- safe audit append

If provider side effects cannot be atomically coupled with local persistence,
the job state machine remains the durable reconciliation boundary.
