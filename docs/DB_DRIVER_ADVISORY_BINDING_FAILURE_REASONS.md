# DB Driver Advisory Binding Failure Reasons

The binding dry-run uses explicit blocker vocabulary so future DB driver
dependency work cannot treat incomplete advisory evidence as approval.

Blocking reasons include:

- `binding_not_reviewed`
- `source_policy_not_reviewed`
- `advisory_envelope_not_reviewed`
- `driver_not_selected`
- `source_category_not_reviewed`
- `source_binding_not_reviewed`
- `source_timestamp_not_reviewed`
- `source_freshness_not_reviewed`
- `package_name_not_bound`
- `package_version_not_bound`
- `target_commit_not_bound`
- `pr_number_not_bound`
- `branch_not_bound`
- `safe_summary_not_bound`
- `known_blockers_not_reviewed`
- `owner_approval_not_approved`
- `final_approval_gate_blocked`
- `source_category_forbidden`
- `source_timestamp_invalid`
- `source_binding_mismatch`
- `package_version_invalid`
- `future_fixture_only`

Raw output related blockers include raw log, advisory, audit, OSV, npm registry,
dependency tree, and terminal output rejection. These are not allowed in PR
docs, machine evidence, or committed fixtures.
