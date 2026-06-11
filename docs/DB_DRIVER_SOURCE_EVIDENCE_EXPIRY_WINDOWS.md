# DB Driver Source Evidence Expiry Windows

Expiry limits future source freshness. Expiry does not imply approval.

| Source category | Maximum freshness window |
| --- | ---: |
| `github_advisory_summary` | 7 days |
| `osv_summary` | 7 days |
| `npm_audit_safe_summary` | 7 days |
| `npm_registry_metadata` | 14 days |
| `maintainer_release_notes_summary` | 30 days |

Future reviewed source evidence must set both `source_checked_at` and
`source_expires_at`. The checked timestamp must not be in the future, the expiry
timestamp must be after the checked timestamp, and the expiry timestamp must be
after the validation time.
