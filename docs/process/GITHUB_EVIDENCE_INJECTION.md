# GitHub Evidence Injection

`scripts/fetch-github-run-evidence.mjs` updates the evidence pack with the
active pull request head SHA, base SHA, latest successful product CI run,
latest successful quality-gate run, and the
`codex-quality-gate-safe-artifacts` artifact ID.

The script is fail-closed:

- It rejects successful workflow runs from a stale head SHA.
- It rejects a missing `codex-quality-gate-safe-artifacts` artifact.
- It requires GitHub API access through `GITHUB_TOKEN` or `gh` unless
  `--offline-readonly` is explicitly supplied.
- `--offline-readonly` never mutates evidence and is for local inspection only.

The refresh flow is:

1. Run `node scripts/fetch-github-run-evidence.mjs --pr <number> --repo hiro4649/CRIPTO-TIP`.
2. Run `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-*.md`.
3. Run `node scripts/check-evidence-placeholders.mjs`.
4. Run `node scripts/validate-evidence-freshness.mjs` with the expected head and run IDs.
5. Update the PR body with the rendered PR doc.

No secret values are fetched or stored by this process. Evidence contains only
GitHub run identifiers, artifact identifiers, safe summaries, and review
metadata.
