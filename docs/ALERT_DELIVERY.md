# External Alert Delivery Boundary

External alert delivery turns the tested YouTube observability alert contract into provider delivery plans. It does not deliver real provider alerts without manual approval and does not store provider secrets.

## Credential Boundary

Production-like alert delivery must use `secret_manager` or `provider_specific` credential references. The repository stores secret names only. Real webhook URLs, API keys, OAuth tokens, provider tokens, wallet addresses, raw display names, and raw user messages must not be committed or placed in alert payloads.

## Delivery Modes

- Dry-run builds and validates alert payloads without manual approval.
- Non-production apply requires `manualApproval: true`.
- Production-like apply requires an approved `external_alert_apply` gate and the `ManualGateRegistry` containing that gate. `manualApproval: true` alone is not sufficient.
- Provider-specific delivery uses an injected provider wrapper. Real SDK integration remains a separate deployment task if needed.
- Provider raw results are not returned directly. The wrapper returns only `status`, `dryRun`, and `deliveredCount`; extra fields are stripped and invalid counts are rejected.

## Payload Safety

Alert payloads contain only:

- declared metric name
- alert severity
- operator action
- sanitized safe labels

Payloads exclude wallet addresses, YouTube OAuth tokens, API keys, raw user messages, raw display names, secrets, and private URLs.
Unsafe label values are also redacted when a safe label key carries wallet-address, token-like, credential-like, or private URL text.

## Rollback And Disable

The rollback plan disables the external alert route, verifies dashboard visibility remains available, rotates credentials if needed, and records operator review.

## Out Of Scope

This boundary does not implement token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, live YouTube account operation, or external alert delivery with real provider credentials without a manual gate.
## Manual Gate Registry

Dry-run may be planned without an approved gate. Production-like apply requires an approved `external_alert_apply` manual gate bound to the target commit and environment. The shared provider-safe deployment boundary validates rollback evidence, operator runbook references, credential references, target commit, target environment, expiry, single-use status, and gate type before provider apply starts. Missing provider credential secret names still fail closed.

## Production-Like Apply Enforcement Update

Production-like apply is not authorized by `manualApproval: true` alone. Dashboard apply, external alert apply, and provider-specific deployment apply require both an approved manual gate record and the `ManualGateRegistry` containing that record before provider apply starts. Successful apply marks the gate `used`; failed provider apply and dry-run do not mark it used. Used, expired, wrong-type, wrong-target-commit, or wrong-target-environment gates cannot authorize apply. Manual gate records store secret references only and are not secret storage.
