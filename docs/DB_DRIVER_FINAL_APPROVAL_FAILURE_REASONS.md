# DB Driver Final Approval Failure Reasons

The final approval gate uses stable blocker IDs so the quality gate and reviewers can identify why a
future DB driver dependency PR is not yet approved.

## Approval And Readiness

- `owner_approval_not_approved`
- `owner_approval_fingerprint_not_valid`
- `readiness_report_not_ready`
- `preflight_policy_not_pass`
- `approval_dry_run_not_pass`
- `driver_not_selected`
- `selected_driver_source_mismatch`

## Required Reviews

- `license_review_missing`
- `supply_chain_review_missing`
- `security_advisory_review_missing`
- `version_pinning_review_missing`
- `lockfile_review_missing`
- `package_diff_review_missing`
- `secret_boundary_review_missing`

## Permission Boundaries

- `package_change_not_approved`
- `pnpm_lock_change_not_approved`
- `real_db_connection_not_approved`
- `live_db_integration_not_approved`
- `migration_apply_not_approved`
- `provider_sdk_apply_forbidden`
- `production_deployment_forbidden`
- `runtime_readiness_claim_forbidden`
- `production_readiness_claim_forbidden`
- `legal_compliance_claim_forbidden`
- `youtube_policy_compliance_claim_forbidden`

## Evidence Safety

- `unsafe_evidence_rejected`
- `raw_log_reference_rejected`
- `selected_driver_forbidden_in_committed_evidence`
- `approved_gate_forbidden_in_committed_evidence`

The committed evidence for this PR must remain blocked and must not contain selected driver,
approved-gate, raw-log, secret, private URL, wallet address, or token-like evidence.
