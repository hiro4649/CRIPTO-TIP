# DB Driver Package Diff Evidence

Package diff evidence describes the package manifest change for a future DB driver dependency PR.

The current template PR has no package diff and does not change `package.json`.

## Future Evidence Shape

A future dependency PR package diff evidence must show:

- `package_json_changed: true`
- `pnpm_lock_changed: true`
- exactly one approved DB driver dependency added
- no removed dependencies unless separately justified
- no package script changes
- dependency section explicitly identified as `dependencies` or `devDependencies`
- selected driver matches owner approval record
- selected driver matches final approval gate
- package name matches selected driver
- version spec is exact or an owner-approved range
- no lifecycle scripts added
- no unrelated dependency changes
- safe summary only

Adding more than one dependency, changing scripts, or including unrelated dependency changes blocks the future dependency PR.

