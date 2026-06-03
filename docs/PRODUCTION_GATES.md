# Production Gates

## PR production-chain-listener-reorg Gate Assessment

Current state: G3 partial.

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
| G3 integration ready | Production chain listener, official YouTube connector, and IRIS delivery adapter are ready. | Not started. |
| G4 production ready | Production secrets, token rotation, reorg-tested chain listener, admin DLQ retry, monitoring, and legal/security signoff are complete. | Not started. |

PR #4 completes the storage/queue portion of G2. It is not production ready.
