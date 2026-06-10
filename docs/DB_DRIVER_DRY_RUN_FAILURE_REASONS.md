# DB Driver Dry-Run Failure Reasons

Failure reasons are safe-summary identifiers. They must not include raw logs, stdout or stderr bodies, stack traces, endpoint values, private URLs, real credentials, wallet addresses, or raw provider payloads.

Fixable evidence gaps:

- `owner_approval_missing`
- `driver_not_selected`
- `preflight_policy_missing`
- `license_review_missing`
- `supply_chain_review_missing`
- `security_advisory_review_missing`
- `version_pinning_review_missing`
- `lockfile_review_missing`
- `package_diff_review_missing`
- `secret_boundary_review_missing`

Target or approval binding failures:

- `owner_approval_expired`
- `owner_approval_target_mismatch`
- `owner_approval_fingerprint_mismatch`
- `owner_approval_scope_missing`
- `driver_not_allowed`

Forbidden or terminal scope failures:

- `package_change_without_approval`
- `pnpm_lock_change_without_approval`
- `real_db_connection_without_approval`
- `migration_change_without_approval`
- `provider_sdk_apply_forbidden`
- `production_deployment_forbidden`
- `runtime_readiness_claim_forbidden`
- `production_readiness_claim_forbidden`
- `legal_compliance_claim_forbidden`
- `youtube_policy_compliance_claim_forbidden`
- `unsafe_evidence_rejected`
- `raw_log_reference_rejected`

Raw GitHub logs remain forbidden for diagnosing these failures. Use safe artifacts and safe reason codes only.

## Mapping Notes

- `legal_compliance_claim_forbidden` is emitted when license review evidence or top-level dry-run inputs attempt to claim legal compliance.
- `raw_log_reference_rejected` is emitted when unsafe evidence references raw GitHub log retrieval, raw stdout, raw stderr, stack traces, file contents, dependency trees, or log URLs.
- `unsafe_evidence_rejected` covers secret-like keys or values, private URLs, wallet addresses, token-like values, DB URLs, and raw provider payload references.
- `owner_approval_target_mismatch` covers target commit, branch, PR number, repository, base commit, selected driver, or target binding mismatch.
- `owner_approval_scope_missing` covers owner approval records that do not include the required DB driver dependency, package change, and lockfile approval scopes.

The current implementation maps owner approval validator errors through safe error categories. If future owner approval validation needs finer reporting, add typed owner approval error codes in a separate PR rather than parsing raw logs or broad error payloads.
