# P0 Runtime Environment Persistence Boundary

This change completes the runtime repository selection gate with environment
awareness.

## Selection Rules

Local and test environments may use the in-memory repository. Staging,
production, and `NODE_ENV=production` block in-memory selection with
`in_memory_repository_forbidden_outside_local_test`.

Requested Postgres runtime remains blocked unless a repository is explicitly
injected. This PR does not create a Postgres driver, pool, client, query, or real
database connection.

`QUEUE_MODE=db_outbox` remains blocked unless a Postgres-compatible repository is
injected.

## Application Boundary

The server module no longer creates the default runtime repository at import
time. Default configuration and repository selection are evaluated when the
default server is built.

Admin operations health reports safe selection metadata:

- repository mode
- persistence mode
- selection status
- durability claimed
- real DB connected
- runtime readiness claimed

It does not return `DATABASE_URL`, DB host, DB user, DB password, database name,
secret references, token values, or readiness claims.

## Boundaries

This PR does not add a DB driver, does not execute a migration, does not connect
to a real database, and does not claim runtime or production readiness.
