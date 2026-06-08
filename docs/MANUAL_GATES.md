# Manual Gates

Manual gates are approval records for production-like operations that must not be authorized by a boolean flag alone. The registry is a boundary for deployment approval evidence; it does not store secret values and does not execute production provider calls by itself.

## Gate Types

- `youtube_live_soak`
- `dashboard_apply`
- `external_alert_apply`
- `provider_secret_rotation`
- `provider_specific_deployment_apply`
- `production_rpc_enable`
- `iris_core_delivery_enable`
- `overlay_token_rotation_apply`

## Required Fields

Each gate records `gate_id`, `gate_type`, `status`, `required_before`, `target_environment`, `target_commit_sha`, `requested_by`, `approved_by_role`, `approval_timestamp`, `required_evidence`, `rollback_plan_ref`, `operator_runbook_ref`, `secret_source_ref`, `expires_at`, and `notes`.

Allowed statuses are `not_requested`, `requested`, `approved`, `rejected`, `expired`, and `used`.

## Safety Rules

`secret_source_ref` must be a reference name only. It must not contain a raw YouTube OAuth token, API key, webhook URL, private URL, wallet address, bearer token, provider token, or other secret value.

Production-like dashboard apply, external alert apply, provider-specific deployment apply, manual live YouTube soak, and provider credential rotation require an approved gate for the target commit and environment. Dry-run operations may run without an approved gate.

An approved gate is single-use for apply paths that receive a registry. After use, the registry marks the gate as `used`, and the same approval cannot authorize another apply.

## Out Of Scope

This boundary does not implement token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, real provider SDK apply, or live YouTube account operation without an approved manual gate.

## Production-Like Apply Enforcement Update

Production-like apply is not authorized by `manualApproval: true` alone. Dashboard apply, external alert apply, and provider-specific deployment apply require both an approved manual gate record and the `ManualGateRegistry` containing that record before provider apply starts. Successful apply marks the gate `used`; failed provider apply and dry-run do not mark it used. Used, expired, wrong-type, wrong-target-commit, or wrong-target-environment gates cannot authorize apply. Manual gate records store secret references only and are not secret storage.

Dashboard and external alert wrappers return exact safe projected results only. They do not expose raw provider fields, and invalid provider count values fail closed. Provider apply and `used` marking are not a persistent transaction yet, so future durable manual gate storage and provider apply job state are still required before production execution.

## CI Evidence Enforcement

Quality-gate self-protection requiredization keeps manual gate evidence in the
required verification path. Evidence must remain safe-summary only. Manual gate
records may contain secret names or provider references, but never secret values,
private URLs, wallet addresses, raw messages, raw display names, OAuth tokens,
API keys, webhook URLs, or provider credentials.
## Rendered Evidence Source

Manual gate registry documentation can be rendered from `.codex/manual-gates/manual-gates.json`. The rendered source is documentation evidence only; production-like apply still requires runtime validation through `ManualGateRegistry`.
