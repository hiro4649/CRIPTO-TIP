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
  status: "network_forbidden";
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

export type YouTubeLiveChatApiTransport = {
  execute(envelope: YouTubeLiveChatApiRequestEnvelope): Promise<YouTubeLiveChatApiResponseEnvelope>;
};

export function buildYouTubeLiveChatApiRequestEnvelope(input: {
  mode: YouTubeLiveChatApiEnvelopeMode;
  page_token?: string | null;
  max_results?: number;
}): YouTubeLiveChatApiRequestEnvelope {
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
