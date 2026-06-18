# P1 YouTube Credential Provider And Kill Switch

This adds a credential provider interface and kill-switch contract without exposing raw credentials or enabling real network execution.

## Credential Provider

- `UnavailableYouTubeCredentialProvider` fails closed.
- `FakeOpaqueYouTubeCredentialProvider` returns opaque access credential handles only.
- Handles include scope IDs and expiry metadata, but no token value and no Authorization header.
- Refresh and revocation can be marked as required, but neither is executed.

## Kill Switch

- Default state is `blocked`.
- This PR permits only `armed_for_fake_transport` as a safe local/test state.
- `armed_for_controlled_network_canary` is represented as a type but still blocked by evaluation in this scope.
- Head binding, config hash binding, and expiry are enforced.

No package, lockfile, Google SDK, secret, network, OAuth, runtime readiness, production readiness, legal compliance, or YouTube policy compliance authority is created.
