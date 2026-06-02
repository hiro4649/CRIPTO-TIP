This repository is CRIPTO-TIP.
Keep the repository name spelling exactly as CRIPTO-TIP.
YouTube LIVE is the broadcast and chat surface.
CRIPTO-TIP is an external IRIS Web Companion.
It must not replace YouTube Super Chat payment.
It must convert supported inputs into IRIS support.received events.
All viewer names, messages, YouTube author names, wallet-derived labels, and display names are untrusted input.
Render user input as text nodes, never as executable or parsed HTML.
Pass only sanitized fields to any AI reaction adapter.
Do not pass wallet addresses or secrets to AI prompts.
Use tx_hash + log_index for on-chain uniqueness.
Use source + source_event_id for support_events uniqueness.
Use source_event_id for affinity idempotency.
Use SafeERC20 for token transfers.
Use Pausable for emergency stop.
Use Ownable2Step or AccessControl.
Production owner must be a multisig address.
Do not store user messages or names on-chain.
After TypeScript changes run pnpm lint, pnpm typecheck, pnpm test.
After contract changes run cd contracts && forge test.
Report repo URL, local path, branch, commit SHA, files changed, commands run, test results, security checks, GitHub/browser confirmations, remaining risks, and next recommended action.
