<!-- CODEX_QUALITY_HARNESS_FILE v1.0.7 -->
# Required Checks Metadata

Required check metadata is a safe summary of GitHub check state. It records
check name, workflow name, status, conclusion, head SHA, check run ID, workflow
run ID, run attempt, started time, and completed time only. It does not read or
store raw logs.

The exporter separates quality-gate status from merge readiness:

- quality-gate success alone is insufficient.
- `typescript`, `contracts`, and `quality-gate` must all pass.
- all three required checks must belong to the same head SHA.
- all three required checks must have `status: completed`.
- all three required checks must have `conclusion: success`.
- all three required checks must have non-empty check run and workflow run IDs.
- missing safe CI artifacts for failed checks are terminal blockers.

The exporter uses GitHub PR `statusCheckRollup` metadata rather than `gh pr
checks` display buckets. Display buckets are operator UI, not machine decision
authority.

When duplicate required check names exist, the exporter selects the latest
same-head completed check by run attempt and completion time. If recency is
ambiguous, the metadata fails closed.

Running, queued, cancelled, timed out, action-required, skipped, or neutral
checks are preserved as their original status/conclusion and must not be
rewritten into completed failure or completed success.

Safe reason codes include `same_head_required_checks_not_all_pass`, `quality_gate_pass_but_required_check_failed`, `required_check_name_mismatch`, and `safe_artifact_missing_for_failed_ci`.

When every required check passes on the same head, the safe reason code is `same_head_required_checks_all_pass`. This success state must not use `product_code_failure`.
