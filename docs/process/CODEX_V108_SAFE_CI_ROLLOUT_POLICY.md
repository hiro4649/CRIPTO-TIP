<!-- CODEX_QUALITY_HARNESS_FILE v1.0.7 -->

# Codex Harness v1.0.8 Safe CI Rollout Policy

v1.0.8 rollout scope is limited to safe CI failure evidence and current-head
required-check proof. It does not claim product runtime readiness and does not
change CRIPTO-TIP product runtime, wallet, RPC, deployment, YouTube connector,
Chain Listener, or IRIS delivery behavior.

## Required Boundaries

- Safe CI artifacts remain safe-summary only.
- Raw CI transcript bodies are not copied into repository evidence, PR body, or
  quality-gate artifacts.
- Same-head all-pass metadata uses `same_head_required_checks_all_pass`.
- `product_code_failure` is reserved for actual product-code failure evidence
  and is never used to describe same-head required-check success.
- Required safe artifact uploads fail closed when missing.
- PR #23 remains closed and is not reused as rollout evidence.

## Required Safe Artifacts

The CI workflow must upload these artifacts with `if-no-files-found: error`:

- `pnpm-typecheck-safe-summary`
- `pnpm-test-safe-summary`
- `ci-safe-failure-artifact`
- `ci-required-checks-metadata`

If typecheck fails before tests run, the pnpm test safe summary records
`pnpm_test_result: not_run_due_to_typecheck_failure` and
`raw_log_allowed: false`. It must not claim `pnpm_test_failed_safe_summary`.

## Merge Boundary

v1.0.8 rollout is mergeable only when the active pull request head has:

- typescript pass
- contracts pass
- quality-gate pass
- evidence placeholder check pass
- evidence freshness check pass
- quality self-protection pass
- no secret scan pass
- no scraping scan pass

The rollout PR itself is not a production-readiness claim.
