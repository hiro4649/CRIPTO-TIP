# Evidence Rendering

`.codex/evidence-pack.json` is the review source for PR evidence in this repository.

Use:

- `node scripts/write-test-summary.mjs`
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

Evidence files must not contain real secrets, private URLs, OAuth tokens, API keys, wallet addresses, raw user messages, or raw display names. GitHub run IDs and artifact IDs are injected after push and must match the current PR head before merge.

For source-of-truth PRs that modify the evidence pack itself, the pack may use
`current_pr_head` and `current_pr_base`. These are not merge placeholders; the
validator resolves them from the GitHub pull request event and writes the actual
SHA values into normalized safe artifacts. Rendered PR docs should still be
generated with explicit `--head` and `--base` values before merge.
