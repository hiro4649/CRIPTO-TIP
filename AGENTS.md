# AGENTS.md

## CRIPTO-TIP Working Guide

CRIPTO-TIP is a crypto-tip and YouTube-facing application workspace. Normal work
must stay inside the owner-approved repo scope and should prefer small,
reviewable changes with current-head evidence.

Default commands:
- Install: `corepack enable && corepack pnpm install`
- Lint: `corepack pnpm -r --workspace-concurrency=1 lint`
- Typecheck: `corepack pnpm -r --workspace-concurrency=1 typecheck`
- Test: `vitest run packages/shared apps/api apps/overlay apps/web`
- Evidence or CI changes: use the relevant `evidence:*` or `ci:*` script.

Crypto custody, wallet/RPC access, investment advice, YouTube policy compliance,
legal compliance, production, deployment, and readiness claims require explicit
owner scope and evidence. Done means the smallest relevant verification was run
or honestly reported unavailable, with no raw logs or secret-like output.

<!-- CODEX_QUALITY_HARNESS_BEGIN -->
CODEX_QUALITY_HARNESS_FILE v1.2.9

## Prime Directive

Ship the smallest correct change that increases product value without weakening
truth, trust, security, or maintainability.

This AGENTS.md is a compact doctrine and routing map; detailed policy lives in
docs/process.

## Active Harness

Active target harness: v1.2.9 / v129.
Read first: AGENTS.md, docs/process/CODEX_HARNESS_MANIFEST.json,
docs/process/CODEX_V129_SPEC.md, and docs/process/CODEX_ACTIVE_POLICY_INDEX.json.
README, legacy specs, and PR history are conditional reads only.

## Authority

v1.1.8 Final Decision remains final authority.
v1.1.9 P0 artifacts and operator-visible statuses remain preserved.
v1.2.0 adaptive routing, v1.2.1 calibration, v1.2.2 read-budget routing,
and v1.2.3 observed evidence/decision closure remain compatibility layers.
v1.2.4 specialist-governance fields remain compatibility layers.
v1.2.5 adds Goal Shard, Worktree Fleet, Evidence Lane, Typed Monitor Inbox, Fanout Guard, and Yield fields. v1.2.6 adds observed-state loops. v1.2.7 adds receipt-carried continuation and evidence compression inside the existing P0 artifacts.
Rollback compatibility marker: CODEX_QUALITY_HARNESS_FILE v1.2.7.
Rollback compatibility marker: Active target harness: v1.2.7 / v127.
v1.2.7 remains available as compatibility. v1.2.8 remains available as rollback
compatibility. v1.2.9 adds goal-contracted capability routing and independent
verification metadata inside the existing target quality gate.

## Target Footprint

Do not add new P0 artifacts, top-level statuses, skills, workflow behavior,
product code, package or lockfile changes, runtime code, or readiness claims
for harness rollout unless separately scoped by the owner.
Target AGENTS.md is a compact routing map. Put detailed policy in docs/process
and use profile IDs instead of repeated forbidden-scope text.

## Safety Boundary

Use safe artifacts only. Do not read raw logs. Do not use 8-session.
Do not access wallet/RPC/deploy/secrets, submit GitHub approval review,
self-approve, release, publish, BscScan verify, or claim runtime, production,
legal, or YouTube policy compliance.
Expert agents may make technical findings and one safe next action inside the
goal scope; they cannot create owner authority or widen product/runtime/package
scope. Skeptic review is abnormal-condition only. Safe session learning is
proposal-only and owner-approval-required.

## Local Task Discipline

Start from clean default branch or clean worktree. Preserve user changes.
Run v129, v128 rollback, v127 compatibility self-tests and the local quality gate for harness rollout. For product
work, use the repo-specific commands above and keep product evidence separate
from harness evidence.
<!-- CODEX_QUALITY_HARNESS_END -->
