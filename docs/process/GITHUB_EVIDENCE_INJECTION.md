# GitHub Evidence Injection

`scripts/fetch-github-run-evidence.mjs` updates the evidence pack with the
active pull request head SHA, base SHA, latest successful product CI run,
latest successful quality-gate run, and the
`codex-quality-gate-safe-artifacts` artifact ID.

The script is fail-closed:

- It rejects successful workflow runs from a stale head SHA.
- It rejects a missing `codex-quality-gate-safe-artifacts` artifact.
- It only accepts a quality-gate artifact from the selected successful
  quality-gate run for the active pull request head.
- It rejects fixture or API evidence when the PR head differs from a concrete
  head SHA already recorded in `.codex/evidence-pack.json`.
- It requires GitHub API access through `GITHUB_TOKEN` or `gh` unless
  `--offline-readonly` is explicitly supplied.
- `--offline-readonly` never mutates evidence, is for local inspection only,
  and is not merge-ready evidence.

The refresh flow is:

1. Run `node scripts/fetch-github-run-evidence.mjs --pr <number> --repo hiro4649/CRIPTO-TIP`.
2. Run `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-*.md`.
3. Run `node scripts/check-evidence-placeholders.mjs`.
4. Run `node scripts/validate-evidence-freshness.mjs` with the expected head,
   CI run, quality-gate run, quality-gate artifact, and test count.
5. Update the PR body with the rendered PR doc.

`scripts/refresh-pr-evidence.mjs` performs fetch, render, placeholder check,
and PR body update in order. A placeholder check failure or `gh pr edit`
failure is a command failure.

No secret values are fetched or stored by this process. Evidence contains only
GitHub run identifiers, artifact identifiers, safe summaries, and review
metadata.
