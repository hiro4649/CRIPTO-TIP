export type YouTubeLiveChatRealConnectorTransport =
  | "unselected"
  | "direct_rest_fetch_candidate"
  | "googleapis_sdk_candidate";

export type YouTubeLiveChatRealConnectorConfigStatus =
  | "config_valid_for_planning"
  | "config_blocked"
  | "config_invalid";

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
    polling_interval_floor_ms: null
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

  if (config?.secret_refs !== undefined) {
    if (!config.secret_refs || typeof config.secret_refs !== "object") {
      reasons.push("secret_refs_invalid");
    } else {
      validateSecretRef(config.secret_refs.client_id_ref, "client_id", reasons);
      validateSecretRef(config.secret_refs.client_secret_ref, "client_secret", reasons);
      validateSecretRef(config.secret_refs.refresh_credential_ref, "refresh_credential", reasons);
    }
  }

  const blocking = reasons.filter((reason) => reason.includes("must_remain") || reason.includes("forbidden") || reason.includes("raw_secret"));
  return {
    status: reasons.length === 0 ? "config_valid_for_planning" : blocking.length > 0 ? "config_blocked" : "config_invalid",
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
