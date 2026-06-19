<!-- CODEX_QUALITY_HARNESS_FILE v1.0.7 -->
# CI Safe Failure Artifacts

CRIPTO-TIP remains on active harness v1.0.7. PR #23, the attempted v1.0.8 rollout, is closed without merge and must not be reused as evidence.

This boundary adds raw-log-free CI failure diagnosis for future clean rollout attempts. It does not rerun v1.0.8, does not claim runtime readiness, and does not change product runtime code.

## Artifact Contract

The `typescript` job writes safe summaries for:

- `pnpm-typecheck-safe-summary`
- `pnpm-test-safe-summary`
- `ci-safe-failure-artifact`

The `quality-gate` workflow writes `ci-required-checks-metadata` from a separate
post-gate `required-check-evidence` job. That job runs after `quality-gate`
instead of inside the `typescript` job, so it does not capture `typescript` as
still running and then misrepresent that running snapshot as final evidence.

`ci-required-checks-metadata` is produced from safe GitHub check metadata. It
must preserve status, conclusion, head SHA, check run ID, workflow run ID, run
attempt, and timing fields. It must not use raw logs or display-only check
buckets as machine authority.

The artifacts contain check metadata, command class, phase, exit code, package scope, working directory, head SHA, run ID, safe reason code, and next safe action. They must not contain raw logs, stdout or stderr bodies, stack traces, source file contents, dependency trees, secret values, wallet addresses, OAuth tokens, API keys, private URLs, or full test failure output.

`pnpm-test-safe-summary` may include Vitest aggregate counts, repository-relative failed test file names, and failed test names. It must not include assertion messages, raw failure bodies, stdout, stderr, stack traces, or absolute machine paths.

`raw_log_allowed` is always `false`. If metadata is insufficient, `raw_log_required` may be `true`, but the safe reason must remain `raw_log_required_but_forbidden` or `metadata_limited_external_blocked`.

`same_head_required_checks_all_pass` is the success safe reason code for all required checks passing on the same head. `product_code_failure` is only for an actual product verification failure and must not be used for same-head success.

Required safe artifact uploads use `if-no-files-found: error`. Missing
`pnpm-typecheck-safe-summary`, `pnpm-test-safe-summary`,
`ci-safe-failure-artifact`, or post-required-check `ci-required-checks-metadata`
is a terminal blocker because failed CI must remain diagnosable without raw
logs.

## Merge Readiness Boundary

Quality-gate pass alone is not merge readiness. The required checks are:

- `quality-gate`
- `typescript`
- `contracts`

All required checks must pass on the same head SHA. Missing checks, mixed heads,
incomplete metadata, ambiguous duplicate latest runs, a latest running check, a
latest failed check, or quality-gate pass with a failed required check are
blockers. Auxiliary checks such as `required-check-evidence` may be observed in
the metadata, but they are not themselves required checks.

## Future v1.0.8 Precondition

A future v1.0.8 re-rollout requires a fresh PR, clean main, safe CI failure artifacts available, and same-head required checks passing. PR #23 remains terminal blocked and closed without merge.
