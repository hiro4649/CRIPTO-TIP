import {
  normalizeYouTubeChatMessageReceived,
  normalizeYouTubeSuperChatToSupportReceived,
  normalizeYouTubeSuperStickerToSupportReceived,
  type SupportReceived,
  type YouTubeChatMessageReceived
} from "@cripto-tip/shared";

export type YouTubeConnectorEvent =
  | { kind: "chat"; event: YouTubeChatMessageReceived }
  | { kind: "super_chat"; event: SupportReceived }
  | { kind: "super_sticker"; event: SupportReceived };

export type YouTubePollResult = {
  events: YouTubeConnectorEvent[];
  nextPageToken?: string;
  pollingIntervalMillis?: number;
  usedFallback: boolean;
};

export type YouTubeConnectorOptions = {
  liveChatId: string;
  streamId: string;
  characterId: string;
  youtubeVideoId?: string;
  pageToken?: string;
};

export interface YouTubeConnector {
  pollLiveChat(options: YouTubeConnectorOptions): Promise<YouTubePollResult>;
}

export class YouTubeApiError extends Error {
  constructor(public readonly statusCode: number, public readonly reason?: string, message = `YouTube API error ${statusCode}`) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

type FetchLike = (url: string, init: { headers: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

type OfficialConnectorArgs = {
  apiKey?: string;
  oauthToken?: string;
  fetchImpl?: FetchLike;
  baseUrl?: string;
  maxAttempts?: number;
};

type LiveChatApiResponse = {
  nextPageToken?: string;
  pollingIntervalMillis?: number;
  items?: unknown[];
};

export class OfficialYouTubeLiveConnector implements YouTubeConnector {
  private readonly fetchImpl: FetchLike;
  private readonly baseUrl: string;
  private readonly maxAttempts: number;

  constructor(private readonly args: OfficialConnectorArgs) {
    this.fetchImpl = args.fetchImpl ?? globalThis.fetch;
    this.baseUrl = args.baseUrl ?? "https://youtube.googleapis.com/youtube/v3/liveChat/messages";
    this.maxAttempts = args.maxAttempts ?? 2;
    if (!args.apiKey && !args.oauthToken) throw new Error("YouTube connector requires an API key or OAuth token boundary");
  }

  async pollLiveChat(options: YouTubeConnectorOptions): Promise<YouTubePollResult> {
    try {
      return await this.requestWithRetry("streamList", options, false);
    } catch (error) {
      if (error instanceof YouTubeApiError && (error.statusCode === 404 || error.statusCode === 501)) return this.requestWithRetry("list", options, true);
      throw error;
    }
  }

  private async requestWithRetry(method: "streamList" | "list", options: YouTubeConnectorOptions, usedFallback: boolean) {
    let lastError: unknown;
    for (let attempt = 0; attempt < this.maxAttempts; attempt += 1) {
      try {
        return await this.request(method, options, usedFallback);
      } catch (error) {
        lastError = error;
        if (!isRetryableYouTubeError(error) || attempt + 1 >= this.maxAttempts) throw error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("YouTube request failed");
  }

  private async request(method: "streamList" | "list", options: YouTubeConnectorOptions, usedFallback: boolean): Promise<YouTubePollResult> {
    const response = await this.fetchImpl(this.buildUrl(method, options), { headers: this.headers() });
    if (!response.ok) {
      const errorBody = parseYouTubeApiErrorBody(await readJsonSafely(response));
      throw new YouTubeApiError(response.status, errorBody.reason, errorBody.message ?? `YouTube API error ${response.status}`);
    }
    const body = parseApiResponse(await response.json());
    const result: YouTubePollResult = { events: (body.items ?? []).map((item) => normalizeApiItem(item, options)), usedFallback };
    if (body.nextPageToken) result.nextPageToken = body.nextPageToken;
    if (body.pollingIntervalMillis) result.pollingIntervalMillis = body.pollingIntervalMillis;
    return result;
  }

  private buildUrl(method: "streamList" | "list", options: YouTubeConnectorOptions) {
    const url = new URL(method === "streamList" ? `${this.baseUrl}:streamList` : this.baseUrl);
    url.searchParams.set("part", "id,snippet,authorDetails");
    url.searchParams.set("liveChatId", options.liveChatId);
    if (options.pageToken) url.searchParams.set("pageToken", options.pageToken);
    if (this.args.apiKey) url.searchParams.set("key", this.args.apiKey);
    return url.toString();
  }

  private headers() {
    return this.args.oauthToken ? { Authorization: `Bearer ${this.args.oauthToken}` } : {};
  }
}

export class MockYouTubeConnector implements YouTubeConnector {
  constructor(private readonly result: YouTubePollResult) {}
  async pollLiveChat() {
    return this.result;
  }
}

export function isRetryableYouTubeError(error: unknown) {
  if (!(error instanceof YouTubeApiError)) return false;
  if (error.statusCode === 403) return isRetryableYouTubeReason(error.reason);
  return error.statusCode === 408 || error.statusCode === 429 || error.statusCode >= 500;
}

export function parseYouTubeApiErrorBody(value: unknown): { reason?: string; status?: string; message?: string } {
  if (!value || typeof value !== "object") return {};
  const root = value as { error?: unknown };
  const error = root.error && typeof root.error === "object" ? root.error as { errors?: unknown; status?: unknown; message?: unknown } : undefined;
  const firstError = Array.isArray(error?.errors) ? error.errors.find((item) => item && typeof item === "object") as { reason?: unknown } | undefined : undefined;
  const parsed: { reason?: string; status?: string; message?: string } = {};
  if (typeof firstError?.reason === "string") parsed.reason = firstError.reason;
  if (typeof error?.status === "string") parsed.status = error.status;
  if (typeof error?.message === "string") parsed.message = error.message;
  return parsed;
}

async function readJsonSafely(response: { json(): Promise<unknown> }) {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function isRetryableYouTubeReason(reason?: string) {
  return reason === "rateLimitExceeded" || reason === "quotaExceeded" || reason === "userRateLimitExceeded";
}

function parseApiResponse(value: unknown): LiveChatApiResponse {
  if (!value || typeof value !== "object") return {};
  const candidate = value as LiveChatApiResponse;
  const response: LiveChatApiResponse = { items: Array.isArray(candidate.items) ? candidate.items : [] };
  if (candidate.nextPageToken) response.nextPageToken = candidate.nextPageToken;
  if (candidate.pollingIntervalMillis) response.pollingIntervalMillis = candidate.pollingIntervalMillis;
  return response;
}

function normalizeApiItem(item: unknown, options: YouTubeConnectorOptions): YouTubeConnectorEvent {
  const value = item as { id?: string; snippet?: Record<string, unknown>; authorDetails?: Record<string, unknown> };
  const snippet = value.snippet ?? {};
  const author = value.authorDetails ?? {};
  const id = String(value.id ?? snippet.liveChatMessageId ?? "");
  const authorChannelId = String(author.channelId ?? snippet.authorChannelId ?? "");
  const authorDisplayName = String(author.displayName ?? "ユーザーさん");
  const publishedAt = String(snippet.publishedAt ?? new Date(0).toISOString());
  const type = String(snippet.type ?? "");
  if (type === "superChatEvent") {
    const details = (snippet.superChatDetails ?? {}) as Record<string, unknown>;
    return {
      kind: "super_chat",
      event: normalizeYouTubeSuperChatToSupportReceived({
        live_chat_message_id: id,
        stream_id: options.streamId,
        youtube_video_id: options.youtubeVideoId,
        character_id: options.characterId,
        author_channel_id: authorChannelId,
        author_display_name: authorDisplayName,
        amount_micros: String(details.amountMicros ?? "0"),
        currency: String(details.currency ?? ""),
        amount_display_string: String(details.amountDisplayString ?? ""),
        tier: Number(details.tier ?? 1),
        user_comment: String(details.userComment ?? ""),
        published_at: publishedAt
      })
    };
  }
  if (type === "superStickerEvent") {
    const details = (snippet.superStickerDetails ?? {}) as Record<string, unknown>;
    const metadata = (details.superStickerMetadata ?? {}) as Record<string, unknown>;
    return {
      kind: "super_sticker",
      event: normalizeYouTubeSuperStickerToSupportReceived({
        live_chat_message_id: id,
        stream_id: options.streamId,
        youtube_video_id: options.youtubeVideoId,
        character_id: options.characterId,
        author_channel_id: authorChannelId,
        author_display_name: authorDisplayName,
        amount_micros: String(details.amountMicros ?? "0"),
        currency: String(details.currency ?? ""),
        amount_display_string: String(details.amountDisplayString ?? ""),
        tier: Number(details.tier ?? 1),
        sticker_display_text: String(metadata.altText ?? "Super Sticker"),
        published_at: publishedAt
      })
    };
  }
  return {
    kind: "chat",
    event: normalizeYouTubeChatMessageReceived({
      live_chat_message_id: id,
      stream_id: options.streamId,
      author_channel_id: authorChannelId,
      author_display_name: authorDisplayName,
      message: String(snippet.displayMessage ?? ""),
      published_at: publishedAt
    })
  };
}
