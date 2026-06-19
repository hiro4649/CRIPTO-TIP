import {
  defaultYouTubeCanaryAuthorizationBundle,
  evaluateYouTubeCanaryAuthorization,
  projectAuthorizationToLegacyPreflight,
  safeCanonicalAuthorizationHash,
  type YouTubeCanaryAuthorizationBundle,
  type YouTubeCanaryAuthorizationBlockerCode
} from "./youtube-live-chat-canary-authorization-gate.js";

export type YouTubeLiveChatControlledCanaryPreflightInput = {
  config_status: "planning_valid" | "preflight_blocked" | "controlled_canary_candidate" | "config_invalid";
  oauth_contract_status: "pass" | "blocked";
  credential_provider_status: "missing" | "opaque_interface_ready";
  kill_switch_status: "blocked" | "armed_for_fake_transport" | "armed_for_controlled_canary";
  quota_planner_status: "pass" | "blocked";
  direct_rest_transport_status: "pass" | "blocked";
  list_connector_service_status: "pass" | "blocked";
  stream_contract_status: "pass" | "blocked";
  privacy_review_status: "required" | "pass";
  data_deletion_review_status: "required" | "pass";
  revocation_runbook_status: "documented" | "missing";
  network_authorization_status: "absent" | "present";
};

export type YouTubeLiveChatControlledCanaryPreflightResult = {
  preflight_status: "blocked" | "code_ready_network_blocked";
  transport_kind: "direct_rest_fetch_candidate";
  list_transport_status: "pass" | "blocked";
  list_connector_service_status: "pass" | "blocked";
  stream_contract_status: "pass" | "blocked";
  oauth_contract_status: "pass" | "blocked";
  credential_provider_status: "missing" | "opaque_interface_ready";
  kill_switch_status: "blocked" | "armed_for_fake_transport" | "armed_for_controlled_canary";
  quota_planner_status: "pass" | "blocked";
  privacy_review_status: "required" | "pass";
  data_deletion_review_status: "required" | "pass";
  revocation_runbook_status: "documented" | "missing";
  network_enabled: false;
  oauth_configured: false;
  real_api_execution: false;
  safe_reason_codes: string[];
  config_hash: string;
  evaluated_at: string;
  secret_refs_exposed: false;
  credential_handle_exposed: false;
  endpoint_values_exposed: false;
  owner_approval_created: false;
  github_approval_review_created: false;
  merge_authority_created: false;
};

export function defaultYouTubeLiveChatControlledCanaryPreflightInput(): YouTubeLiveChatControlledCanaryPreflightInput {
  return projectAuthorizationToLegacyPreflight(defaultYouTubeCanaryAuthorizationBundle());
}

export function evaluateYouTubeLiveChatControlledCanaryPreflight(input: YouTubeLiveChatControlledCanaryPreflightInput, now = new Date("2026-06-18T00:00:00.000Z")): YouTubeLiveChatControlledCanaryPreflightResult {
  const bundle = legacyPreflightToAuthorizationBundle(input);
  const canonical = evaluateYouTubeCanaryAuthorization(bundle, now);
  const legacyReasons = [
    ...(input.config_status === "preflight_blocked" || input.config_status === "config_invalid" ? ["config_blocked"] : []),
    ...(input.oauth_contract_status !== "pass" ? ["oauth_contract_blocked"] : []),
    ...(input.credential_provider_status !== "opaque_interface_ready" ? ["real_credential_provider_missing"] : []),
    ...(input.kill_switch_status !== "armed_for_controlled_canary" ? ["operator_kill_switch_not_armed_for_network"] : []),
    ...(input.quota_planner_status !== "pass" ? ["quota_runtime_budget_unconfirmed"] : []),
    ...(input.direct_rest_transport_status !== "pass" ? ["direct_rest_transport_blocked"] : []),
    ...(input.list_connector_service_status !== "pass" ? ["list_connector_service_blocked"] : []),
    ...(input.stream_contract_status !== "pass" ? ["stream_contract_blocked"] : []),
    ...(input.privacy_review_status !== "pass" ? ["privacy_review_incomplete"] : []),
    ...(input.data_deletion_review_status !== "pass" ? ["data_deletion_review_incomplete"] : []),
    ...(input.revocation_runbook_status !== "documented" ? ["revocation_runbook_missing"] : []),
    ...(input.network_authorization_status !== "present" ? ["network_authorization_missing"] : [])
  ];
  const reasons = legacyReasons.length > 0 ? legacyReasons : canonical.blocker_codes.map(toLegacyReasonCode);
  const nonNetworkReasons = reasons.filter((reason) => reason !== "network_authorization_missing");
  return {
    preflight_status: nonNetworkReasons.length === 0 ? "code_ready_network_blocked" : "blocked",
    transport_kind: "direct_rest_fetch_candidate",
    list_transport_status: input.direct_rest_transport_status,
    list_connector_service_status: input.list_connector_service_status,
    stream_contract_status: input.stream_contract_status,
    oauth_contract_status: input.oauth_contract_status,
    credential_provider_status: input.credential_provider_status,
    kill_switch_status: input.kill_switch_status,
    quota_planner_status: input.quota_planner_status,
    privacy_review_status: input.privacy_review_status,
    data_deletion_review_status: input.data_deletion_review_status,
    revocation_runbook_status: input.revocation_runbook_status,
    network_enabled: false,
    oauth_configured: false,
    real_api_execution: false,
    safe_reason_codes: reasons.length > 0 ? reasons : ["real_api_execution_forbidden"],
    config_hash: safeCanonicalAuthorizationHash(bundle),
    evaluated_at: now.toISOString(),
    secret_refs_exposed: false,
    credential_handle_exposed: false,
    endpoint_values_exposed: false,
    owner_approval_created: false,
    github_approval_review_created: false,
    merge_authority_created: false
  };
}

function legacyPreflightToAuthorizationBundle(input: YouTubeLiveChatControlledCanaryPreflightInput): YouTubeCanaryAuthorizationBundle {
  const defaults = defaultYouTubeCanaryAuthorizationBundle();
  const fieldComplete =
    input.config_status === "controlled_canary_candidate" &&
    input.oauth_contract_status === "pass" &&
    input.credential_provider_status === "opaque_interface_ready" &&
    input.kill_switch_status === "armed_for_controlled_canary" &&
    input.quota_planner_status === "pass" &&
    input.direct_rest_transport_status === "pass" &&
    input.list_connector_service_status === "pass" &&
    input.stream_contract_status === "pass" &&
    input.privacy_review_status === "pass" &&
    input.data_deletion_review_status === "pass" &&
    input.revocation_runbook_status === "documented";
  return {
    ...defaults,
    bundleStatus: fieldComplete && input.network_authorization_status === "present" ? "owner_inputs_recorded" : defaults.bundleStatus,
    networkAuthorization: input.network_authorization_status === "present" ? "owner_authorization_recorded" : "absent",
    credentialProvider: input.credential_provider_status === "opaque_interface_ready" ? "opaque_interface_ready" : "unselected",
    clientIdRef: input.credential_provider_status === "opaque_interface_ready" ? "opaque_ref_recorded" : "absent",
    clientSecretRef: input.credential_provider_status === "opaque_interface_ready" ? "opaque_ref_recorded" : "absent",
    refreshTokenRef: input.credential_provider_status === "opaque_interface_ready" ? "opaque_ref_recorded" : "absent",
    redirectUri: input.oauth_contract_status === "pass" && fieldComplete ? "confirmed" : "unconfirmed",
    testChannel: fieldComplete ? "selected_test_only" : "unselected",
    testLiveStream: fieldComplete ? "selected_test_only" : "unselected",
    quotaBudget: input.quota_planner_status === "pass" && fieldComplete ? "confirmed_within_first_canary_limits" : "unconfirmed",
    privacyReview: input.privacy_review_status === "pass" ? "pass" : "incomplete",
    dataDeletionReview: input.data_deletion_review_status === "pass" ? "pass" : "incomplete",
    revocationRunbook: input.revocation_runbook_status,
    killSwitch: input.kill_switch_status === "armed_for_controlled_canary" ? "armed_for_controlled_canary" : "blocked"
  };
}

function toLegacyReasonCode(code: YouTubeCanaryAuthorizationBlockerCode) {
  const reasonMap: Record<YouTubeCanaryAuthorizationBlockerCode, string> = {
    network_authorization_absent: "network_authorization_missing",
    credential_provider_unselected: "real_credential_provider_missing",
    client_id_ref_absent: "real_credential_provider_missing",
    client_secret_ref_absent: "real_credential_provider_missing",
    refresh_token_ref_absent: "real_credential_provider_missing",
    redirect_uri_unconfirmed: "oauth_contract_blocked",
    test_channel_unselected: "config_blocked",
    test_live_stream_unselected: "config_blocked",
    quota_budget_unconfirmed: "quota_runtime_budget_unconfirmed",
    privacy_review_incomplete: "privacy_review_incomplete",
    data_deletion_review_incomplete: "data_deletion_review_incomplete",
    revocation_runbook_missing: "revocation_runbook_missing",
    kill_switch_blocked: "operator_kill_switch_not_armed_for_network",
    bundle_status_incomplete: "config_blocked",
    transport_contract_invalid: "direct_rest_transport_blocked",
    first_canary_limit_invalid: "quota_runtime_budget_unconfirmed",
    side_effect_contract_invalid: "config_blocked",
    execution_flag_must_remain_false: "real_api_execution_forbidden",
    unsafe_authorization_value_forbidden: "secret_like_input_forbidden",
    authorization_bundle_schema_invalid: "config_blocked"
  };
  return reasonMap[code];
}
