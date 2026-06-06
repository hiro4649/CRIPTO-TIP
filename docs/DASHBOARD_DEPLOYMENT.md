# Dashboard Deployment

## v1.0.8 Audit Note

The full repository audit confirms dashboard deployment remains dry-run/provider-boundary focused unless an approved manual gate record authorizes production-like apply. Real provider secrets and ungated apply remain forbidden.

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

The external alert delivery boundary uses the same alert contract and keeps provider apply manual-gated. Dashboard deployment remains separate from provider alert delivery so dashboard parity and alert payload safety can be reviewed independently.

## Operator Rules

- Do not store dashboard provider secrets, alert provider secrets, YouTube OAuth tokens, or API keys in git.
- Do not apply production dashboard changes without manual approval.
- Do not use this boundary for YouTube scraping, token sale, exchange, cash-out, custody, internal balance, investment wording, or speculative reward behavior.
## Manual Gate Registry

Dry-run may be planned without an approved gate. Production-like apply requires an approved `dashboard_apply` manual gate bound to the target commit and environment. Missing provider credential secret names still fail closed.

## Production-Like Apply Enforcement Update

Production-like apply is not authorized by `manualApproval: true` alone. Dashboard apply and external alert apply require both an approved manual gate record and the `ManualGateRegistry` containing that record before provider apply starts. Successful apply marks the gate `used`; failed provider apply and dry-run do not mark it used. Used, expired, wrong-type, wrong-target-commit, or wrong-target-environment gates cannot authorize apply. Manual gate records store secret references only and are not secret storage.
