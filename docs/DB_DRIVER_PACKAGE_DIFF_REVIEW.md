# DB Driver Package Diff Review

Future `package.json` changes for a DB driver must be narrow and owner-approved.

Requirements:

- The diff must contain only the approved DB driver dependency.
- No script changes.
- No unrelated dependency movement.
- No dev/runtime dependency confusion.
- No lifecycle script introduction.
- `pnpm-lock.yaml` must match the approved package diff.

This PR does not modify `package.json`.
