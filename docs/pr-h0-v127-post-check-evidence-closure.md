# H0 v1.2.7 Post-Check Evidence Closure

## Task Contract

Fix required-check evidence generation so the final safe metadata is generated
after required checks complete, not from inside the `typescript` job while that
job is still running.

## Evidence Integrity

This PR moves `ci-required-checks-metadata` generation to the `quality-gate`
workflow as a post-gate `required-check-evidence` job. The exporter uses exact
commit check-runs metadata and records safe projections only.

## Testing and Review

Local validation focuses on the required-check metadata exporter, validator,
workflow placement, and regression fixtures for running, failed, mixed-head,
metadata-limited, duplicate, and auxiliary-check cases.

Product verification commands:

- `corepack pnpm vitest run apps/api/src/evidence-rendering.test.ts`: pass
- `corepack pnpm lint`: pass
- `corepack pnpm typecheck`: pass
- `corepack pnpm test`: pass
- `npm test`: pass
- `corepack pnpm evidence:ci`: pass
- `corepack pnpm quality:self-protection`: pass
- `node scripts/codex-secret-safety-scan.mjs`: pass
- `node scripts/codex-v127-self-test.mjs`: pass
- `node scripts/codex-v126-self-test.mjs`: pass
- `node scripts/codex-v125-self-test.mjs`: pass
- `node scripts/codex-v124-self-test.mjs`: pass
- `node scripts/codex-v123-self-test.mjs`: pass

## Security Boundaries

No raw GitHub logs are read. No raw outputs, details URLs, secrets, private
endpoints, wallet/RPC values, package changes, DB driver dependencies, real DB
connections, migrations, production readiness, runtime readiness, legal
compliance, or YouTube policy compliance are introduced.

## Residual Risks

GitHub check-run metadata availability remains an external dependency. If the
metadata API is unavailable, the exporter fails closed with safe metadata rather
than reading raw logs.

## Human Confirmation

This PR does not create owner approval, GitHub approval review, merge authority,
release authority, or deploy authority.
