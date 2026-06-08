# Provider Safe Deployment Apply

Provider-specific deployment apply is a boundary for dashboard and external alert provider changes. It does not perform real production deployment in normal CI and does not include provider SDK credentials.

## Rules

- Dry-run can run without a manual gate.
- Production-like apply requires an approved manual gate record and a manual gate registry.
- `manualApproval: true` alone cannot authorize production-like apply.
- The manual gate must match gate type, target commit SHA, and target environment.
- Expired, used, wrong-type, wrong-commit, or wrong-environment gates fail closed.
- A successful production-like apply marks the gate `used`.
- A failed provider apply does not mark the gate `used`.
- Apply results are safe-summary only.
- Apply results must not include secret values, webhook URLs, provider tokens, private URLs, wallet addresses, raw messages, or raw display names.
- Provider credentials are represented only by secret references.

## Boundaries

This PR adds the shared provider deployment apply interface, mock provider, provider-specific wrapper boundary, and dashboard/external alert integration. It does not add real provider SDK apply, persistent manual gate DB storage, production readiness, runtime readiness, legal compliance, YouTube policy compliance, token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, or YouTube scraping.

## Rollback Evidence

Every apply plan must include a rollback plan reference and an operator runbook reference. Rollback evidence is a safe reference to operator steps, not a secret storage location.
