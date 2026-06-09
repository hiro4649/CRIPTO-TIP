# DB Driver Owner Approval Record

This record is the future owner approval boundary for introducing a DB driver,
package change, live DB integration test plan, migration apply plan, and DB
secret manager scope.

It is not an AI review artifact. AI review may recommend a merge or a repair,
but AI, Codex, assistants, bots, and GitHub Actions cannot create or replace
project-owner approval.

## Required Binding

An approved record must bind to all of these fields:

- `repository`
- `pr_number`
- `target_branch`
- `target_commit_sha`
- `base_commit_sha`
- `approval_scope`
- `expires_at`
- `approval_fingerprint`

Copying the record to another branch, PR, or commit invalidates it.

## Current PR Status

This PR only defines the schema, validator, fingerprint, replay protection, and
safe default evidence. It does not commit an approved owner record.

The default state remains `not_approved`.

For `absent`, `not_approved`, `rejected`, and `expired` records, all DB driver,
package, lockfile, real DB, live DB, migration, and secret-manager capability
flags must remain closed. Non-approved records must not carry `approval_scope`,
`driver_package`, a selected driver version policy, `secret_manager` credential
storage, or an `approval_fingerprint`.

Approved records are still scoped. A capability flag only becomes valid when the
matching approval scope is present:

- `driver_package`: `db_driver_dependency_introduction`
- `package_change_allowed`: `package_change_for_db_driver`
- `pnpm_lock_change_allowed`: `pnpm_lock_change_for_db_driver`
- `real_db_connection_allowed`: `db_secret_manager_scope`
- `live_db_integration_tests_allowed`: `live_db_integration_test_plan`
- `migration_apply_allowed`: `migration_apply_plan`

The approver actor must be a safe GitHub username and must not be an AI,
assistant, Codex, bot, GitHub Actions, Copilot, ChatGPT, OpenAI assistant, or
unknown/null-like actor. Approval IDs must use the safe DB-driver approval ID
format and cannot contain URLs, token-like values, whitespace, wallet addresses,
or secret-like text.

## Forbidden Scope

The record cannot approve real provider SDK apply, actual production
deployment, runtime readiness, production readiness, legal compliance, YouTube
policy compliance, token sale, token exchange, cash-out, custody, internal
balance, investment wording, YouTube scraping, wallet/RPC/deploy changes,
YouTube connector changes, or Chain Listener changes.

## Fingerprint

The fingerprint is a SHA-256 hash of the stable canonical JSON record with
`approval_fingerprint` omitted.

The canonical record must not contain secret values, raw DB connection strings,
tokens, URLs, wallet addresses, raw provider responses, or raw GitHub logs.

The fingerprint covers `approval_status`, expiry, approver actor, package and
DB capability flags, and driver version policy. Changing any of those fields
invalidates the fingerprint.

## Future PR Requirements

A future DB driver PR must carry a fresh project-owner approval record for the
target commit, branch, PR, and scope. Any code change that changes the target
commit requires regenerated approval evidence before real DB scope can proceed.
