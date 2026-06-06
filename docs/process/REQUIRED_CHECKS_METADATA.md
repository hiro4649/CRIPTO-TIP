<!-- CODEX_QUALITY_HARNESS_FILE v1.0.7 -->
# Required Checks Metadata

Required check metadata is a safe summary of GitHub check state. It records check name, workflow name, status, conclusion, head SHA, and run ID only. It does not read or store raw logs.

The exporter separates quality-gate status from merge readiness:

- quality-gate success alone is insufficient.
- `typescript`, `contracts`, and `quality-gate` must all pass.
- all three required checks must belong to the same head SHA.
- missing safe CI artifacts for failed checks are terminal blockers.

Safe reason codes include `same_head_required_checks_not_all_pass`, `quality_gate_pass_but_required_check_failed`, `required_check_name_mismatch`, and `safe_artifact_missing_for_failed_ci`.
