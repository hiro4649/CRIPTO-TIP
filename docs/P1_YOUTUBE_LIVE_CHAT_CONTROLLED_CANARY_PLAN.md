# P1 YouTube Live Chat Controlled Canary Plan

The initial canary mode is `list_controlled_canary`, but this repository is still network-blocked.

Before a controlled network canary can run, all of the following must exist outside this code-only scope:

- Explicit owner authorization for network execution.
- Verified OAuth client configuration.
- Opaque secret provider selected and configured.
- Operator quota budget.
- Test live chat ID selected by the owner.
- Privacy review.
- Data deletion review.
- Token revocation runbook.
- Operational kill switch approval.

The current code path must remain able to prove:

- network disabled,
- OAuth unconfigured,
- real API execution false,
- kill switch blocked by default,
- no secret value read,
- no runtime, production, legal, or YouTube policy readiness claim.
