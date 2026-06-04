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
