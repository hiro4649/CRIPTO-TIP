# P1 YouTube Live Chat Preflight Contract Hardening

This hardens the pre-network connector contracts added in PR #135 through PR #139.

The change keeps execution blocked: no real network, OAuth consent, token exchange, token refresh, token revocation request, secret value read, Google SDK, package change, lockfile change, runtime readiness claim, production readiness claim, legal compliance claim, or YouTube policy compliance claim.

## Hardened Areas

- OAuth state is 32 bytes and bound to redirect URI and session hash.
- OAuth state consumption is single-use and stores only hashes plus safe metadata.
- Config distinguishes planning, blocked preflight, and controlled-canary candidate states without authorizing network execution.
- List fallback is explicit-only.
- Planner blocks kill-switch, quota, OAuth, network, cycle, repeated failure, disabled chat, and missing chat states.
- API envelope validates exact `part`, `maxResults` bounds, safe request projection, and safe response classification.
- Readiness gate now evaluates contract inputs dynamically while keeping `real_api_execution` false.
