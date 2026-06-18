import type { YouTubeAccessCredentialHandle, YouTubeCredentialProvider } from "./youtube-credential-provider.js";
import type { YouTubeConnectorKillSwitch } from "./youtube-connector-kill-switch.js";
import { evaluateYouTubeConnectorKillSwitch } from "./youtube-connector-kill-switch.js";

export type YouTubeLiveChatSafeErrorReason =
  | "pageTokenInvalid"
  | "liveChatDisabled"
  | "liveChatEnded"
  | "liveChatNotFound"
  | "rateLimitExceeded"
  | "quotaExceeded"
  | "forbidden"
  | "authError"
  | "upstreamUnavailable";

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
  safe_error_reason?: YouTubeLiveChatSafeErrorReason | null;
}>;

export type YouTubeLiveChatSafePageProjection = {
  nextPageToken?: string;
  pollingIntervalMillis?: number;
  items: unknown[];
};

type TransportBase = {
  fetch_called: boolean;
  fake_fetch_called: boolean;
  network_call_used: false;
  global_fetch_used: false;
  raw_body_stored: false;
  authorization_header_exposed: false;
  credential_handle_acquired: boolean;
  credential_handle_release_attempted: boolean;
  credential_handle_released: boolean;
};

export type YouTubeLiveChatDirectRestListTransportResult =
  | (TransportBase & { status: "success_page"; page: YouTubeLiveChatSafePageProjection; next_page_token: string | null; polling_interval_ms: number | null })
  | (TransportBase & { status: "blocked" | "network_forbidden" | "response_invalid" | "page_token_invalid" | "oauth_missing" | "forbidden" | "live_chat_disabled" | "live_chat_ended" | "live_chat_not_found" | "rate_limit_exceeded" | "quota_unavailable" | "upstream_unavailable" | "credential_release_failed"; page: null; next_page_token: null; polling_interval_ms: null; safe_reason_codes: string[] });

export class YouTubeLiveChatDirectRestListTransport {
  readonly #fetch: YouTubeDirectRestFetch;
  readonly #credentialProvider: YouTubeCredentialProvider;
  readonly #killSwitch: YouTubeConnectorKillSwitch;
  readonly #headBinding: string;
  readonly #configHashBinding: string;
  readonly #scopeIds: string[];

  constructor(input: {
    fetch_fn: YouTubeDirectRestFetch;
    credential_provider: YouTubeCredentialProvider;
    kill_switch: YouTubeConnectorKillSwitch;
    head_binding: string;
    config_hash_binding: string;
    scope_ids: string[];
  }) {
    if (input.scope_ids.length === 0) throw new Error("scope_ids_required");
    if (new Set(input.scope_ids).size !== input.scope_ids.length) throw new Error("scope_ids_duplicate");
    this.#fetch = input.fetch_fn;
    this.#credentialProvider = input.credential_provider;
    this.#killSwitch = input.kill_switch;
    this.#headBinding = input.head_binding;
    this.#configHashBinding = input.config_hash_binding;
    this.#scopeIds = input.scope_ids;
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
    if (!kill.allowed) return blocked("blocked", false, false, false, false, kill.safe_reason_codes);
    const inputReasons = validateRequestInput(input);
    if (inputReasons.length > 0) return blocked("blocked", false, false, false, false, inputReasons);

    const credential = await this.#credentialProvider.acquireAccessCredentialHandle({ scope_ids: this.#scopeIds, ...(input.now ? { now: input.now } : {}) });
    if (credential.status !== "credential_handle_acquired") return blocked("oauth_missing", false, false, false, false, credential.safe_reason_codes);
    let primary: YouTubeLiveChatDirectRestListTransportResult;

    try {
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

      if (response.redirected) primary = blocked("response_invalid", true, true, true, false, ["redirect_blocked"]);
      else if (!response.content_type?.toLowerCase().includes("application/json")) primary = blocked("response_invalid", true, true, true, false, ["json_content_type_required"]);
      else if (Buffer.byteLength(response.body_text, "utf8") > 256_000) primary = blocked("response_invalid", true, true, true, false, ["response_oversized"]);
      else if (response.status !== 200) primary = blocked(classifyHttp(response.status, response.safe_error_reason), true, true, true, false, [classifyHttp(response.status, response.safe_error_reason)]);
      else primary = parseSuccess(response.body_text);
    } catch {
      primary = blocked("upstream_unavailable", true, true, true, false, ["injected_fetch_exception"]);
    }

    try {
      await this.#credentialProvider.releaseAccessCredentialHandle(credential.handle.credential_handle_id);
      return { ...primary, credential_handle_release_attempted: true, credential_handle_released: true };
    } catch {
      return blocked("credential_release_failed", primary.fetch_called, primary.fake_fetch_called, true, false, ["credential_release_failed"]);
    }
  }
}

function validateRequestInput(input: { live_chat_id: string; page_token?: string | null; max_results: number; hl?: string | null; timeout_budget_ms: number }) {
  const reasons: string[] = [];
  if (!input.live_chat_id || input.live_chat_id.length > 240 || /[\u0000-\u001f\u007f]/u.test(input.live_chat_id)) reasons.push("live_chat_id_invalid");
  if (input.page_token !== undefined && input.page_token !== null && (input.page_token.length > 512 || /[\u0000-\u001f\u007f]/u.test(input.page_token))) reasons.push("page_token_invalid");
  if (!Number.isInteger(input.max_results) || input.max_results < 200 || input.max_results > 2000) reasons.push("max_results_out_of_bounds");
  if (input.hl !== undefined && input.hl !== null && (input.hl.length > 35 || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(input.hl))) reasons.push("hl_invalid");
  if (!Number.isInteger(input.timeout_budget_ms) || input.timeout_budget_ms < 100 || input.timeout_budget_ms > 30000) reasons.push("timeout_budget_invalid");
  return reasons;
}

function parseSuccess(bodyText: string): YouTubeLiveChatDirectRestListTransportResult {
  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return blocked("response_invalid", true, true, true, false, ["invalid_json"]);
  }
  const projection = projectSafePage(body);
  if (!projection.ok) return blocked("response_invalid", true, true, true, false, [projection.reason]);
  return {
    status: "success_page",
    page: projection.page,
    next_page_token: projection.page.nextPageToken ?? null,
    polling_interval_ms: projection.page.pollingIntervalMillis ?? null,
    fetch_called: true,
    fake_fetch_called: true,
    network_call_used: false,
    global_fetch_used: false,
    raw_body_stored: false,
    authorization_header_exposed: false,
    credential_handle_acquired: true,
    credential_handle_release_attempted: false,
    credential_handle_released: false
  };
}

function projectSafePage(body: unknown): { ok: true; page: YouTubeLiveChatSafePageProjection } | { ok: false; reason: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { ok: false, reason: "response_root_invalid" };
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.items)) return { ok: false, reason: "items_array_required" };
  if (record.nextPageToken !== undefined && (typeof record.nextPageToken !== "string" || record.nextPageToken.length > 512)) return { ok: false, reason: "next_page_token_invalid" };
  if (record.pollingIntervalMillis !== undefined && (!Number.isInteger(record.pollingIntervalMillis) || (record.pollingIntervalMillis as number) < 0 || (record.pollingIntervalMillis as number) > 300000)) return { ok: false, reason: "polling_interval_invalid" };
  return {
    ok: true,
    page: {
      ...(typeof record.nextPageToken === "string" ? { nextPageToken: record.nextPageToken } : {}),
      ...(typeof record.pollingIntervalMillis === "number" ? { pollingIntervalMillis: record.pollingIntervalMillis } : {}),
      items: record.items
    }
  };
}

function blocked(status: Exclude<YouTubeLiveChatDirectRestListTransportResult["status"], "success_page">, fetchCalled: boolean, fakeFetchCalled: boolean, credentialAcquired: boolean, credentialReleased: boolean, safeReasonCodes: string[]): YouTubeLiveChatDirectRestListTransportResult {
  return {
    status,
    page: null,
    next_page_token: null,
    polling_interval_ms: null,
    fetch_called: fetchCalled,
    fake_fetch_called: fakeFetchCalled,
    network_call_used: false,
    global_fetch_used: false,
    raw_body_stored: false,
    authorization_header_exposed: false,
    credential_handle_acquired: credentialAcquired,
    credential_handle_release_attempted: credentialAcquired,
    credential_handle_released: credentialReleased,
    safe_reason_codes: safeReasonCodes
  };
}

function classifyHttp(status: number, reason?: YouTubeLiveChatSafeErrorReason | null): Exclude<YouTubeLiveChatDirectRestListTransportResult["status"], "success_page" | "blocked" | "network_forbidden" | "credential_release_failed"> {
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
