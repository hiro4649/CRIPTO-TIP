# P1 YouTube Live Chat Direct REST Transport ADR

## Decision

Use a future `direct_rest_fetch` transport for the controlled canary path, with fetch injected explicitly by tests or future runtime wiring.

## Rationale

- Avoids Google SDK dependency and package/lockfile changes.
- Keeps request construction, endpoint allowlisting, safe error mapping, response limits, and no-raw-output policy under repository control.
- Allows fake fetch tests before any real network authorization exists.

## Constraints

- No global fetch execution in pre-network phases.
- No custom base URL.
- Official YouTube API host and path only when real network scope is later granted.
- No raw token, Authorization header, raw response body, or raw log is stored in machine evidence.

## Alternatives

- Google SDK: rejected for this phase because it adds dependency and lockfile scope.
- Streaming-first transport: deferred; streamList remains contract-first and network-free.
