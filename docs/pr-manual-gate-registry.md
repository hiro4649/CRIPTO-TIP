# Summary

Adds a centralized manual gate registry and approval evidence boundary for production-like deployment operations.

PR profile: product_minor_r2
Task mode: feature

## Task Contract

Goal: add manual gate registry and deployment approval evidence.

Allowed scope: manual gate types, in-memory registry, validation, dashboard apply integration, external alert apply integration, live YouTube soak gate, provider secret rotation gate, tests, docs, and quality evidence.

Forbidden scope: token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, TikTok connector, multi-platform connector, multi-chain support, multi-token support, wallet custody, real secret commit, production deployment apply without approved manual gate, external alert delivery with real credentials without approved manual gate, and live YouTube account operation without approved manual gate.

Runtime readiness claim: no.

Product code changed: yes.

Done criteria: local lint/typecheck/test pass, GitHub typescript/contracts/quality-gate pass, manual gate registry tests pass, dashboard apply requires `dashboard_apply`, external alert apply requires `external_alert_apply`, manual live soak requires `youtube_live_soak`, provider secret rotation requires `provider_secret_rotation`, wrong gate type and target commit are rejected, expired and used gates are rejected, no secret scan passes, and no scraping scan passes.

## Evidence Integrity

Head SHA: branch head SHA in PR metadata

Product CI: GitHub Actions required on pushed head

Quality-gate: GitHub Actions required on pushed head

Commit SHA: branch head SHA in PR metadata

Tests: 20 test files, 173 passed, 6 skipped

## Testing and review

Validation commands:

- `corepack pnpm install`
- `corepack pnpm lint`
- `corepack pnpm typecheck`
- `corepack pnpm test`
- `npm test`
- `cd contracts && forge test || true`
- secret/risky rendering scan
- prohibited wording scan
- no-scraping scan

Review focus: manual approval record validation, single-use gate behavior, target commit binding, target environment binding, secret reference safety, dry-run compatibility, and production-like apply fail-closed behavior.

## Security Boundaries

Manual gate evidence stores secret references only. It must not contain raw OAuth tokens, API keys, webhook URLs, private URLs, wallet addresses, raw user messages, raw display names, or provider secrets.

## Residual risks

Persistent manual gate storage, provider-specific deployment apply, real external alert delivery, and live YouTube account operation remain out of scope.
