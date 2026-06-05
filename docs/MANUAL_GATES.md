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

Production-like dashboard apply, external alert apply, manual live YouTube soak, and provider credential rotation require an approved gate for the target commit and environment. Dry-run operations may run without an approved gate.

An approved gate is single-use for apply paths that receive a registry. After use, the registry marks the gate as `used`, and the same approval cannot authorize another apply.

## Out Of Scope

This boundary does not implement token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, real provider SDK apply, or live YouTube account operation without an approved manual gate.
