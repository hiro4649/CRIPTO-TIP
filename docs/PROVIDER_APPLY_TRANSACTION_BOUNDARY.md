# Provider Apply Transaction Boundary

This boundary prepares persistent transaction semantics for provider apply state recording. It is not a DB-backed transaction implementation, does not call a real provider SDK, and does not execute actual production deployment apply.

The logical unit is:

1. record provider apply job state,
2. mark the approved manual gate as used,
3. append provider and manual gate audit records.

The external provider apply side effect remains outside this boundary. A future manual-gated provider executor may report that provider apply started and succeeded; this boundary then records the durable state transition safely.

## In-Memory Contract

`TransactionalProviderDeploymentRepository` defines:

- `beginApplyTransaction`
- `commitApplyTransaction`
- `rollbackApplyTransaction`

`InMemoryTransactionalProviderDeploymentRepository` simulates the transaction-like unit for tests. It rejects unsafe summaries, duplicate transaction IDs, duplicate audit IDs, unapproved manual gates, target commit mismatches, target environment mismatches, invalid provider job transitions, and audit append failures.

## Postgres Design Notes

Future Postgres implementation should use the following shape:

1. `BEGIN`
2. `SELECT ... FOR UPDATE` the manual gate row by `manual_gate_id`
3. verify status `approved`, target commit, target environment, expiry, and gate type
4. `SELECT ... FOR UPDATE` the provider deployment job row by `job_id`
5. update provider job status and safe flags
6. update manual gate status to `used`
7. insert provider deployment audit rows
8. insert manual gate audit row
9. `COMMIT`

Provider apply itself is an external side effect and cannot be fully enclosed in the database transaction. If provider apply succeeds but marking the manual gate used fails, record `compensation_required` on a failed job and hand off to the operator runbook.

## Safety Rules

- Applied jobs require `external_provider_apply_started`, `manual_gate_mark_used_attempted`, and `manual_gate_mark_used_succeeded`.
- `compensation_required` is valid only on failed jobs after provider apply started and manual gate mark-used failed.
- Audit records are safe summaries only.
- Secret values, private URLs, wallet addresses, raw messages, raw display names, raw YouTube author IDs, raw payloads, provider diagnostic payloads, raw GitHub logs, stdout/stderr bodies, and stack traces are forbidden.
- Manual gate records store secret references only; they are not secret storage.

## Out Of Scope

- real provider SDK apply
- actual production deployment apply
- secret manager real SDK integration
- live YouTube operation
- DB-backed transaction implementation
- runtime readiness claim
- production readiness claim
