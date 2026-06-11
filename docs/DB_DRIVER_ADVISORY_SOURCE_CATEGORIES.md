# DB Driver Advisory Source Categories

Allowed source categories for a future safe review:

- `npm_registry_metadata`
- `github_advisory_summary`
- `osv_summary`
- `npm_audit_safe_summary`
- `maintainer_release_notes_summary`

Forbidden source categories:

- `github_raw_logs`
- `npm_audit_raw_json`
- `github_advisory_raw_response`
- `osv_raw_response`
- `snyk_raw_response`
- `terminal_stdout`
- `terminal_stderr`
- `dependency_tree_raw`
- `private_url`
- `db_connection_string`
- `provider_raw_response`

Allowed source category membership does not mean the source was reviewed, the
driver is safe, or the package is approved. It only defines categories that a
future PR may summarize safely after owner-approved source review scope exists.

Forbidden categories must not appear in `allowedSourceCategories`, candidate
allowed source lists, PR bodies, docs evidence, or machine-readable evidence as
review payloads. They may appear only as explicit forbidden category names in
policy records and tests.

