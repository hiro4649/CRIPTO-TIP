# feat: bind youtube canary records to safe receipts

## Task Contract

PR profile: security_r3
Task mode: feature
Risk level: R3

## Goal

This PR adds a pure model contract that binds YouTube canary authorization
records to safe audit receipts and authorization bundles.

It adds canonical blocker-code validation, audit receipt integrity verification,
record status hardening, record/receipt/bundle hash binding, receipt derivation
comparison, typed binding reason codes, and fail-closed temporal binding. It
does not add routes, persistence, repositories, database drivers, migrations,
OAuth, network execution, secret access, or YouTube API execution.

## Evidence Integrity

Head SHA: 353b367e97bbf43139e3fe21cd9012db9e31f27f

Base SHA: f0153a228c63bdc43d8e9a3fafc4c0e3269f6e84

Product CI: success

CI run: 27858152231

Typescript: pass

Contracts: pass

Quality-gate: success

Quality-gate run: 27858153585

Quality-gate artifact: 7761420828

Safe hashes are correlation identifiers only. They are not signatures, owner
approval, GitHub approval review, merge authority, release authority, deploy
authority, runtime readiness, production readiness, legal compliance, or YouTube
policy compliance.

The binding evaluator recomputes the bundle hash and receipt hash from supplied
safe model inputs and compares them to the record. It also verifies that the
receipt fields match a fresh safe evaluation of the supplied bundle. A record
created before the receipt evaluation fails closed with a typed safe reason code.

## Security impact

The change is security-sensitive because it touches authorization, receipt
integrity, and safe correlation logic. It reduces ambiguity by rejecting unknown
blocker codes, duplicate blocker codes, non-canonical blocker order, tampered
receipt hashes, invalid receipt semantics, incomplete recorded records, and
mismatched record/receipt/bundle hashes.

It does not create owner approval, GitHub approval review, merge authority,
runtime readiness, production readiness, legal compliance, YouTube policy
compliance, OAuth execution, secret access, network execution, persistence,
real YouTube API execution, token sale, token exchange, cash-out, custody,
internal balance, or investment wording.

## Best of N Evidence

Candidate count: 3

Selected candidate: A - pure record/receipt/bundle binding evaluator with
canonical blocker registry and receipt verifier.

Reason selected: Candidate A closes the integrity gap without adding routes,
persistence, OAuth, network execution, or new authority. It keeps the change
small and gives the next persistence PR a safer model contract to reference.

Rejected candidate B: Persist authorization records now. This was rejected
because storage ownership, access control, replay prevention, retention, and
audit retrieval need a separate threat model before repository or DB work.

Rejected candidate C: Treat receipt hashes as sufficient authority. This was
rejected because safe hashes are correlation identifiers only and must not
become owner approval, execution authority, or readiness evidence.

## Testing And Review

## Validation commands

Local focused verification:

- `corepack pnpm vitest run apps/api/src/youtube-live-chat-canary-record-receipt-binding.test.ts apps/api/src/youtube-live-chat-canary-authorization-record.test.ts apps/api/src/youtube-live-chat-canary-audit-receipt.test.ts apps/api/src/youtube-live-chat-canary-authorization-gate.test.ts`

Current result:

- focused canary model tests: pass

Remote current-head CI evidence will be refreshed after PR creation and same-head
GitHub checks complete.

## Test Coverage Evidence

Changed area: YouTube canary authorization blocker registry, audit receipt
schema/verifier, authorization record schema, and pure record/receipt/bundle
binding evaluator.

Test command: `corepack pnpm vitest run apps/api/src/youtube-live-chat-canary-record-receipt-binding.test.ts apps/api/src/youtube-live-chat-canary-authorization-record.test.ts apps/api/src/youtube-live-chat-canary-audit-receipt.test.ts apps/api/src/youtube-live-chat-canary-authorization-gate.test.ts`

What the test covers: canonical blocker acceptance, unknown blocker rejection,
duplicate blocker rejection, blocker ordering, receipt hash integrity, committed
and preview semantic contracts, stricter record status semantics, hash binding,
receipt derivation comparison, temporal binding, typed binding reason codes,
preview non-authority, incomplete committed bundle blocking, and non-executable
output flags.

Edge cases and failure paths: mismatched record bundle hash, mismatched record
receipt hash, tampered receipt hash, tampered receipt semantics, invalid bundle
input, missing references on declared recorded records, revoked records without
reason, non-revoked records with revocation metadata, and raw input non-echo.

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
- record created at receipt time is accepted
- record created after receipt time is accepted
- record created before receipt time is rejected before business record states
- receipt and bundle integrity failures take precedence over temporal binding
- preview receipts remain non-authoritative
- incomplete committed bundles remain blocked
- mismatched receipt bundle hash, record bundle hash, and record receipt hash are
  rejected with specific typed reason codes
- receipt derivation mismatches are rejected with a typed reason code
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
- no token sale
- no token exchange
- no cash-out
- no custody
- no internal balance
- no investment wording
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

## Human confirmation needed

AI technical review may recommend merging if same-head checks pass, but this PR
does not create human/project-owner approval, GitHub approval review, owner
approval record, or merge authority.
