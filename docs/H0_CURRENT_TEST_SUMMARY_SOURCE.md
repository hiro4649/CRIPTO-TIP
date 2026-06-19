# H0 Current Test Summary Source

`scripts/write-test-summary.mjs` now requires a same-run test summary input. It
no longer copies `.codex/evidence-pack.json` test counts when no input is
provided.

Accepted sources:

- `--from <current vitest text summary>`
- `--from-json <current vitest json result>`
- `--safe-summary <same-run safe pnpm test summary>`

If no current-run input is provided, the script fails closed with
`test_summary_current_run_input_required`.

The generated `.codex/test-summary.json` records `sourceType`,
`currentRunEvidence: true`, `headSha`, `createdAt`, and safe aggregate counts.
It does not store raw stdout, stderr, stack traces, or failure message bodies.

This change does not alter product runtime behavior.
