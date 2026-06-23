# CODEX v1.2.8 CRIPTO-TIP Complex Target Spec

<!-- CODEX_QUALITY_HARNESS_FILE v1.2.8 -->

CRIPTO-TIP consumes Codex Harness v1.2.8 as a complex target. The rollout
updates the active target quality-gate path and metadata only. It does not copy
the Source full bundle, change workflows, edit product or runtime code, edit
package or lockfiles, deploy, use wallets, use RPC endpoints, expose secrets,
or make runtime, production, legal, YouTube policy, deployment, wallet, RPC, or
custody approval claims.

## Active Contract

- `activeHarnessVersion`: `1.2.8`
- `activeSelfTestSuite`: `v128`
- `activeSelfTestStatusKey`: `v128SelfTestStatus`
- `rolloutClass`: `complex`
- `materialization`: `target_quality_gate_active_path`

## Preserved v1.2.7 Contract

v1.2.7 remains available through the manifest `versioning` tuple. Final
Decision remains final authority. PR bodies remain display-only. Same-head
evidence, safe artifacts, process receipts, validation reuse, and Stop Circuit
semantics are preserved.

## Token Economy

Routine harness work must keep the read surface bounded:

- one managed safe artifact surface at most
- zero routine cold artifact reads
- one selected skill at most
- zero routine reviewer fanout
- zero routine owner interruption

Diagnostic cold artifact reads are allowed only after failure and remain capped
by the manifest.

## Verification

The complex target verification is:

- `node scripts/codex-v128-self-test.mjs`
- `node scripts/codex-v127-self-test.mjs`
- `node scripts/codex-local-quality-gate.mjs`

Product tests are separate from this harness rollout and are not expanded by
this spec.
