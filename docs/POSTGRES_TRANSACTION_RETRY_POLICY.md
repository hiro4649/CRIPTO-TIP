# Postgres Transaction Retry Policy

This policy classifies durable provider apply transaction recording failures.
It does not authorize re-executing external provider apply.

## Retryable

- `deadlock_detected` maps to `postgres_transaction_deadlock_retryable`.
- `serialization_failure` maps to `postgres_transaction_serialization_retryable`.
- `lock_timeout` maps to `postgres_transaction_lock_timeout_retryable` only
  when the provider apply result is already identified by safe idempotency
  metadata.

Retry means retry durable state recording only. It must not call provider apply
again.

For `lock_timeout`, operator action text is context-aware. Before provider
success, retry is limited to pre-apply or metadata-only planning. After provider
success, retry is durable state recording only and must explicitly say not to
re-execute provider apply.

## Terminal

- Duplicate `transaction_id` or equivalent unique violation maps to
  `postgres_transaction_unique_violation_terminal`.
- Unapproved manual gate maps to
  `postgres_transaction_manual_gate_not_approved_terminal`.
- Manual gate type, commit, or environment mismatch maps to
  `postgres_transaction_manual_gate_mismatch_terminal`.
- Invalid provider job state transition maps to
  `postgres_transaction_job_transition_invalid_terminal`.
- Unsafe summary values map to `postgres_transaction_unsafe_summary_terminal`.
- Provider diagnostic payload fields map to
  `postgres_transaction_raw_provider_response_terminal`.

## Compensation Required

When provider apply succeeded but audit append or durable transaction completion
failed, the failure maps to
`postgres_transaction_audit_append_failed_compensation_required`.

The operator next action is compensation handoff. The system must not infer that
the provider side effect was rolled back.

## Metadata Limited External Blocked

Unknown or insufficiently classified failures map to
`postgres_transaction_metadata_limited_external_blocked`. The next action is to
inspect safe metadata only, then choose retry, terminal closure, or compensation
handoff.

## Adapter-Level Classification

The adapter skeleton exposes retry classification without executing provider
apply. Deadlock, serialization failure, and lock timeout are retryable. Unique
violation, manual gate mismatch, unsafe summaries, and raw provider response
attempts are terminal.

If `COMMIT` fails after provider success, the adapter returns
`compensation_required` and instructs the operator not to re-execute provider
apply. This outcome is metadata-limited because the durable transaction result
can be unknown at the boundary; the adapter must not claim rollback completed
after a failed `COMMIT`. Operators must inspect durable safe evidence before
retrying. If `COMMIT` fails before provider success, no compensation is
required. Rollback failure is metadata-limited; expanded command diagnostics
remain forbidden.

Audit append row-count failures classify as `audit_append_failed`. Before
provider success they do not require compensation. After provider success they
require compensation handoff and must not be mislabeled as a provider job
transition error.

## Safe Artifact Expectations

Safe artifacts may contain reason codes, phase names, booleans, counts, and safe
references. They must not contain GitHub Actions log downloads, provider
diagnostic payloads, stdout/stderr bodies, stack traces, secrets, private URLs,
wallet addresses, user message bodies, display names, OAuth tokens, or API keys.
