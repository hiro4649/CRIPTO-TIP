# Postgres Transaction Adapter Skeleton

CODEX_QUALITY_HARNESS_FILE v1.1.5

This adapter is a skeleton for future Postgres-backed provider apply recording.
It does not open a real database connection, import a DB driver, add package
dependencies, run migrations, or execute a real provider SDK apply.

## Boundary

- `PostgresTransactionClient` exposes only `query(sql, params)`.
- Tests use a fake client to verify SQL order, row counts, rollback, and retry
  classification.
- The production DB adapter remains future work and requires explicit owner
  scope.
- Provider apply is an external side effect. A DB transaction cannot fully
  contain or atomically roll back the provider side effect.

## Success Order

The skeleton validates this order with mock-client tests:

1. `BEGIN`
2. Lock manual gate with `SELECT ... FOR UPDATE`
3. Validate the approved manual gate row
4. Lock provider job with `SELECT ... FOR UPDATE`
5. Validate the provider job row
6. Update provider job to the intermediate durable state:
   `status = running`, `external_provider_apply_started = true`,
   `manual_gate_mark_used_attempted = true`, and
   `manual_gate_mark_used_succeeded = false`
7. Mark manual gate used with fail-closed `WHERE` predicates
8. Update provider job to `status = applied` only after manual gate mark-used
   succeeds, with `manual_gate_mark_used_succeeded = true`
9. Insert provider audit
10. Insert manual gate audit
11. `COMMIT`

The adapter must never write `status = applied` while
`manual_gate_mark_used_succeeded = false`; that would violate the durable
provider job invariant from the persistent transaction design.

## Fail-Closed Behavior

Any `rowCount = 0` for a required state write fails closed and rolls back the
DB transaction. When provider apply already succeeded, failures after the
provider side effect become `compensation_required` and must not re-execute
provider apply.

Compensation-required cases include mark-used failure, provider audit insert
failure, manual gate audit insert failure, and commit failure after provider
success.

Failures before provider success do not require compensation. Provider-failure
recording appends provider failure audit only and must not report a manual gate
audit ID that was not inserted. Rollback failure is reported as metadata-limited
operator evidence and does not expose DB diagnostics.

If `COMMIT` fails after provider success, the adapter returns
`compensation_required` with metadata-limited operator action. It must not claim
rollback completed or that the provider side effect was rolled back. Operators
must inspect durable safe evidence before retrying, and provider apply must not
be re-executed.

## Safety Rules

- Retry after provider success is durable-state recording only.
- Provider apply must not be re-executed by the adapter.
- Manual gate and provider job rows are parsed through typed validators before
  business validation; `rows[0]` is not trusted by shape alone.
- Typed row parsers are exact row contracts: unexpected selected columns are
  rejected before business validation.
- SQL parameters are built through fixed helper functions whose array positions
  match the SQL placeholder contract.
- Provider audit actions are restricted to the existing
  `provider_apply_transaction.*` vocabulary.
- Query results must pass rowCount guards before the adapter treats reads or
  writes as durable evidence.
- `rowCount > 1` failures keep a metadata-limited phase label without exposing
  row contents.
- Safe summaries only; no raw provider response is stored.
- No secret values, private URLs, wallet addresses, raw messages, display
  names, or expanded command diagnostics are stored.
- No GitHub Actions log downloads are read for this boundary.

## v1.1.6 Prerequisites

Before moving from skeleton to a real Postgres adapter, v1.1.6 scope should
require owner-approved DB integration work, live Postgres transaction tests,
driver dependency review, migration compatibility checks, and operator
compensation rehearsal. This PR does not claim runtime, production, legal, or
YouTube policy readiness.

The v1.1.6 preparation contract is captured in
`docs/POSTGRES_ADAPTER_CONTRACT_HARDENING.md` and
`docs/POSTGRES_ADAPTER_OWNER_APPROVAL_CHECKLIST.md`.

## DB Integration Scope Gate v1.1.6 Prep

Real DB integration must first pass the owner-approved DB integration scope gate, including driver checklist, secret manager boundary, migration apply/rollback plan, and live test environment requirements. This skeleton remains no-driver and no-real-DB.
