# Security

Names, messages, YouTube author names, wallet-derived labels, and display names are untrusted. Render text with React text nodes or `textContent`, never HTML injection.

Wallet addresses and secrets must not be passed to AI prompts. AI reaction requests include sanitized display names and messages only, with explicit constraints against token price, financial return, wallet address reading, and romantic escalation from payment.

Event idempotency:

- Chain logs use `tx_hash + log_index` with chain and contract context.
- `support_events` use `source + source_event_id`.
- Affinity uses `source_event_id`.

Admin operations require bearer tokens in MVP and must become audited RBAC operations in production.

Overlay CSP plan:

```text
default-src 'self';
script-src 'self';
style-src 'self';
connect-src 'self' ws: wss:;
img-src 'none';
media-src 'none';
object-src 'none';
frame-ancestors 'self' obs:;
base-uri 'none';
form-action 'none';
```

The overlay must not load user-provided images, URLs, scripts, audio, or HTML.
