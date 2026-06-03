# API Compatibility Summary

## Public API

TipIntent public DTO remains safe and does not expose wallet address, raw display name, raw message, message hash, or client tip id.

## Internal API

`POST /internal/events` continues to normalize events through the support event path, but storage and side effects now use the repository boundary and outbox methods.

## Admin API

Admin tip listing now uses repository `listSupportEventsByStream`. Admin/internal endpoints remain protected by mock bearer tokens in MVP.

## Compatibility

Mock APIs remain compatible for MVP tests. No production YouTube API, RPC, or IRIS Core endpoint is connected in PR #2.

## Breaking Changes

None intended.

## Known Gaps

Live DB integration is not wired. Production DB mode requires integration tests before production use.

