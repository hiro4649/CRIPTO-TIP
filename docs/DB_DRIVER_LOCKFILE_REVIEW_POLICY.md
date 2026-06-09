# DB Driver Lockfile Review Policy

Any future `pnpm-lock.yaml` change for a DB driver requires owner-approved DB driver introduction scope.

Review requirements:

- Lockfile diff must contain only expected DB driver dependency changes.
- Transitive dependencies must be enumerated and reviewed.
- No unrelated dependency updates.
- No unexpected lifecycle scripts.
- No optional native package surprise without explicit review.

This PR does not modify `pnpm-lock.yaml`.
