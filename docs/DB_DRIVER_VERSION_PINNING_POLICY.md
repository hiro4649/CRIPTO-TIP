# DB Driver Version Pinning Policy

A future DB driver dependency must use an exact version or an owner-approved semver range.

Rules:

- Avoid caret or tilde ranges unless explicitly approved.
- Tie version policy to license, advisory, and supply-chain review evidence.
- Review `pnpm-lock.yaml` alongside `package.json`.
- Keep dependency updates isolated from unrelated package changes.
- Define the security patch update path before runtime use.

This PR does not modify package files.
