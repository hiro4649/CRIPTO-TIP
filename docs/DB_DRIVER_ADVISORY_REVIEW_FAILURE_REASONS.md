# DB Driver Advisory Review Failure Reasons

The advisory envelope uses explicit blockers so future reviewers cannot treat
missing review evidence as approval.

## Blocker Vocabulary

- `advisory_review_not_reviewed`
- `cve_review_not_reviewed`
- `package_audit_review_not_reviewed`
- `known_blockers_not_reviewed`
- `raw_output_policy_required`
- `advisory_source_not_reviewed`
- `freshness_not_ready`
- `owner_approval_not_approved`
- `final_approval_gate_blocked`
- `driver_not_selected`
- `selected_driver_forbidden`
- `package_change_forbidden`
- `pnpm_lock_change_forbidden`
- `db_driver_dependency_forbidden`
- `real_db_connection_forbidden`
- `migration_execution_forbidden`
- `live_db_integration_forbidden`
- `provider_sdk_apply_forbidden`
- `production_deployment_forbidden`
- `runtime_readiness_claim_forbidden`
- `production_readiness_claim_forbidden`
- `legal_compliance_claim_forbidden`
- `youtube_policy_compliance_claim_forbidden`
- `unsafe_evidence_rejected`
- `raw_log_reference_rejected`
- `raw_advisory_output_rejected`
- `raw_audit_output_rejected`
- `raw_dependency_tree_rejected`

## Known Blockers Semantics

`knownBlockersStatus: not_reviewed` with `knownBlockers: null` is the only
valid committed state for this PR. `knownBlockers: []` is future reviewed
evidence and must not be committed here.

## Raw Output Rejection

Raw advisory output, raw audit output, raw dependency trees, terminal output,
stack traces, and raw GitHub logs are rejected because they may contain
excessive, unsafe, stale, or secret-shaped data.
