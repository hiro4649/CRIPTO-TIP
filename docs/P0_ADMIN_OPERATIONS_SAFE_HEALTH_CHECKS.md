# P0 Admin Operations Safe Health Checks

`GET /admin/operations/health` returns local/internal safe health metadata for the admin operations surface.

This is API-only. It does not add a web UI, external runtime integration, real database connection, Redis, Kafka, DB driver dependency, package change, lockfile change, workflow change, migration, contract change, real YouTube API, OAuth token, RPC, wallet, or deploy path.

The response requires admin bearer authentication. Missing or invalid admin auth returns `401`.

The response includes:

- `generated_at`
- local repository mode as `local_in_memory`
- endpoint availability booleans for DLQ list, redrive, audit export, operations summary, and operations health
- safe rate-limit configuration with redacted key material

The response does not expose raw admin token, token fingerprint, IP address, user-agent, raw payload, secrets, stack, stdout, stderr, `logs_url`, or `jobs_url`.

This does not create runtime readiness. This does not create production readiness. This does not claim legal compliance. This does not claim YouTube policy compliance.
