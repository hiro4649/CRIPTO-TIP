import { parseYouTubeLiveChatPageFixture } from "./youtube-live-chat-page-fixture-parser.js";
import type { YouTubeAccessCredentialHandle, YouTubeCredentialProvider } from "./youtube-credential-provider.js";
import type { YouTubeConnectorKillSwitch } from "./youtube-connector-kill-switch.js";
import { evaluateYouTubeConnectorKillSwitch } from "./youtube-connector-kill-switch.js";

export type YouTubeDirectRestFetch = (input: {
  method: "GET";
  host: "www.googleapis.com";
  path: "/youtube/v3/liveChat/messages";
  query: Record<string, string>;
  credential_handle: YouTubeAccessCredentialHandle;
  timeout_budget_ms: number;
  redirect: "manual";
}) => Promise<{
  status: number;
  content_type: string | null;
  body_text: string;
  redirected?: boolean;
  safe_error_reason?: string | null;
}>;

export type YouTubeLiveChatDirectRestListTransportResult =
  | { status: "success_page"; page: unknown; next_page_token: string | null; polling_interval_ms: number | null; fetch_called: true; raw_body_stored: false; authorization_header_exposed: false }
  | { status: "blocked" | "network_forbidden" | "response_invalid" | "page_token_invalid" | "oauth_missing" | "forbidden" | "live_chat_disabled" | "live_chat_ended" | "live_chat_not_found" | "rate_limit_exceeded" | "quota_unavailable" | "upstream_unavailable"; page: null; next_page_token: null; polling_interval_ms: null; fetch_called: boolean; raw_body_stored: false; authorization_header_exposed: false; safe_reason_codes: string[] };

export class YouTubeLiveChatDirectRestListTransport {
  readonly #fetch: YouTubeDirectRestFetch;
  readonly #credentialProvider: YouTubeCredentialProvider;
  readonly #killSwitch: YouTubeConnectorKillSwitch;
  readonly #headBinding: string;
  readonly #configHashBinding: string;

  constructor(input: {
    fetch_fn: YouTubeDirectRestFetch;
    credential_provider: YouTubeCredentialProvider;
    kill_switch: YouTubeConnectorKillSwitch;
    head_binding: string;
    config_hash_binding: string;
  }) {
    this.#fetch = input.fetch_fn;
    this.#credentialProvider = input.credential_provider;
    this.#killSwitch = input.kill_switch;
    this.#headBinding = input.head_binding;
    this.#configHashBinding = input.config_hash_binding;
  }

  async executeList(input: {
    live_chat_id: string;
    page_token?: string | null;
    max_results: number;
    hl?: string | null;
    timeout_budget_ms: number;
    now?: Date;
  }): Promise<YouTubeLiveChatDirectRestListTransportResult> {
    const kill = evaluateYouTubeConnectorKillSwitch({
      kill_switch: this.#killSwitch,
      expected_head_binding: this.#headBinding,
      expected_config_hash_binding: this.#configHashBinding,
      ...(input.now ? { now: input.now } : {})
    });
    if (!kill.allowed) return blocked("blocked", false, kill.safe_reason_codes);
    if (!Number.isInteger(input.max_results) || input.max_results < 200 || input.max_results > 2000) return blocked("blocked", false, ["max_results_out_of_bounds"]);
    if (!input.live_chat_id) return blocked("blocked", false, ["live_chat_id_required"]);

    const credential = await this.#credentialProvider.acquireAccessCredentialHandle({ scope_ids: ["https://www.googleapis.com/auth/youtube.readonly"], ...(input.now ? { now: input.now } : {}) });
    if (credential.status !== "credential_handle_acquired") return blocked("oauth_missing", false, credential.safe_reason_codes);

    const query: Record<string, string> = {
      liveChatId: input.live_chat_id,
      part: "id,snippet,authorDetails",
      maxResults: String(input.max_results)
    };
    if (input.page_token) query.pageToken = input.page_token;
    if (input.hl) query.hl = input.hl;

    const response = await this.#fetch({
      method: "GET",
      host: "www.googleapis.com",
      path: "/youtube/v3/liveChat/messages",
      query,
      credential_handle: credential.handle,
      timeout_budget_ms: input.timeout_budget_ms,
      redirect: "manual"
    });

    if (response.redirected) return blocked("response_invalid", true, ["redirect_blocked"]);
    if (!response.content_type?.toLowerCase().includes("application/json")) return blocked("response_invalid", true, ["json_content_type_required"]);
    if (response.body_text.length > 256_000) return blocked("response_invalid", true, ["response_oversized"]);

    if (response.status !== 200) return blocked(classifyHttp(response.status, response.safe_error_reason), true, [classifyHttp(response.status, response.safe_error_reason)]);

    let body: unknown;
    try {
      body = JSON.parse(response.body_text);
    } catch {
      return blocked("response_invalid", true, ["invalid_json"]);
    }
    parseYouTubeLiveChatPageFixture({
      context: {
        stream_id: "direct_rest_contract_stream",
        character_id: "direct_rest_contract_character",
        youtube_video_id: "direct_rest_contract_video",
        live_chat_id: input.live_chat_id,
        page_token: input.page_token ?? ""
      },
      page: body
    });
    const bodyRecord = body as { nextPageToken?: unknown; pollingIntervalMillis?: unknown };
    return {
      status: "success_page",
      page: body,
      next_page_token: typeof bodyRecord.nextPageToken === "string" ? bodyRecord.nextPageToken : null,
      polling_interval_ms: typeof bodyRecord.pollingIntervalMillis === "number" ? bodyRecord.pollingIntervalMillis : null,
      fetch_called: true,
      raw_body_stored: false,
      authorization_header_exposed: false
    };
  }
}

function blocked(status: Exclude<YouTubeLiveChatDirectRestListTransportResult["status"], "success_page">, fetchCalled: boolean, safeReasonCodes: string[]): YouTubeLiveChatDirectRestListTransportResult {
  return {
    status,
    page: null,
    next_page_token: null,
    polling_interval_ms: null,
    fetch_called: fetchCalled,
    raw_body_stored: false,
    authorization_header_exposed: false,
    safe_reason_codes: safeReasonCodes
  };
}

function classifyHttp(status: number, reason?: string | null): Exclude<YouTubeLiveChatDirectRestListTransportResult["status"], "success_page" | "blocked" | "network_forbidden"> {
  if (status === 400) return reason === "pageTokenInvalid" ? "page_token_invalid" : "response_invalid";
  if (status === 401) return "oauth_missing";
  if (status === 403) {
    if (reason === "liveChatDisabled") return "live_chat_disabled";
    if (reason === "liveChatEnded") return "live_chat_ended";
    if (reason === "rateLimitExceeded") return "rate_limit_exceeded";
    if (reason === "quotaExceeded") return "quota_unavailable";
    return "forbidden";
  }
  if (status === 404) return "live_chat_not_found";
  if (status === 429) return "rate_limit_exceeded";
  if (status >= 500) return "upstream_unavailable";
  return "response_invalid";
}
