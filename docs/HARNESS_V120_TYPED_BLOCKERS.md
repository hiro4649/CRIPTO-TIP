# Harness v1.2.0 Typed Blockers

`V120_TYPED_BLOCKERS` gives repeated blocker states stable IDs so reviews can be shorter and more precise.

Typed blockers:

- `stale_evidence`
- `forbidden_scope`
- `missing_same_head_checks`
- `unsafe_output`
- `package_lock_change_forbidden`
- `runtime_readiness_claim_forbidden`
- `owner_approval_required`
- `raw_log_forbidden`

Typed blockers are not bypasses. They are labels for stop conditions that must be resolved or explicitly preserved as blocked.

