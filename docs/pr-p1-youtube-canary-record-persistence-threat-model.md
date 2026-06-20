# docs: define youtube canary record persistence threat model

## Task Contract

PR profile: docs_only_r1_r2
Task mode: docs_only
Risk level: R2

Affected entrypoints: none; this is docs-only and does not change server,
routes, repositories, API handlers, web UI, overlay UI, contracts, migrations,
or runtime behavior.

Failure paths considered: persistence records treated as execution authority,
safe hashes treated as signatures or approval, replay/idempotency gaps, access
control owner decisions missing, retention/deletion ambiguity, raw storage
diagnostics leaking through future read paths, and record creation before receipt
evaluation.

## Goal

Define the persistence threat model for YouTube canary authorization records and
audit receipts before any repository, route, database, or migration work begins.

This PR is docs-only. It does not change product runtime behavior.

## Evidence Integrity

Head SHA: current_pr_head

Base SHA: current_pr_base

Product CI status before PR creation: not yet available

Quality-gate status before PR creation: not yet available

## Files or scope

Files changed:

- `.codex/evidence-pack.json`
- `.codex/p1-youtube-canary-record-persistence-threat-model.json`
- `docs/P1_YOUTUBE_CANARY_RECORD_PERSISTENCE_THREAT_MODEL.md`
- `docs/pr-p1-youtube-canary-record-persistence-threat-model.md`

No runtime, server, route, repository, package, lockfile, workflow, contract, or
migration files are in scope.

## Validation

Validation uses docs-only repository evidence checks. Runtime smoke is not
applicable because no executable product surface changes.

## Product verification

Skip reason: docs-only change with no product runtime behavior, route,
repository, DB, migration, package, lockfile, workflow, web, overlay, contract,
or readiness change.

Product verification is documentation-only for this PR. The local verification
set before PR creation was:

Product verification commands:

- `node scripts/check-evidence-placeholders.mjs`: pass
- `node scripts/validate-evidence-freshness.mjs`: pass
- `node scripts/codex-secret-safety-scan.mjs`: pass
- `corepack pnpm evidence:ci`: pass
- `corepack pnpm quality:self-protection`: pass
- `node scripts/codex-v127-self-test.mjs`: pass
- `git diff --check`: pass

No product runtime smoke is applicable because no runtime code, route, repository,
database, migration, package, lockfile, workflow, contract, web, or overlay file
is changed.

## Scope

Allowed scope:

- docs/P1_YOUTUBE_CANARY_RECORD_PERSISTENCE_THREAT_MODEL.md
- docs/pr-p1-youtube-canary-record-persistence-threat-model.md
- .codex/p1-youtube-canary-record-persistence-threat-model.json
- .codex/evidence-pack.json

Forbidden scope:

- package.json
- pnpm-lock.yaml
- .github/workflows
- contracts
- migrations
- apps/api/src/server.ts
- apps/api/src/routes
- apps/api/src/repositories
- real DB connection
- DB driver dependency
- real YouTube OAuth
- real YouTube API execution
- wallet, RPC, or deploy changes

## Threat Model Coverage

The document covers storage owner boundaries, write/read/revoke authority,
authority separation, safe hash correlation, append-only event model, current
state projection, state transitions, replay prevention, idempotency, optimistic
concurrency, access control owner decisions, retention and deletion decisions,
backup/restore, clock policy, read-time integrity, and typed failure taxonomy.

## Best of N Evidence

Candidate count: 3

Selected candidate: A - docs-only persistence threat model before any storage
implementation.

Reason selected: Candidate A resolves the design and safety boundary first,
without adding repository, route, DB, migration, dependency, OAuth, or execution
authority.

Rejected candidate B: implement repository and database schema now. This was
rejected because access control, retention, deletion, replay prevention, and
read-time integrity decisions must be documented before storage work.

Rejected candidate C: treat safe hashes as persistence authority. This was
rejected because safe hashes are correlation identifiers only and are not
signatures, owner approval, execution authority, or readiness evidence.

## Test Coverage Evidence

Changed area: docs-only persistence threat model and machine-readable `.codex`
evidence.

What is covered: authority separation, safe hash correlation boundary,
append-only/current-state split, state transitions, replay prevention,
idempotency, optimistic concurrency, access control owner-decision boundaries,
retention/deletion owner-decision boundaries, backup/restore, clock policy,
read-time integrity, and typed failure taxonomy.

Validation oracle: placeholder check, evidence freshness check, secret safety
scan, evidence CI, quality self-protection, v1.2.7 self-test, and diff check.

Test command: docs-only evidence checks listed in Product verification commands.

What the test covers: placeholder-free evidence, fresh evidence fields, safe
secret scan, quality-gate self-protection, v1.2.7 harness self-test, and
docs-only diff hygiene.

Edge cases and failure paths: stale evidence, forbidden placeholders, accidental
secret-like text, quality-gate weakening, runtime scope drift, and docs-only PRs
being mistaken for executable implementation changes.

Runtime tests are not applicable because the PR intentionally changes no runtime
code.

## Security Boundaries

- no code changed
- no route implemented
- no repository implemented
- no migration created
- no DB driver dependency added
- no real DB execution
- no package.json change
- no pnpm-lock.yaml change
- no workflow change
- no runtime readiness claim
- no production readiness claim
- no legal compliance claim
- no YouTube policy compliance claim
- no owner approval created
- no GitHub approval review created
- no merge authority created

## Residual Risks

Owner decisions remain pending for access control, retention, deletion, and audit
retrieval permissions. A later implementation PR must convert this threat model
into tested repository and route contracts without weakening the non-executable
boundary.

## Human Confirmation

AI technical review may recommend merge after same-head checks pass, but this PR
does not create human/project-owner approval, GitHub approval review, owner
approval record, or merge authority.
