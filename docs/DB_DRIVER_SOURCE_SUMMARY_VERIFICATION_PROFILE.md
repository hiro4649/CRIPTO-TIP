# DB Driver Source-Summary Verification Profile

Reusable profile ID:

- `db_driver_source_summary_v1`

The profile verifies:

- canonical model status is ready
- previous-head committed evidence mode is explicit
- current-head PR body, required checks, quality-gate, and artifact evidence are present
- self-referential SHA policy is handled
- PR body edit loop stop policy is defined
- candidate drivers are exactly `pg` and `postgres`
- no driver is selected
- no package, lockfile, runtime DB, migration, provider apply, or production deployment scope is enabled
- unsafe placeholders, fake artifact IDs, raw output, private URLs, database URLs, wallet addresses, and token-like values are rejected

The profile is reusable for later DB driver source-summary review work, but it is not owner approval and not a dependency introduction gate.
