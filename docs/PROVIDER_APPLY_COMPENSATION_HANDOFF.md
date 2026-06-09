# Provider Apply Compensation Handoff

`compensation_required` means an external provider apply may have succeeded, but the repository could not complete the safe state unit that marks the manual gate used and records the final applied job state.

This is an operator handoff, not an automatic rollback.

## Operator Next Action

1. Confirm the provider-side state through the approved manual-gated operations path.
2. Confirm whether the manual gate is still `approved` or has been marked `used`.
3. Follow the `rollback_plan_ref` recorded on the transaction/job.
4. Use the `operator_runbook_ref` for the environment-specific procedure.
5. Record only safe summaries in follow-up evidence.

## Manual Gate State

The manual gate remains an approval record, not secret storage. If mark-used failed after provider apply succeeded, the job must remain `failed` with:

- `external_provider_apply_started: true`
- `manual_gate_mark_used_attempted: true`
- `manual_gate_mark_used_succeeded: false`
- `compensation_required: true`

## What This PR Does Not Do

- It does not execute provider rollback.
- It does not call a real provider SDK.
- It does not perform production deployment apply.
- It does not operate a live YouTube account.
- It does not store raw provider responses or secrets.

## Forbidden Evidence

Do not store secret values, webhook URLs, provider tokens, OAuth tokens, API keys, private URLs, wallet addresses, raw user messages, raw display names, raw YouTube author IDs, raw payloads, raw provider responses, raw GitHub logs, stdout/stderr bodies, or stack traces.
