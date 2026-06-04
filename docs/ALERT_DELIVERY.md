# External Alert Delivery Boundary

External alert delivery turns the tested YouTube observability alert contract into provider delivery plans. It does not deliver real provider alerts without manual approval and does not store provider secrets.

## Credential Boundary

Production-like alert delivery must use `secret_manager` or `provider_specific` credential references. The repository stores secret names only. Real webhook URLs, API keys, OAuth tokens, provider tokens, wallet addresses, raw display names, and raw user messages must not be committed or placed in alert payloads.

## Delivery Modes

- Dry-run builds and validates alert payloads without manual approval.
- Apply requires `manualApproval: true`.
- Provider-specific delivery uses an injected provider wrapper. Real SDK integration remains a separate deployment task if needed.

## Payload Safety

Alert payloads contain only:

- declared metric name
- alert severity
- operator action
- sanitized safe labels

Payloads exclude wallet addresses, YouTube OAuth tokens, API keys, raw user messages, raw display names, secrets, and private URLs.

## Rollback And Disable

The rollback plan disables the external alert route, verifies dashboard visibility remains available, rotates credentials if needed, and records operator review.

## Out Of Scope

This boundary does not implement token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, live YouTube account operation, or external alert delivery with real provider credentials without a manual gate.
