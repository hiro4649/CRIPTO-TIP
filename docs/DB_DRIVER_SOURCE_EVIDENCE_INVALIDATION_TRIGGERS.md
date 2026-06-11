# DB Driver Source Evidence Invalidation Triggers

Invalidation means the evidence cannot be used for driver selection until a
future safe source review is repeated and rebound to the current dependency PR.

Required invalidation reasons:

- `target_commit_changed`
- `base_commit_changed`
- `pr_number_changed`
- `target_branch_changed`
- `package_name_changed`
- `package_version_changed`
- `source_category_policy_changed`
- `source_timestamp_expired`
- `source_expires_at_missing`
- `source_checked_at_missing`
- `package_json_changed`
- `pnpm_lock_changed`
- `dependency_graph_changed`
- `new_advisory_detected`
- `raw_output_detected`
- `selected_driver_wording_detected`
- `runtime_readiness_claim_detected`
- `production_readiness_claim_detected`
- `legal_compliance_claim_detected`
- `youtube_policy_compliance_claim_detected`

Invalidated evidence requires a future safe-source review. It must not be
converted into `knownBlockers: []`, approval, selected driver evidence, package
diff approval, lockfile approval, or production readiness evidence.
