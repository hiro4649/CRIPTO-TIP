# Development Environment

Use Git Bash for repository bootstrap commands on Windows.

Local path:

`C:\Users\HIRO-002\Documents\Codex\CRIPTO-TIP`

Git Bash path:

`/c/Users/HIRO-002/Documents/Codex/CRIPTO-TIP`

No production secrets are required. Use `.env.example` only.

New local variables:

- `DATABASE_URL`
- `QUEUE_MODE`
- `WORKER_ID`
- `OUTBOX_POLL_INTERVAL_MS`
- `MAX_RETRY_COUNT`
- `NODE_ENV`
- `APP_ENV`
- `REJECT_DEFAULT_MOCK_TOKENS_IN_PRODUCTION`

Local and test environments allow `change-me-*` mock tokens. Production-like config rejects those defaults when `REJECT_DEFAULT_MOCK_TOKENS_IN_PRODUCTION=true`.
