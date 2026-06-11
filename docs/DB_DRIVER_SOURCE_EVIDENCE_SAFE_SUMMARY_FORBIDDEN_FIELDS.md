# DB Driver Source Evidence Safe Summary Forbidden Fields

Safe-summary evidence rejects forbidden raw fields recursively. The forbidden
set includes raw audit JSON, raw advisory responses, raw OSV responses, raw npm
registry metadata, raw dependency trees, terminal output, stdout, stderr, stack
traces, job URLs, log URLs, raw provider responses, package file contents, and
full dependency tree content.

The recursive key reject list also includes `databaseUrl`, `connectionString`,
`privateKey`, `clientSecret`, `apiKey`, `accessToken`, and `refreshToken`.

The boundary also rejects raw-like values such as private URLs, DB connection
strings, wallet addresses, token-like values, npm audit JSON fragments, GHSA
identifiers, CVE identifiers, OSV raw wording, registry raw wording, and
dependency tree wording.

The value scanner also rejects `postgres://`, `postgresql://`, `DATABASE_URL`,
`PRIVATE KEY`, `ghp_`, `sk-`, `xoxb-`, `AKIA`, `stdout`, `stderr`, stack trace
wording, `logs_url`, `jobs_url`, and wallet-like `0x` values.

The intent is to keep PR bodies, docs, and `.codex` evidence safe-summary only.
If future source review needs raw input, that input stays outside committed PR
evidence and is summarized through the allowed schema.
