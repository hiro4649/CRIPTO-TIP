# Postgres Adapter Owner Approval Checklist

CODEX_QUALITY_HARNESS_FILE v1.1.5

This checklist is required before any future PR introduces a real DB driver,
real Postgres connection, live DB integration environment, or production-like
adapter execution.

## Required Approval Items

- Project owner approval for real DB integration scope.
- DB driver package choice approved.
- `package.json` and lockfile change explicitly authorized.
- Migration apply plan approved.
- Rollback plan approved.
- Secret manager scope approved.
- DB credential storage approved.
- Live integration test environment approved.
- Manual gate production policy approved.
- Exact row parser contract approved for manual gate and provider job rows.
- Manual gate status, ISO UTC timestamp, and provider audit action vocabulary
  tests approved.
- Provider apply executor remains separate from DB transaction recording.
- Operator compensation handoff is rehearsed before production use.
- No production readiness claim until live DB soak tests, required checks, and
  quality-gate pass on the same head.

## Forbidden Without Separate Scope

- Real provider SDK apply.
- Actual production deployment apply.
- Production DB credential commit.
- Raw DB logs in PR body or docs.
- YouTube scraping.
- Runtime, production, legal, or YouTube policy readiness claims.

## Approval Evidence Rules

Manual gate records and audit logs store references and safe summaries only.
They must never store secret values, private URLs, wallet addresses, raw user
messages, raw display names, OAuth tokens, API keys, webhook URLs, stdout,
stderr, or stack traces.

## DB Integration Scope Gate v1.1.6 Prep

- DB integration scope gate record must be present and defaulted to not approved.
- Real DB driver, package.json change, pnpm-lock change, live DB integration tests, migration execution, and real DB connection require a future owner-approved PR.
- The gate is approval evidence only; it is not secret storage and it is not runtime readiness evidence.
