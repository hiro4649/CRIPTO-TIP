# P0 Admin Moderation Queue Summary

This change adds a local/internal admin moderation queue summary endpoint.

The summary reports safe queue metadata only: held, approved, and rejected review counts, per-stream counts, a generated timestamp, and newest held timestamp when available. It does not return raw messages, raw payloads, secrets, URLs, stack output, stdout, stderr, jobs_url, or logs_url.

This is local/internal admin moderation queue summary only. It does not create production Admin Console readiness. It does not use real DB. It does not add Redis, Kafka, DB driver, package, or lockfile changes. It does not expose raw messages. It does not expose raw payloads. It does not expose secrets. It does not claim runtime readiness. It does not claim production readiness. It does not claim legal compliance. It does not claim YouTube policy compliance.
