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

## Future PR Requirements

A future DB driver PR must carry a fresh project-owner approval record for the
target commit, branch, PR, and scope. Any code change that changes the target
commit requires regenerated approval evidence before real DB scope can proceed.
