<!-- CODEX_QUALITY_HARNESS_FILE v1.0.7 -->
# CI Safe Failure Artifacts

CRIPTO-TIP remains on active harness v1.0.7. PR #23, the attempted v1.0.8 rollout, is closed without merge and must not be reused as evidence.

This boundary adds raw-log-free CI failure diagnosis for future clean rollout attempts. It does not rerun v1.0.8, does not claim runtime readiness, and does not change product runtime code.

## Artifact Contract

The `typescript` job writes safe summaries for:

- `pnpm-typecheck-safe-summary`
- `pnpm-test-safe-summary`
- `ci-safe-failure-artifact`
- `ci-required-checks-metadata`

The artifacts contain check metadata, command class, phase, exit code, package scope, working directory, head SHA, run ID, safe reason code, and next safe action. They must not contain raw logs, stdout or stderr bodies, stack traces, source file contents, dependency trees, secret values, wallet addresses, OAuth tokens, API keys, private URLs, or full test failure output.

`raw_log_allowed` is always `false`. If metadata is insufficient, `raw_log_required` may be `true`, but the safe reason must remain `raw_log_required_but_forbidden` or `metadata_limited_external_blocked`.

## Merge Readiness Boundary

Quality-gate pass alone is not merge readiness. The required checks are:

- `quality-gate`
- `typescript`
- `contracts`

All required checks must pass on the same head SHA. Missing checks, mixed heads, unexpected check names, or quality-gate pass with a failed required check are blockers.

## Future v1.0.8 Precondition

A future v1.0.8 re-rollout requires a fresh PR, clean main, safe CI failure artifacts available, and same-head required checks passing. PR #23 remains terminal blocked and closed without merge.
