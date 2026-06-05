# Provider-Safe Deployment Apply

Provider-safe deployment apply is the shared boundary for provider-specific dashboard and external alert apply operations. It is a provider-neutral wrapper around dry-run, production-like apply, manual gate validation, rollback evidence, and safe audit evidence.

## Boundary

- `ProviderDeploymentOperation` records the gate type, dry-run mode, target commit, target environment, rollback plan reference, operator runbook reference, and safe summary.
- `executeProviderDeploymentApply` runs provider apply callbacks only after validating the operation.
- Production-like apply requires an approved manual gate record and the `ManualGateRegistry` containing that record.
- Dry-run does not require a manual gate and does not mark a gate used.
- Successful production-like apply marks the gate `used`.
- Failed provider apply does not mark the gate used.

## Safety Rules

Apply result and audit evidence are safe-summary only. They must not include secret values, webhook URLs, provider tokens, private URLs, wallet addresses, raw messages, or raw display names.

Provider credentials are represented only as secret references. This boundary does not resolve, log, or persist real provider secrets.

## Rollback Evidence

Every provider deployment operation must include:

- rollback plan reference
- operator runbook reference
- target commit SHA
- target environment
- declared manual gate type

## Out Of Scope

This boundary does not implement token sale, token exchange, cash-out, custody, internal balance, investment wording, speculative reward, YouTube scraping, real provider SDK apply, live YouTube account operation, or production apply without an approved manual gate.
