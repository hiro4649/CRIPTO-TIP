export type YouTubeLiveChatApiEnvelopeMode = "stream" | "list";

export type YouTubeLiveChatApiRequestEnvelope = {
  mode: YouTubeLiveChatApiEnvelopeMode;
  method: "GET";
  path_template: "/youtube/v3/liveChat/messages";
  query_keys: ("liveChatId" | "part" | "pageToken" | "maxResults")[];
  auth_header_included: false;
  raw_token_included: false;
  private_url_included: false;
};

export type YouTubeLiveChatApiResponseEnvelope = {
  status: YouTubeLiveChatApiResponseClassification;
  mode: YouTubeLiveChatApiEnvelopeMode;
  page: null;
  next_page_token: null;
  polling_interval_ms: null;
  raw_response_included: false;
  safe_failure: {
    failure_class: "network_forbidden";
    safe_reason: "real_youtube_api_transport_not_authorized";
    raw_logs_read: false;
    scope_expansion: false;
  };
};

export type YouTubeLiveChatApiResponseClassification =
  | "success_page"
  | "success_stream_chunk"
  | "live_chat_disabled"
  | "live_chat_ended"
  | "live_chat_not_found"
  | "rate_limit_exceeded"
  | "page_token_invalid"
  | "forbidden"
  | "quota_unavailable"
  | "oauth_missing"
  | "network_forbidden"
  | "response_invalid"
  | "stream_disconnected";

export type YouTubeLiveChatApiTransport = {
  execute(envelope: YouTubeLiveChatApiRequestEnvelope): Promise<YouTubeLiveChatApiResponseEnvelope>;
};

export function buildYouTubeLiveChatApiRequestEnvelope(input: {
  mode: YouTubeLiveChatApiEnvelopeMode;
  live_chat_id?: string;
  part?: ("id" | "snippet" | "authorDetails")[];
  page_token?: string | null;
  max_results?: number;
  hl?: string | null;
  timeout_budget_ms?: number;
  credential_handle_present?: boolean;
}): YouTubeLiveChatApiRequestEnvelope {
  if (input.max_results !== undefined && (!Number.isInteger(input.max_results) || input.max_results < 200 || input.max_results > 2000)) throw new Error("max_results_out_of_bounds");
  if (input.part && input.part.join(",") !== "id,snippet,authorDetails") throw new Error("part_exact_allowlist_required");
  const queryKeys: YouTubeLiveChatApiRequestEnvelope["query_keys"] = ["liveChatId", "part"];
  if (input.page_token) queryKeys.push("pageToken");
  if (input.max_results !== undefined) queryKeys.push("maxResults");
  return {
    mode: input.mode,
    method: "GET",
    path_template: "/youtube/v3/liveChat/messages",
    query_keys: queryKeys,
    auth_header_included: false,
    raw_token_included: false,
    private_url_included: false
  };
}

export function classifyYouTubeLiveChatApiResponse(input: { http_status: number; reason?: string | null; stream_disconnected?: boolean }): YouTubeLiveChatApiResponseClassification {
  if (input.stream_disconnected) return "stream_disconnected";
  if (input.http_status === 200) return "success_page";
  if (input.http_status === 400) return input.reason === "pageTokenInvalid" ? "page_token_invalid" : "response_invalid";
  if (input.http_status === 401) return "oauth_missing";
  if (input.http_status === 403) {
    if (input.reason === "liveChatDisabled") return "live_chat_disabled";
    if (input.reason === "liveChatEnded") return "live_chat_ended";
    if (input.reason === "rateLimitExceeded") return "rate_limit_exceeded";
    if (input.reason === "quotaExceeded") return "quota_unavailable";
    return "forbidden";
  }
  if (input.http_status === 404) return "live_chat_not_found";
  if (input.http_status === 429) return "rate_limit_exceeded";
  if (input.http_status >= 500) return "response_invalid";
  return "response_invalid";
}

export function toYouTubeLiveChatApiRequestAdminProjection(input: { live_chat_id: string; part: ("id" | "snippet" | "authorDetails")[]; max_results: number; page_token?: string | null; hl?: string | null }) {
  return {
    live_chat_id_hash: createHashSafe(input.live_chat_id),
    part: input.part,
    max_results: input.max_results,
    page_token_present: Boolean(input.page_token),
    hl_present: Boolean(input.hl)
  };
}

function createHashSafe(value: string) {
  let hash = 0;
  for (const char of value) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return `safe_hash_${Math.abs(hash)}`;
}

export class NetworkForbiddenYouTubeLiveChatApiTransport implements YouTubeLiveChatApiTransport {
  async execute(envelope: YouTubeLiveChatApiRequestEnvelope): Promise<YouTubeLiveChatApiResponseEnvelope> {
    return {
      status: "network_forbidden",
      mode: envelope.mode,
      page: null,
      next_page_token: null,
      polling_interval_ms: null,
      raw_response_included: false,
      safe_failure: {
        failure_class: "network_forbidden",
        safe_reason: "real_youtube_api_transport_not_authorized",
        raw_logs_read: false,
        scope_expansion: false
      }
    };
  }
}
