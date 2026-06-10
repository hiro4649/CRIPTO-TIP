# DB Driver Dependency PR Template

This document defines the future DB driver dependency PR shape for v1.1.7 preparation.

This PR is template and evidence-contract work only:

- no DB driver is selected here
- no DB driver dependency is added here
- no `package.json` or `pnpm-lock.yaml` change is made here
- no real DB connection is implemented here
- no migration is executed here
- no runtime, production, legal, or YouTube policy readiness is claimed here

## Required Future Attachments

A future DB driver dependency PR must attach:

- project-owner approval record bound to the exact target commit
- final approval gate evidence with `approved_for_dependency_pr`
- selected driver evidence matching owner approval and final gate
- package diff evidence
- lockfile review evidence
- license review evidence
- supply-chain review evidence
- security advisory review evidence
- version pinning evidence
- secret boundary evidence
- testing and review evidence

AI review is not project-owner approval. AI review may recommend merge only after evidence is complete, but it cannot create or impersonate owner confirmation.

## Current Committed Evidence

The committed `.codex/db-driver-dependency-pr-template.json` record must remain:

- `templateStatus: template_ready`
- `selectedDriver: null`
- `ownerApprovalRecordStatus: not_approved`
- `finalApprovalGateStatus: blocked`
- package, lockfile, license, supply-chain, security advisory, version pinning, and secret boundary evidence status: `missing`
- all permission flags: `false`

The template does not authorize dependency introduction.

