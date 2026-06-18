export type YouTubeLiveChatSourceMode = "stream" | "list";

export type YouTubeLiveChatSafeFailureClass =
  | "oauth_missing"
  | "quota_unavailable"
  | "stream_disconnected"
  | "page_token_invalid"
  | "network_forbidden"
  | "real_api_not_configured"
  | "fixture_exhausted"
  | "fixture_invalid";

export type YouTubeLiveChatSafeFailure = {
  failure_class: YouTubeLiveChatSafeFailureClass;
  safe_reason: string;
  raw_logs_read: false;
  scope_expansion: false;
};

export type YouTubeLiveChatReadRequest = {
  live_chat_id: string;
  page_token?: string | null;
  max_results?: number;
  timeout_budget_ms?: number;
};

export type YouTubeLiveChatReadResult = {
  source_mode: YouTubeLiveChatSourceMode;
  page?: unknown;
  next_page_token: string | null;
  polling_interval_ms: number | null;
  safe_failure?: YouTubeLiveChatSafeFailure;
  observed_at: string;
};

export type YouTubeLiveChatClientCapability = {
  client_kind: "fake_fixture";
  network_enabled: false;
  oauth_configured: false;
  real_api_execution: false;
  supports_stream_list: false;
  supports_list_fallback: false;
  supports_fixture_pages: true;
  supports_cursor_handoff: true;
};

export interface YouTubeLiveChatClient {
  getCapability(): YouTubeLiveChatClientCapability;
  readStreamPage(request: YouTubeLiveChatReadRequest): Promise<YouTubeLiveChatReadResult>;
  readListPage(request: YouTubeLiveChatReadRequest): Promise<YouTubeLiveChatReadResult>;
}

export function fakeFixtureCapability(): YouTubeLiveChatClientCapability {
  return {
    client_kind: "fake_fixture",
    network_enabled: false,
    oauth_configured: false,
    real_api_execution: false,
    supports_stream_list: false,
    supports_list_fallback: false,
    supports_fixture_pages: true,
    supports_cursor_handoff: true
  };
}
