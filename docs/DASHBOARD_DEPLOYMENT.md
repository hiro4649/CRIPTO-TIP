# Dashboard Deployment

The dashboard deployment boundary creates provider-neutral deployment plans from `docs/youtube-dashboard-contract.json`. It does not apply production dashboard changes without a manual approval gate and does not commit provider secrets or API keys.

## Provider Boundary

- `DashboardProvider` deploys a `DashboardDeploymentPlan`.
- `MockDashboardProvider` supports deterministic tests and dry-run verification.
- `ProviderSpecificDashboardProvider` wraps an injected provider boundary without importing a provider SDK.
- Provider credentials are references only. Production must use `secret_manager` or `provider_specific` with a secret name.

## Deployment Modes

- Dry-run is allowed without manual approval and returns a planned status.
- Apply requires `manualApproval: true`.
- Missing provider credential secret names fail closed.
- Rollback plans are generated as operator steps and do not call a provider directly.

## Alert Routing Stub

`StubAlertRoutingProvider` plans alert routes only. External alert delivery with real provider credentials remains out of scope.

## Operator Rules

- Do not store dashboard provider secrets, alert provider secrets, YouTube OAuth tokens, or API keys in git.
- Do not apply production dashboard changes without manual approval.
- Do not use this boundary for YouTube scraping, token sale, exchange, cash-out, custody, internal balance, investment wording, or speculative reward behavior.
