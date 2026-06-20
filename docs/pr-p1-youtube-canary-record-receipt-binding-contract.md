# feat: bind youtube canary records to safe receipts

## Task Contract

This PR adds a pure model contract that binds YouTube canary authorization
records to safe audit receipts and authorization bundles.

It adds canonical blocker-code validation, audit receipt integrity verification,
record status hardening, and record/receipt/bundle hash binding. It does not add
routes, persistence, repositories, database drivers, migrations, OAuth, network
execution, secret access, or YouTube API execution.

## Evidence Integrity

Safe hashes are correlation identifiers only. They are not signatures, owner
approval, GitHub approval review, merge authority, release authority, deploy
authority, runtime readiness, production readiness, legal compliance, or YouTube
policy compliance.

The binding evaluator recomputes the bundle hash and receipt hash from supplied
safe model inputs and compares them to the record. It also verifies that the
receipt fields match a fresh safe evaluation of the supplied bundle.

## Testing And Review

Local focused verification:

- `corepack pnpm vitest run apps/api/src/youtube-live-chat-canary-record-receipt-binding.test.ts apps/api/src/youtube-live-chat-canary-authorization-record.test.ts apps/api/src/youtube-live-chat-canary-audit-receipt.test.ts apps/api/src/youtube-live-chat-canary-authorization-gate.test.ts`

Current result:

- focused canary model tests: pass

Remote current-head CI evidence will be refreshed after PR creation and same-head
GitHub checks complete.

## Test Coverage Evidence

Covered behaviors:

- canonical blocker schema accepts evaluator blocker codes
- unknown, duplicate, and non-canonical blocker codes are rejected
- tampered receipt hashes are rejected
- committed/preview receipt semantic mismatches are rejected
- complete authorization with blockers is rejected
- awaiting authorization without blockers is rejected
- recorded non-executable records require all references recorded
- revoked records require revocation reason and valid revocation time
- non-revoked records cannot carry revocation metadata
- record/receipt/bundle binding accepts matching complete committed inputs
- preview receipts remain non-authoritative
- incomplete committed bundles remain blocked
- mismatched record bundle hash and receipt hash are rejected
- tampered receipt hash and semantics are rejected
- outputs remain forbidden, non-authoritative, non-persistent, and safe

## Security Boundaries

- no package.json change
- no pnpm-lock.yaml change
- no workflow change
- no contracts change
- no migrations change
- no server runtime change
- no route change
- no repository interface change
- no DB driver dependency
- no real DB connection
- no OAuth execution
- no secret access
- no real YouTube API execution
- no wallet, RPC, or deploy change
- no runtime readiness claim
- no production readiness claim
- no legal compliance claim
- no YouTube policy compliance claim
- no owner approval created
- no GitHub approval review created
- no merge authority created

## Residual Risks

This PR stops at pure model binding. It does not persist authorization records or
receipts. A later persistence threat-model PR should define storage ownership,
append-only/current-state separation, access boundaries, replay prevention,
retention, deletion, backup, restore, and audit retrieval before any repository
or database work begins.

## Human Confirmation

AI technical review may recommend merging if same-head checks pass, but this PR
does not create human/project-owner approval, GitHub approval review, owner
approval record, or merge authority.
