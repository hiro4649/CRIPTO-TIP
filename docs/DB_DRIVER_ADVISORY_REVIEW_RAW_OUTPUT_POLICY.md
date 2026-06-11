# DB Driver Advisory Review Raw Output Policy

DB driver advisory evidence must be safe-summary only.

Forbidden raw outputs:

- raw package audit JSON
- raw GitHub advisory API responses
- raw terminal output
- raw dependency tree output
- raw stdout or stderr
- raw stack traces
- raw GitHub Actions logs or trace URLs

The advisory envelope may store compact review status and safe summaries. It
must not store full command output, dependency trees, API responses, private
URLs, secrets, tokens, wallet addresses, or DB connection strings.

This PR does not perform an advisory review. It only defines the envelope and
keeps all current advisory statuses as `not_reviewed`.
