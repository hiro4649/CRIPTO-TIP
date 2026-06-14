# feat: add p0 admin dlq visibility

## Task Contract

This PR adds local/internal admin DLQ visibility only.

It does not use real DB.

It does not add Redis, Kafka, or DB driver dependency.

It does not change package.json or pnpm-lock.

It does not use real YouTube API or OAuth.

It does not claim runtime, production, legal, or YouTube policy readiness.

AI review is not human/project-owner approval.

This PR does not create GitHub approval review.

This PR does not create owner approval record.

This PR does not create merge authority.

## Evidence Integrity

PR current-head evidence is refreshed after PR creation.

The machine-readable evidence is `.codex/p0-admin-dlq-visibility.json`.

## Testing and Review

- admin DLQ list requires admin bearer token.
- missing auth returns 401.
- invalid auth returns 401.
- valid admin bearer returns DLQ list.
- DLQ list returns safe metadata only.
- DLQ list filters by `stream_id`.
- DLQ list excludes raw payload.
- DLQ list excludes secrets and connection strings.
- DLQ duplicate retry does not duplicate admin DLQ list entry.
- moderation hold does not appear in DLQ list.
- existing P0 DLQ retry boundary tests still pass.
- fixture endpoint tests still pass.
- internal/events tests still pass.

## Test Coverage Evidence

- `corepack pnpm vitest run apps/api/src/p0-admin-dlq-visibility.test.ts`: pass
- `corepack pnpm vitest run apps/api/src/p0-admin-dlq-visibility.test.ts apps/api/src/p0-event-pipeline-dlq-retry-boundary.test.ts`: pass, 2 files, 10 passed
- `corepack pnpm --filter @cripto-tip/api typecheck`: pass
- `corepack pnpm install`: pass
- `corepack pnpm lint`: pass
- `corepack pnpm typecheck`: pass
- `corepack pnpm test`: pass, 54 files, 1710 passed, 6 skipped
- `npm test`: pass, 54 files, 1710 passed, 6 skipped
- `corepack pnpm evidence:ci`: pass
- `corepack pnpm quality:self-protection`: pass
- `node scripts/check-evidence-placeholders.mjs`: pass
- `node scripts/validate-evidence-freshness.mjs`: pass
- `node scripts/check-quality-gate-self-protection.mjs`: pass
- `node scripts/codex-secret-safety-scan.mjs`: pass

## Security Boundaries

- no package.json change
- no pnpm-lock change
- no DB driver dependency
- no Redis dependency
- no Kafka dependency
- no real DB
- no migrations
- no contracts change
- no real YouTube API
- no real OAuth token
- no wallet/RPC/deploy change
- no runtime readiness claim
- no production readiness claim
- no legal compliance claim
- no YouTube policy compliance claim

## P0 Admin DLQ Visibility Evidence

The admin DLQ list returns allowlisted metadata for local/internal diagnosis:

- `id`
- `original_event_id`
- `job_type`
- `retry_count`
- `failed_at`
- `created_at`
- `retry_status`
- `event_id`
- `source`
- `source_event_id`
- `stream_id`
- `character_id`
- `reason_code`

Raw payloads, external payloads, tokens, DB URLs, wallet secrets, private URLs, stacks, stdout, stderr, logs, and job URLs are not returned.

## Residual risks

This is local/internal admin DLQ visibility only. Durable production admin console readiness, real DB persistence, and production queue inspection remain future scoped work.

## Human Confirmation

AI Pro review is not human/project-owner approval.
