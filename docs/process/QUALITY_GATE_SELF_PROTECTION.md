# Quality Gate Self-Protection

This repository treats quality-gate weakening as a release blocker. The required
path is intentionally narrow: executable workflow and script surfaces are checked
for changes that can make the gate pass without running the gate, without writing
safe summaries, or without uploading safe artifacts.

## Required Checks

- `quality:self-protection` verifies the quality-gate workflow still contains
  the `Run Codex quality gate`, `Write safe quality summary`, and `Upload safe
  quality artifacts` steps.
- `quality:self-protection` verifies the safe artifact bundle name remains
  `codex-quality-gate-safe-artifacts`.
- `quality:self-protection` rejects `continue-on-error: true` in the
  quality-gate workflow.
- `quality:self-protection` rejects optionalizing the workflow quality runner.
- `quality:self-protection` requires safe artifact upload to fail if no safe
  artifacts are present.
- `evidence:ci` runs placeholder checks, evidence freshness structure checks,
  and quality-gate self-protection without mutating PR body content.

## Scope

The checker focuses on executable workflow and script paths. Documentation
examples are not treated as executable gate weakening. The allowlist is limited
to existing lifeboat, artifact, optional, and fallback handling that preserves
safe summary output.

## Provider-Safe Evidence

Provider-specific dashboard apply, external alert apply, live YouTube soak,
provider secret rotation, and provider-specific deployment apply remain
manual-gated. Evidence files store secret references only and must not contain
secret values, wallet addresses, raw user messages, raw display names, private
URLs, OAuth tokens, API keys, webhook URLs, or provider credentials.

## Merge Blockers

- Removed quality-gate run step.
- Removed safe summary write step.
- Removed safe artifact upload step.
- Safe artifact upload configured to ignore missing artifacts.
- `continue-on-error: true` in the quality-gate workflow.
- Always-pass, ignore-failure, or skip-quality wording in executable scripts.
- Evidence placeholders in `.codex`, `docs`, `.github`, `README.md`, or
  `package.json`.
- Stale or unresolved evidence head values in CI validation mode.

## Safe CI Artifact Allowance

`if: always()` is allowed only for safe artifact generation and upload after
required commands run. Required typecheck and test wrappers must preserve the
failing exit code; they must not convert failed product checks into successful
required checks.

## Safe Artifact Upload Guard

Required safe artifact upload paths must not use `if-no-files-found: warn` or `ignore`. Missing safe artifacts are fail-closed evidence failures.
