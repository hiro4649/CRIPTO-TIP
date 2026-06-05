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

Production-like apply is not authorized by `manualApproval: true` alone. Dashboard apply and external alert apply require both an approved manual gate record and the `ManualGateRegistry` containing that record before provider apply starts. Successful apply marks the gate `used`; failed provider apply and dry-run do not mark it used. Used, expired, wrong-type, wrong-target-commit, or wrong-target-environment gates cannot authorize apply. Manual gate records store secret references only and are not secret storage.
## Evidence Automation Gate

Evidence single source of truth is a review automation boundary. It does not claim production runtime readiness and does not authorize provider apply, live YouTube operation, token sale, exchange, cash-out, custody, or internal balance behavior.
