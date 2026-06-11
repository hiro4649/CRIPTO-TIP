# DB Driver Source Evidence Safe Summary Failure Reasons

Blocker vocabulary:

- `safe_summary_contract_ready_not_review_approval`
- `source_evidence_not_reviewed`
- `safe_summary_not_reviewed`
- `safe_summary_binding_not_reviewed`
- `raw_payload_forbidden`
- `raw_payload_detected`
- `forbidden_raw_field_detected`
- `forbidden_wording_detected`
- `known_blockers_not_reviewed`
- `known_blockers_empty_array_forbidden`
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
- `raw_osv_output_rejected`
- `raw_npm_registry_output_rejected`
- `raw_dependency_tree_rejected`
- `future_fixture_only`

Current evidence may not use `knownBlockers: []` as proof that no blockers
exist. Current evidence remains `not_reviewed`.

Safe summaries must avoid overclaim wording such as clean, no vulnerabilities,
no advisories, approved, security clean, safe to install, runtime ready,
production ready, legally safe, or policy compliant.
