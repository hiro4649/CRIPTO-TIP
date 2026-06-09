# Provider Apply Compensation Handoff

`compensation_required` means an external provider apply may have succeeded, but the repository could not complete the safe state unit that marks the manual gate used and records the final applied job state.

This is an operator handoff, not an automatic rollback.

Compensation is also required when provider apply succeeded and durable state or audit append failed. In that case IRIS state may be rolled back while the provider side effect already occurred, so the operator must reconcile provider state through the approved manual-gated path.

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

## Rollback Phase Mapping

Rollback handoff records transaction phase `transaction_rolled_back` and audit action `provider_apply_transaction.rolled_back`. The rollback record is evidence of operator handoff only; it is not proof of provider rollback execution.

## What This PR Does Not Do

- It does not execute provider rollback.
- It does not call a real provider SDK.
- It does not perform production deployment apply.
- It does not operate a live YouTube account.
- It does not store provider diagnostic payloads or secrets.

## Forbidden Evidence

Do not store secret values, webhook URLs, provider tokens, OAuth tokens, API keys, private URLs, wallet addresses, user message bodies, display names, YouTube author IDs, provider diagnostic payloads, GitHub Actions log downloads, stdout/stderr bodies, or stack traces.
