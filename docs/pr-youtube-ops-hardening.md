# Summary

Adds production YouTube credential and operations hardening for CRIPTO-TIP without connecting to a real production YouTube account or committing secrets.

## Task Contract

Task mode: product_minor_r2

Goal: add YouTube credential source validation, quota/rate-limit metric contracts, streamList reconnect/list fallback operational boundaries, liveChatId acquisition boundary, deterministic mock soak coverage, and runbook evidence.

Allowed scope: YouTube config validation, YouTube operations boundary, tests, docs, quality evidence.

Forbidden scope: token sale; token exchange; cash-out; custody; internal balance; investment wording; speculative reward; YouTube scraping; TikTok connector; multi-platform connector; multi-chain support; multi-token support; wallet custody.

Runtime readiness claim: no

Product code changed: yes

## Evidence Integrity

Base SHA: b01db3c5bc7e8af3ac3c0f4925f7400e1bb83259

Head SHA: current PR head at creation

Product CI: pending until GitHub Actions run

Quality-gate: pending until GitHub Actions run

Commit SHA: current PR head at creation

Evidence freshness: current local head before push.

## Product Verification

- Production official YouTube connector rejects local-env credential source.
- Metrics names are defined for quota, rate-limit, reconnect, fallback, events, connection, and verification outcomes.
- `liveChatId` acquisition is constrained to live session data, not scraping.
- Quota/rate-limit 403 reasons classify as retry/backoff operational errors.
- Auth, invalid page token, and non-quota 403 states remain operator-action/non-retry.
- `streamList` reconnect is bounded by retryability and max attempts.
- `list` fallback remains limited to unavailable streamList responses.
- Fallback polling respects `pollingIntervalMillis` with a local minimum.
- Deterministic mock soak covers long-running behavior without network, secrets, sleeping, scraping, or HTML parsing.

## Testing and review

Tests or checks run locally before commit: `corepack pnpm install` pass; `corepack pnpm lint` pass; `corepack pnpm typecheck` pass; `corepack pnpm test` pass with 14 test files, 100 passed tests, and 6 skipped tests; `npm test` pass with 14 test files, 100 passed tests, and 6 skipped tests; local forge unavailable; secret/risky rendering scan, prohibited wording scan, no-scraping scan, and `node scripts/codex-secret-safety-scan.mjs` run.

Review focus: credential boundary, no secret commit, no scraping, quota metrics, reconnect/fallback behavior, liveChatId boundary, and deferred production runtime claims.

## Security Boundaries

Production YouTube credentials must be supplied through a secret manager boundary. `.env.example` contains placeholders only. This PR does not implement token sale, exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, TikTok, multi-platform, multi-chain, or multi-token behavior.

## Known gaps

Live YouTube API soak, real dashboard wiring, alert routing, and provider-specific secret manager integration remain follow-up deployment work.
