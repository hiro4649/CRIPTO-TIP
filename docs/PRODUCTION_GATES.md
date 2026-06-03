# Production Gates

| Gate | Meaning | PR #2 status |
| --- | --- | --- |
| G0 scaffold | Repo, workspace, mock app/API/contract skeleton exists. | Passed by PR #1. |
| G1 mock vertical slice | Mock Tip creates support event, moderation gate, affinity, reaction request, and overlay alert. | Passed by PR #1 and preserved in PR #2 tests. |
| G2 durable MVP | Durable schema, idempotency constraints, repository boundary, outbox/DLQ boundary, and audit design exist. | Partial in PR #2. |
| G3 integration ready | Live DB integration tests, production chain listener, official YouTube connector, and IRIS delivery adapter are ready. | Not started. |
| G4 production ready | Production secrets, token rotation, reorg-tested chain listener, admin DLQ retry, monitoring, and legal/security signoff are complete. | Not started. |

PR #2 is G2 partial. It is not production ready.

