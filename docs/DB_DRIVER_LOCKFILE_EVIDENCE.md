# DB Driver Lockfile Evidence

Lockfile evidence describes the future `pnpm-lock.yaml` review for a DB driver dependency PR.

The current template PR has no lockfile diff and does not change `pnpm-lock.yaml`.

## Future Evidence Shape

A future dependency PR lockfile review must show:

- `pnpm_lock_changed: true`
- selected driver present and matching approval records
- finite transitive dependency count
- unrelated dependency changes are false
- integrity entries reviewed
- optional dependencies reviewed
- native modules reviewed
- postinstall scripts reviewed
- safe summary only

Unrelated lockfile changes or unreviewed install behavior block the future dependency PR.

