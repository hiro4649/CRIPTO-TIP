# DB Driver Source-Summary Canonical Model

This document defines the canonical evidence model for the DB driver source-summary phase.

The model is intentionally not a driver selection, not a package introduction, and not a runtime readiness claim. Candidate names are limited to `pg` and `postgres` only so future review work can bind source summaries to known candidates without adding dependencies in this PR.

## Canonical Status

- `canonicalModelStatus`: `model_ready`
- `sourceEvidenceStatus`: `not_reviewed`
- `driverChoiceStatus`: `not_selected`
- `selectedDriver`: `null`
- `ownerApprovalStatus`: `not_approved`
- `finalApprovalGateStatus`: `blocked`

## Evidence Roles

Committed `.codex` evidence can describe the previous safe evidence head. Merge readiness must come from current-head PR body evidence, GitHub required checks, and the current-head safe quality artifact.

Required roles:

- `committedEvidenceRole`: `previous_head_safe_evidence`
- `currentHeadEvidenceRole`: `pr_body_github_checks_safe_artifact`
- `evidenceMode`: `previous_head_committed_plus_current_head_artifact`

## Forbidden Scope

This model forbids package changes, lockfile changes, DB driver dependency selection, real DB connections, migration execution, live DB tests, provider SDK apply, production deployment, and runtime, production, legal, or YouTube policy readiness claims.

The validator rejects unsafe evidence text such as stale placeholder tokens, fake artifact IDs, raw logs, raw advisory output, private URLs, database URLs, wallet addresses, and token-like values.
