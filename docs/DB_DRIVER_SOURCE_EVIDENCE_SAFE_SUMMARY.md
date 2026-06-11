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

Future reviewed summaries must be generated in the dependency PR that actually
reviews the source evidence. They must bind package name, package version,
candidate driver, target commit, PR number, target branch, source category,
checked timestamp, and expiry timestamp.

