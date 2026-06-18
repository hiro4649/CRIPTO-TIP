export type YouTubeLiveChatRealConnectorTransport =
  | "unselected"
  | "direct_rest_fetch_candidate"
  | "googleapis_sdk_candidate";

export type YouTubeLiveChatRealConnectorConfigStatus =
  | "config_valid_for_planning"
  | "planning_valid"
  | "preflight_blocked"
  | "controlled_canary_candidate"
  | "config_blocked"
  | "config_invalid";

export type YouTubeLiveChatConnectorExecutionMode = "planning_only" | "fake_transport" | "controlled_network_canary";

export type YouTubeLiveChatRealConnectorSecretRefs = {
  client_id_ref?: string;
  client_secret_ref?: string;
  refresh_credential_ref?: string;
};

export type YouTubeLiveChatRealConnectorConfig = {
  transport: YouTubeLiveChatRealConnectorTransport;
  network_enabled: false;
  oauth_configured: false;
  real_api_execution: false;
  oauth_scopes: string[];
  quota_budget_units_per_day: number | null;
  polling_interval_floor_ms: number | null;
  transport_decision_status?: "pending_owner_scope" | "documented";
  scope_verification_status?: "verified_official" | "pending_official_verification";
  selected_scope_ids?: string[];
  list_mode_enabled?: boolean;
  stream_mode_enabled?: boolean;
  list_fallback_enabled?: boolean;
  kill_switch_status?: "blocked" | "armed_for_fake_transport" | "armed_for_controlled_canary";
  execution_mode?: YouTubeLiveChatConnectorExecutionMode;
  network_authorization_receipt_present?: boolean;
  secret_provider_configured?: boolean;
  estimated_list_request_cost_units?: number | null;
  estimated_stream_request_cost_units?: number | null;
  max_results?: number | null;
  timeout_budget_ms?: number | null;
  secret_refs?: YouTubeLiveChatRealConnectorSecretRefs;
};

export type YouTubeLiveChatRealConnectorConfigValidation = {
  status: YouTubeLiveChatRealConnectorConfigStatus;
  safe_reason_codes: string[];
  network_enabled: false;
  oauth_configured: false;
  real_api_execution: false;
  package_change_required: false;
  secret_values_read: false;
};

export type YouTubeLiveChatRealConnectorAdminProjection = Omit<YouTubeLiveChatRealConnectorConfig, "secret_refs"> & {
  config_status: YouTubeLiveChatRealConnectorConfigStatus;
  secret_refs_configured: boolean;
  safe_reason_codes: string[];
};

const transports = new Set<YouTubeLiveChatRealConnectorTransport>([
  "unselected",
  "direct_rest_fetch_candidate",
  "googleapis_sdk_candidate"
]);

const allowedPlanningScopes = new Set([
  "https://www.googleapis.com/auth/youtube.readonly"
]);

export function defaultYouTubeLiveChatRealConnectorConfig(): YouTubeLiveChatRealConnectorConfig {
  return {
    transport: "unselected",
    network_enabled: false,
    oauth_configured: false,
    real_api_execution: false,
    oauth_scopes: [],
    quota_budget_units_per_day: null,
    polling_interval_floor_ms: null,
    transport_decision_status: "pending_owner_scope",
    scope_verification_status: "pending_official_verification",
    selected_scope_ids: [],
    list_mode_enabled: false,
    stream_mode_enabled: false,
    list_fallback_enabled: false,
    kill_switch_status: "blocked",
    execution_mode: "planning_only",
    network_authorization_receipt_present: false,
    secret_provider_configured: false,
    estimated_list_request_cost_units: null,
    estimated_stream_request_cost_units: null,
    max_results: null,
    timeout_budget_ms: null
  };
}

function hasUnsafePrivateUrl(value: string) {
  return /https?:\/\/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|[^/\s]+\.local)/i.test(value);
}

function looksLikeRawToken(value: string) {
  if (/^secretref:[a-z0-9][a-z0-9:._/-]{2,80}$/u.test(value)) return false;
  return /bearer\s+/i.test(value)
    || /\bya29\.[a-z0-9._-]+/i.test(value)
    || /\bsk-[a-z0-9_-]+/i.test(value)
    || /[A-Za-z0-9_-]{40,}/.test(value);
}

function validateSecretRef(value: unknown, field: string, reasons: string[]) {
  if (typeof value !== "string" || value.trim() !== value || value.length < 8 || value.length > 96) {
    reasons.push(`${field}_ref_invalid`);
    return;
  }
  if (value.startsWith("{") || value.includes("\"client_secret\"") || value.includes("\"refresh_token\"")) reasons.push(`${field}_json_credential_blob_forbidden`);
  if (hasUnsafePrivateUrl(value)) reasons.push(`${field}_private_url_forbidden`);
  if (looksLikeRawToken(value)) reasons.push(`${field}_raw_secret_forbidden`);
}

export function validateYouTubeLiveChatRealConnectorConfig(input: unknown): YouTubeLiveChatRealConnectorConfigValidation {
  const config = input as Partial<YouTubeLiveChatRealConnectorConfig> | null;
  const reasons: string[] = [];

  if (!config || typeof config !== "object") reasons.push("config_object_required");
  if (config && !transports.has(config.transport as YouTubeLiveChatRealConnectorTransport)) reasons.push("transport_unknown");
  if (config?.network_enabled !== false) reasons.push("network_must_remain_disabled");
  if (config?.oauth_configured !== false) reasons.push("oauth_must_remain_unconfigured");
  if (config?.real_api_execution !== false) reasons.push("real_api_execution_must_remain_false");
  if (!Array.isArray(config?.oauth_scopes)) reasons.push("oauth_scopes_array_required");
  for (const scope of config?.oauth_scopes ?? []) {
    if (!allowedPlanningScopes.has(scope)) reasons.push("oauth_scope_not_allowed_for_planning");
  }
  if (config?.quota_budget_units_per_day !== null && (typeof config?.quota_budget_units_per_day !== "number" || config.quota_budget_units_per_day <= 0)) reasons.push("quota_budget_invalid");
  if (config?.polling_interval_floor_ms !== null && (typeof config?.polling_interval_floor_ms !== "number" || config.polling_interval_floor_ms < 1000)) reasons.push("polling_interval_floor_invalid");
  if (config?.max_results !== undefined && config.max_results !== null && (!Number.isInteger(config.max_results) || config.max_results < 200 || config.max_results > 2000)) reasons.push("max_results_out_of_bounds");
  if (config?.timeout_budget_ms !== undefined && config.timeout_budget_ms !== null && (!Number.isInteger(config.timeout_budget_ms) || config.timeout_budget_ms <= 0)) reasons.push("timeout_budget_invalid");
  if (config?.list_fallback_enabled === true && config.list_mode_enabled !== true) reasons.push("list_fallback_requires_list_mode");
  if (config?.stream_mode_enabled !== false && config?.stream_mode_enabled !== true && config?.stream_mode_enabled !== undefined) reasons.push("stream_mode_invalid");
  if (config?.list_mode_enabled !== false && config?.list_mode_enabled !== true && config?.list_mode_enabled !== undefined) reasons.push("list_mode_invalid");
  if (config?.kill_switch_status !== undefined && !["blocked", "armed_for_fake_transport", "armed_for_controlled_canary"].includes(config.kill_switch_status)) reasons.push("kill_switch_status_invalid");
  if (config?.execution_mode !== undefined && !["planning_only", "fake_transport", "controlled_network_canary"].includes(config.execution_mode)) reasons.push("execution_mode_invalid");
  if (config?.execution_mode === "fake_transport" && config.kill_switch_status !== "armed_for_fake_transport") reasons.push("fake_transport_requires_fake_kill_switch");
  if (config?.execution_mode === "fake_transport" && config.network_enabled !== false) reasons.push("fake_transport_network_must_remain_disabled");
  if (config?.network_authorization_receipt_present === true) reasons.push("network_authorization_not_allowed");

  if (config?.secret_refs !== undefined) {
    if (!config.secret_refs || typeof config.secret_refs !== "object") {
      reasons.push("secret_refs_invalid");
    } else {
      validateSecretRef(config.secret_refs.client_id_ref, "client_id", reasons);
      validateSecretRef(config.secret_refs.client_secret_ref, "client_secret", reasons);
      validateSecretRef(config.secret_refs.refresh_credential_ref, "refresh_credential", reasons);
    }
  }

  const blocking = reasons.filter((reason) => reason.includes("must_remain") || reason.includes("forbidden") || reason.includes("raw_secret") || reason.includes("not_allowed"));
  const canaryCandidate = reasons.length === 0
    && config?.transport === "direct_rest_fetch_candidate"
    && config?.scope_verification_status === "verified_official"
    && config?.kill_switch_status === "armed_for_controlled_canary"
    && config?.execution_mode === "controlled_network_canary"
    && config?.list_mode_enabled === true
    && config?.secret_provider_configured === true
    && typeof config?.quota_budget_units_per_day === "number"
    && typeof config?.estimated_list_request_cost_units === "number"
    && config.network_authorization_receipt_present === false;
  return {
    status: reasons.length === 0 ? canaryCandidate ? "controlled_canary_candidate" : "planning_valid" : blocking.length > 0 ? "preflight_blocked" : "config_invalid",
    safe_reason_codes: reasons.length === 0 ? ["planning_config_safe"] : reasons,
    network_enabled: false,
    oauth_configured: false,
    real_api_execution: false,
    package_change_required: false,
    secret_values_read: false
  };
}

export function toYouTubeLiveChatRealConnectorAdminProjection(input: YouTubeLiveChatRealConnectorConfig): YouTubeLiveChatRealConnectorAdminProjection {
  const validation = validateYouTubeLiveChatRealConnectorConfig(input);
  const { secret_refs: secretRefs, ...safeConfig } = input;
  return {
    ...safeConfig,
    config_status: validation.status,
    secret_refs_configured: Boolean(secretRefs && Object.keys(secretRefs).length > 0),
    safe_reason_codes: validation.safe_reason_codes
  };
}
