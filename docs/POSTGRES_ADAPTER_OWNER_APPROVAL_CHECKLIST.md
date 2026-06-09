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
