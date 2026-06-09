# Production Gates

## PR production-chain-listener-reorg Gate Assessment

Current state: G3 partial.

IRIS delivery update: PR iris-core-delivery-adapter advances G3 by adding the IRIS Core delivery adapter boundary, idempotent `iris.deliver` handling, retry/DLQ integration, and sanitized payload tests. The official YouTube connector boundary is now present, but G3 remains partial until production credential rollout, runtime deployment wiring, and operational signoff are complete.

G0 scaffold: pass.

G1 mock vertical slice: pass.

G2 durable MVP: pass after PR #4 merge.

G3 integration ready: partial. This PR adds chain listener boundary, ABI decode, catch-up, cursor, confirmation, and reorg handling, but production RPC runtime wiring, supervision, and operational rollout remain gated.

G4 production ready: not started. This repository is still not production ready.

| Gate | Meaning | PR #2 status |
| --- | --- | --- |
| G0 scaffold | Repo, workspace, mock app/API/contract skeleton exists. | Passed by PR #1. |
| G1 mock vertical slice | Mock Tip creates support event, moderation gate, affinity, reaction request, and overlay alert. | Passed by PR #1 and preserved in PR #2 tests. |
| G2 durable MVP | Durable schema, idempotency constraints, repository boundary, outbox/DLQ boundary, stale lock reclaim, admin DLQ retry, and live DB tests exist. | Passed by PR #4 for storage/queue boundary. |
| G3 integration ready | Production chain listener, official YouTube connector, and IRIS delivery adapter are ready. | Partial: chain listener, IRIS delivery, and YouTube connector boundaries exist; production credential rollout and runtime signoff remain. |
| G4 production ready | Production secrets, token rotation, reorg-tested chain listener, admin DLQ retry, monitoring, and legal/security signoff are complete. | Not started. |

PR #4 completes the storage/queue portion of G2. It is not production ready.

PR youtube-ops-hardening advances G3 operational readiness by adding credential source validation, metric name contracts, reconnect/fallback operation boundaries, and deterministic mock soak tests. It is still not G4 production ready because real secret manager wiring, live account authorization review, dashboard implementation, and alert routing remain deployment work.

PR youtube-prod-observability advances G3 operational readiness by adding a credential provider interface, secret manager resolver boundary, expanded metric mapping, manual live soak gating, and operations docs. It is still not G4 production ready because provider-specific deployment apply, real dashboard exporter, alert delivery, and live YouTube account operation remain gated.

PR youtube-deployment-dashboard advances G3 operational readiness by adding provider-specific credential provider boundary behavior, credential rotation plan validation, metric snapshot builder, dashboard contract JSON, alert routing contract, and manual live soak skip tests. It is still not G4 production ready because actual provider deployment apply, real dashboard exporter deployment, external alert delivery, and live YouTube account operation remain manual-gated.

PR observability-exporter-integration advances G3 operational readiness by adding a provider-neutral observability exporter boundary, Prometheus/OpenTelemetry-compatible output, dashboard/alert parity tests, and manual live soak safe-summary ingestion. It is still not G4 production ready because provider-specific dashboard deployment, external alert delivery, and live YouTube account operation remain manual-gated.

PR dashboard-exporter-deployment advances G3 operational readiness by adding dashboard provider boundaries, deployment plan generation, dry-run behavior, manual apply gate, rollback plan, provider error operator mapping, and alert routing stub tests. It is still not G4 production ready because real provider SDK apply, external alert delivery with real credentials, and live YouTube account operation remain manual-gated.

PR external-alert-delivery-integration advances G3 operational readiness by adding external alert provider boundaries, alert delivery plan generation, dry-run behavior, manual apply gate, payload safety, rollback/disable plan, and provider error operator mapping. It is still not G4 production ready because real provider credentials and live YouTube account operation remain manual-gated.
## Manual Gate Registry

Manual gate registry work advances G3 operational control. It does not make the system G4 production ready because persistent approval storage, real provider apply, live YouTube operation, and production secret rotation execution still require manual review and deployment controls.

## Production-Like Apply Enforcement Update

Production-like apply is not authorized by `manualApproval: true` alone. Dashboard apply, external alert apply, and provider-specific deployment apply require both an approved manual gate record and the `ManualGateRegistry` containing that record before provider apply starts. Successful apply marks the gate `used`; failed provider apply and dry-run do not mark it used. Used, expired, wrong-type, wrong-target-commit, or wrong-target-environment gates cannot authorize apply. Manual gate records store secret references only and are not secret storage.
## Evidence Automation Gate

Evidence single source of truth is a review automation boundary. It does not claim production runtime readiness and does not authorize provider apply, live YouTube operation, token sale, exchange, cash-out, custody, or internal balance behavior.

## Provider Apply Transaction Boundary

Provider apply transaction boundary preparation is not a production gate pass.
It proves an in-memory repository contract for recording manual gate used state,
provider job status, and audit append as one logical unit. Real provider SDK
apply, actual production deployment apply, and DB-backed transactions remain
separately gated future work.

## Full Repository Audit v1.1.3

This audit does not authorize production readiness. Production-like provider apply, live YouTube operation, wallet/RPC/deploy changes, and external alert/dashboard apply remain blocked unless an approved manual gate record and current-head checks are present.

Quality-gate self-protection requiredization strengthens the evidence gate by
requiring placeholder checks, freshness structure checks, and workflow
self-protection in CI. It still does not make the system G4 production ready;
provider apply, external alert delivery with real credentials, and live YouTube
operation remain manual-gated.

Provider-safe deployment apply advances G3 operational control by centralizing
dry-run/apply separation, approved manual gate enforcement, single-use gate
marking, rollback evidence, and safe apply summaries for dashboard, external
alert, and provider-specific deployment operations. It still does not make the
system G4 production ready because real provider SDK apply, persistent manual
gate storage, production deployment execution, and live YouTube account
operation remain out of scope.

## Persistent Manual Gate Audit Boundary

Persistent manual gate audit storage readiness adds repository interfaces,
in-memory test implementations, migration design, and safe audit summaries.
Actual production deployment apply and real provider SDK apply remain blocked
without a future approved manual gate and owner-controlled execution path.

## Provider Apply Job State Machine v1.1.4 Prep

Provider apply job state readiness adds transition validation and compensation
evidence. A future provider-specific production apply must not record a job as
`applied` unless manual gate mark-used succeeded. If provider side effects
started but mark-used failed, the job must remain non-applied and record
`compensation_required` with safe audit evidence only.

Postgres transaction adapter skeleton evidence is not production DB readiness.
Real DB integration, driver dependency review, live Postgres transaction tests,
and production migration application require separate owner-approved scope.

## Postgres Provider Apply Transaction Design v1.1.4

Postgres provider apply transaction design advances G3 operational control by
fixing manual gate row lock, provider job row lock, audit insert order, retry
classification, and additive migration indexes. It does not make the system G4
production ready because no real DB connection, real provider SDK apply, actual
production deployment apply, or live YouTube operation is implemented.

## Postgres Adapter Contract Hardening v1.1.6 Prep

Typed row parsers, SQL parameter builders, query result guards, and
migration-to-adapter mapping harden the future DB adapter contract. This is not
runtime readiness. Real DB driver introduction, live DB credentials, migration
application, and production-like adapter execution require explicit owner
approval and the checklist in `docs/POSTGRES_ADAPTER_OWNER_APPROVAL_CHECKLIST.md`.

The row parser contract is exact: unexpected manual gate or provider job
columns are rejected before business validation. Manual gate status, ISO UTC
timestamps, provider audit action vocabulary, and metadata-limited rowCount
failures must remain covered before owner-approved live DB integration begins.
