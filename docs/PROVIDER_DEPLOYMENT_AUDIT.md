# Provider Deployment Audit

Provider deployment audit records are safe summaries of planned, executed,
failed, and rollback-related operations. They are not raw provider responses and
not credential storage.

## Audit Actions

- `provider_deployment.apply.planned`
- `provider_deployment.apply.executed`
- `provider_deployment.apply.failed`
- `provider_deployment.rollback.planned`
- `provider_deployment.rollback.executed`

## Safe Persistence Boundary

Provider deployment jobs store operation, status, target, target environment,
target commit SHA, manual gate ID reference, rollback plan reference, operator
runbook reference, and safe summary.

They do not store provider credential values, webhook URLs, provider tokens,
OAuth tokens, API keys, private URLs, wallet addresses, raw messages, raw display
names, raw YouTube author IDs, raw payloads, raw provider responses, raw logs,
stdout, stderr, or stack traces.

## Apply Semantics

Provider raw results are not persisted. PR #34 introduced projected safe result
shapes for dashboard and external alert wrappers; audit storage must use those
safe projections or smaller safe summaries.

Apply success may move a manual gate to `used`. Apply failure must not move the
manual gate to `used`. If `markUsed` fails after provider apply, the operation
must not be reported as successful.

## Current Limit

Real provider SDK apply, actual production deployment apply, and persistent job
state machine execution remain out of scope. This PR provides interfaces,
in-memory repositories, migration design, tests, docs, and evidence only.
