# DB Driver Source Evidence Safe Summary

This document defines the safe-summary boundary for future DB driver source
evidence. A safe summary is a constrained representation of source review
results. It is not the raw advisory, audit, OSV, npm registry, dependency tree,
terminal output, or provider response.

`contract_ready` only means the summary contract exists. It is not source review
approval, owner approval, final gate approval, runtime readiness, production
readiness, legal compliance, or YouTube policy compliance.

Current committed evidence must remain `not_reviewed`. No DB driver is selected.
No package dependency is added. No `package.json` or `pnpm-lock.yaml` change is
authorized by this contract.

`contract_ready` does not permit `sourceEvidenceStatus: reviewed`, a selected
driver, dependency permission flags, `knownBlockers: []`, package changes, or
lockfile changes. It only means the validator and schema can reject unsafe
future summaries.

Future reviewed summaries must be generated in the dependency PR that actually
reviews the source evidence. They must bind package name, package version,
candidate driver, target commit, PR number, target branch, source category,
checked timestamp, and expiry timestamp.

Future reviewed summaries are test-only fixtures until a separate dependency PR
regenerates them for its exact target. They are not owner approval, are not final
gate approval, and must never be copied into current committed `.codex` evidence.
