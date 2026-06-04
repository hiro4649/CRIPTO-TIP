# Summary

Adds the official YouTube Live API connector boundary for CRIPTO-TIP. The PR normalizes official JSON API chat events, Super Chat, and Super Sticker events while preserving the rule that YouTube LIVE remains the broadcast/chat surface and CRIPTO-TIP remains the external IRIS Web Companion Tip surface.

## Task Contract

Task mode: product_minor_r2

Goal: add official YouTube Live connector boundary, Super Chat/Super Sticker normalization, verification code handling, retry/fallback behavior, and evidence docs.

Allowed scope: YouTube connector interface, mock connector, official JSON API adapter, verification code store, config credential boundary, shared event normalizers, tests, docs, quality evidence.

Forbidden scope: token sale; token exchange; cash-out; custody; internal balance; investment wording; speculative reward; YouTube scraping; multi-platform connector; TikTok connector; production wallet custody; multi-chain support; multi-token support.

Runtime readiness claim: no

Product code changed: yes

## Evidence Integrity

Base SHA: 6f3cd069a899801dab93e25df63392f1fd695810

Head SHA: updated after final push

Product CI: pending

Quality-gate: pending

Commit SHA: updated after final push

Evidence freshness: current local branch before push.

## Product Verification

- streamList event normalization: covered.
- list fallback normalization: covered.
- Super Chat to `support.received`: covered.
- Super Sticker to `support.received`: covered.
- regular chat to `youtube.chat.message.received`: covered.
- verification code detection/expiry/one-time/wrong stream: covered.
- quota retry/backoff boundary: covered, including 403 `rateLimitExceeded`, `quotaExceeded`, and `userRateLimitExceeded`.
- non-retry YouTube API errors: covered for 403 `forbidden`, `liveChatDisabled`, `liveChatEnded`, 400 `pageTokenInvalid`, and 401 auth failures.
- no scraping dependency or HTML parsing: covered.
- Super Chat moderation and wallet redaction: covered.

## Testing and review

Tests or checks run locally: `corepack pnpm install` pass; `corepack pnpm lint` pass; `corepack pnpm typecheck` pass; `corepack pnpm test` pass, 13 test files, 89 passed, 6 skipped; `npm test` pass, 13 test files, 89 passed, 6 skipped; local forge unavailable; security scans run.

Review focus: official API boundary, no scraping, credential placeholders only, Super Chat not replaced, moderation safety, verification code one-time behavior, and no wallet/raw viewer data leakage.

## Security Boundaries

No production YouTube OAuth token or API key is committed. The connector uses environment boundary fields only. It does not implement token sale, exchange, cash-out, custody, internal balance, investment wording, speculative reward, or YouTube scraping.

## Known gaps

Production credential provisioning, long-running live YouTube API soak test, quota dashboarding, and official YouTube account authorization review remain follow-up work.
