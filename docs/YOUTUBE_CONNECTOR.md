# YouTube Connector Design

Do not implement scraping.

Future connector uses official YouTube Live APIs:

- `liveChatMessages.streamList` for low latency.
- `liveChatMessages.list` as fallback.
- `liveBroadcasts` and `activeLiveChatId` for session discovery.

Events:

- `youtube.chat.message.received`
- `youtube.viewer.verified`
- `support.received` from `superChatEvent`
- `support.received` from `superStickerEvent`

Verification code:

- Format `IRIS-XXXXXX`.
- Expires in 10 minutes.
- One-time use.
- Author channel id maps to IRIS user id only after verification.
