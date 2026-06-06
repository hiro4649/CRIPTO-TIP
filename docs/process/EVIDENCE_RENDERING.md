# Evidence Rendering

`.codex/evidence-pack.json` is the review source for PR evidence in this repository.

Use:

- `node scripts/write-test-summary.mjs`
- `node scripts/fetch-github-run-evidence.mjs --pr <number> --repo hiro4649/CRIPTO-TIP`
- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-evidence-single-source-of-truth.md`
- `node scripts/validate-evidence-freshness.mjs`
- `node scripts/check-evidence-placeholders.mjs`

The renderer preserves the quality-gate-required PR sections:

- Task Contract
- Evidence Integrity
- Testing and review
- Test Coverage Evidence
- Security Boundaries
- Residual risks
- Human Confirmation

Evidence files must not contain real secrets, private URLs, OAuth tokens, API keys, wallet addresses, raw user messages, or raw display names. GitHub run IDs and artifact IDs are injected after push and must match the active pull request head before merge.

For source-of-truth PRs that modify the evidence pack itself, the pack may use
`current_pr_head` and `current_pr_base`. These are not merge placeholders; the
validator resolves them from the GitHub pull request event and writes the actual
SHA values into normalized safe artifacts. Rendered PR docs should still be
generated with explicit `--head` and `--base` values before merge.

GitHub run and artifact evidence is supplied by
`scripts/fetch-github-run-evidence.mjs`. It selects only successful runs for the
active pull request head and requires the `codex-quality-gate-safe-artifacts`
artifact before mutating the evidence pack.

## Safe CI Failure Evidence

Safe CI failure artifacts are evidence inputs only after they are reduced to
safe summaries. Rendered PR bodies must not include raw CI logs, stdout/stderr
bodies, stack traces, source file snippets, dependency trees, secret values,
wallet addresses, OAuth tokens, API keys, private URLs, or full test failure
output.
