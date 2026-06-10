# DB Driver Approval Dry-Run

The DB driver approval dry-run validates the evidence that a future DB driver introduction PR must provide before any real driver dependency, package change, lockfile change, real DB connection, migration execution, live DB integration test, provider SDK apply, or production deployment.

This PR does not select `pg` or `postgres`. It records committed evidence as `not_ready`, with `selectedDriver: null` and `ownerApprovalRecordStatus: not_approved`.

The passing dry-run path exists only as a test fixture. It uses fake owner approval and fake review evidence to prove the validator can accept a complete future evidence set. That fixture does not authorize real DB work and must not be copied into `.codex` as current approval evidence.

Future DB driver introduction still requires a project-owner-approved record bound to the target PR, branch, target commit, and base commit. The future PR also needs package diff, lockfile, license, supply-chain, security advisory, version pinning, and secret boundary evidence.

The dry-run keeps the IRIS product boundary unchanged: YouTube LIVE remains the broadcast surface, IRIS Web Companion remains the external crypto Tip surface, and no runtime, production, legal, or YouTube policy readiness is claimed.
