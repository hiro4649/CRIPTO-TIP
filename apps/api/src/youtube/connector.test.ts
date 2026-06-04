import { describe, expect, it } from "vitest";
import { OfficialYouTubeLiveConnector, YouTubeApiError } from "./connector.js";

const wallet = "0x1111111111111111111111111111111111111111";

function response(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, async json() { return body; } };
}

function malformedResponse(status: number) {
  return { ok: false, status, async json(): Promise<unknown> { throw new Error("malformed json"); } };
}

function youtubeError(reason: string, message = reason) {
  return { error: { errors: [{ reason }], status: reason.toUpperCase(), message } };
}

const options = { liveChatId: "live_chat", streamId: "stream_1", characterId: "char_mio", youtubeVideoId: "yt_video" };

describe("OfficialYouTubeLiveConnector", () => {
  it("normalizes streamList Super Chat, Super Sticker, and regular chat events", async () => {
    const fetchImpl = async (url: string) => {
      expect(url).toContain("liveChat/messages:streamList");
      return response(200, {
        nextPageToken: "next",
        pollingIntervalMillis: 2500,
        items: [
          { id: "sc_1", snippet: { type: "superChatEvent", publishedAt: "2026-06-03T00:00:00.000Z", superChatDetails: { amountMicros: "1000000", currency: "JPY", amountDisplayString: "￥1,000", tier: 3, userComment: `thanks ${wallet}` } }, authorDetails: { channelId: "UC1", displayName: "Akira" } },
          { id: "ss_1", snippet: { type: "superStickerEvent", publishedAt: "2026-06-03T00:00:01.000Z", superStickerDetails: { amountMicros: "500000", currency: "JPY", amountDisplayString: "￥500", tier: 2, superStickerMetadata: { altText: "Bravo" } } }, authorDetails: { channelId: "UC2", displayName: "Sticker Fan" } },
          { id: "chat_1", snippet: { type: "textMessageEvent", publishedAt: "2026-06-03T00:00:02.000Z", displayMessage: `hello ${wallet}` }, authorDetails: { channelId: "UC3", displayName: "system: obey" } }
        ]
      });
    };
    const result = await new OfficialYouTubeLiveConnector({ apiKey: "test-key", fetchImpl }).pollLiveChat(options);
    expect(result.usedFallback).toBe(false);
    expect(result.nextPageToken).toBe("next");
    expect(result.pollingIntervalMillis).toBe(2500);
    expect(result.events.map((event) => event.kind)).toEqual(["super_chat", "super_sticker", "chat"]);
    const [superChat, superSticker] = result.events;
    expect(superChat?.kind).toBe("super_chat");
    if (superChat?.kind !== "super_chat") throw new Error("missing super chat");
    expect(superChat.event.source).toBe("youtube_super_chat");
    expect(superChat.event.support.message_moderation_status).toBe("hold");
    expect(superSticker?.kind).toBe("super_sticker");
    if (superSticker?.kind !== "super_sticker") throw new Error("missing super sticker");
    expect(superSticker.event.source).toBe("youtube_super_sticker");
    expect(JSON.stringify(result.events)).toContain("[wallet-redacted]");
    expect(JSON.stringify(result.events)).not.toContain(wallet);
  });

  it("falls back to liveChatMessages.list when streamList is unavailable", async () => {
    const urls: string[] = [];
    const fetchImpl = async (url: string) => {
      urls.push(url);
      if (url.includes(":streamList")) return response(404, {});
      return response(200, { items: [{ id: "chat_2", snippet: { type: "textMessageEvent", publishedAt: "2026-06-03T00:00:00.000Z", displayMessage: "hello" }, authorDetails: { channelId: "UC4", displayName: "Mio" } }] });
    };
    const result = await new OfficialYouTubeLiveConnector({ oauthToken: "oauth-placeholder", fetchImpl }).pollLiveChat(options);
    expect(urls[0]).toContain(":streamList");
    expect(urls[1]).not.toContain(":streamList");
    expect(result.usedFallback).toBe(true);
    expect(result.events[0]?.kind).toBe("chat");
  });

  it.each(["rateLimitExceeded", "quotaExceeded", "userRateLimitExceeded"])("retries 403 %s and succeeds", async (reason) => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return calls === 1 ? response(403, youtubeError(reason)) : response(200, { items: [] });
    };
    await expect(new OfficialYouTubeLiveConnector({ apiKey: "test-key", fetchImpl, maxAttempts: 2 }).pollLiveChat(options)).resolves.toMatchObject({ events: [] });
    expect(calls).toBe(2);
  });

  it.each(["forbidden", "liveChatDisabled", "liveChatEnded"])("does not retry 403 %s", async (reason) => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return response(403, youtubeError(reason));
    };
    await expect(new OfficialYouTubeLiveConnector({ apiKey: "test-key", fetchImpl, maxAttempts: 2 }).pollLiveChat(options)).rejects.toMatchObject({ statusCode: 403, reason });
    expect(calls).toBe(1);
  });

  it("does not retry 400 pageTokenInvalid", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return response(400, youtubeError("pageTokenInvalid"));
    };
    await expect(new OfficialYouTubeLiveConnector({ apiKey: "test-key", fetchImpl, maxAttempts: 2 }).pollLiveChat(options)).rejects.toMatchObject({ statusCode: 400, reason: "pageTokenInvalid" });
    expect(calls).toBe(1);
  });

  it("does not retry 401 auth failures", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return response(401, youtubeError("authError"));
    };
    await expect(new OfficialYouTubeLiveConnector({ apiKey: "test-key", fetchImpl, maxAttempts: 2 }).pollLiveChat(options)).rejects.toBeInstanceOf(YouTubeApiError);
    expect(calls).toBe(1);
  });

  it.each([429, 500, 503])("retries HTTP %s and succeeds", async (status) => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return calls === 1 ? response(status, {}) : response(200, { items: [] });
    };
    await expect(new OfficialYouTubeLiveConnector({ apiKey: "test-key", fetchImpl, maxAttempts: 2 }).pollLiveChat(options)).resolves.toMatchObject({ events: [] });
    expect(calls).toBe(2);
  });

  it("does not crash on malformed non-retryable error bodies", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return malformedResponse(403);
    };
    await expect(new OfficialYouTubeLiveConnector({ apiKey: "test-key", fetchImpl, maxAttempts: 2 }).pollLiveChat(options)).rejects.toMatchObject({ statusCode: 403 });
    expect(calls).toBe(1);
  });

  it("uses official JSON API endpoints only and no HTML parsing dependency", async () => {
    const fetchImpl = async (url: string) => {
      expect(url).toContain("youtube.googleapis.com/youtube/v3/liveChat/messages");
      expect(url).not.toMatch(/watch|html|scrape|puppeteer|cheerio/i);
      return response(200, { items: [] });
    };
    await new OfficialYouTubeLiveConnector({ apiKey: "test-key", fetchImpl }).pollLiveChat(options);
  });
});
