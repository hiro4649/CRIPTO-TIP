# P1 YouTube Canary Record Receipt Binding Contract

This contract binds three safe model artifacts:

- a YouTube canary authorization record
- a YouTube canary authorization audit receipt
- the authorization bundle that produced the receipt

The binding is a pure in-memory evaluator. It performs no file I/O, no database
I/O, no repository access, no route handling, no OAuth, no secret access, no
network request, and no YouTube API call.

## Binding Checks

The evaluator verifies:

- the record schema and effective status
- the audit receipt schema, semantic contract, canonical blocker order, and
  `safe_receipt_hash`
- the authorization bundle schema
- the recomputed bundle hash against the receipt and record
- the recomputed receipt hash against the record
- the receipt fields against a fresh safe evaluation of the supplied bundle
- temporal binding that requires the safe receipt to exist no later than the
  record creation time
- effective record status only after schema, receipt integrity, bundle
  integrity, hash binding, receipt derivation, and temporal binding pass

Hash equality is only safe correlation. It is not a signature, proof of owner
intent, execution approval, GitHub approval review, merge authority, release
authority, or deployment authority.

The temporal rule is fail-closed: a record created before the receipt evaluation
is invalid, even if that record is otherwise draft, revoked, or expired. A record
created at the same instant as the receipt evaluation, or after it, may continue
to the effective status checks. Returned safe reason codes identify the failure
class without echoing raw timestamps or raw hashes.

## Binding Statuses

- `invalid`: the record itself is invalid
- `receipt_integrity_failed`: the receipt cannot be trusted as a safe receipt
- `bundle_integrity_failed`: the supplied authorization bundle is invalid
- `hash_binding_failed`: safe hashes or derived receipt fields do not match
- `preview_bound_non_authoritative`: hashes match, but the receipt is preview
  input and cannot authorize anything
- `committed_bundle_incomplete`: hashes match, but the committed bundle is still
  blocked
- `record_draft`: hashes match, but the record is draft
- `record_revoked`: hashes match, but the record is revoked
- `record_expired`: hashes match, but the record is expired
- `bound_non_executable`: hashes match for a complete committed bundle and a
  recorded non-executable record

Every status remains non-authoritative and non-executable.

## Typed Reason Codes

Binding failures use a typed reason-code registry. The registry distinguishes
record bundle hash mismatch, receipt bundle hash mismatch, record receipt hash
mismatch, receipt derivation mismatch, temporal binding failure, preview
non-authority, committed bundle incompleteness, and record draft/revoked/expired
states. This keeps review evidence specific without printing raw receipt,
record, bundle, timestamp, credential, URL, owner, wallet, database, or provider
values.

## Fixed Safety Output

Every binding result keeps:

- `authority_status: non_authoritative`
- `execution_status: forbidden`
- `network_enabled: false`
- `oauth_configured: false`
- `secret_accessed: false`
- `real_api_execution: false`
- `record_persisted: false`
- `receipt_persisted: false`
- `persistence_status: not_implemented`

The evaluator does not echo raw input values. Safe reason codes describe failure
classes without printing credentials, URLs, live chat IDs, owner identity, raw
request bodies, tokens, database URLs, wallet values, or provider endpoints.

## Persistence Boundary

This contract deliberately stops before persistence. It does not add database
drivers, migrations, repository interfaces, admin persistence routes, audit-log
storage, authorization-record storage, production readiness, legal compliance,
or YouTube policy compliance.
