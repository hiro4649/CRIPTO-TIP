# DB Secret Boundary

No DB credentials are added in this PR.

Future DB integration must use Secret Manager or an approved provider-specific
secret boundary. The repository may store secret reference names only.

Rules:

- DB credentials in Secret Manager only.
- No `.env` committed credential values.
- No PR body secret.
- No audit log secret.
- No safe artifact secret.
- No raw connection string.
- Redacted secret references only.
- Rotation requirement before production-like use.
- Least privilege DB role.
- Separate test and production credentials.
- KMS or Secret Manager required before real DB integration.

Manual gate records and audit logs are evidence, not secret storage.

