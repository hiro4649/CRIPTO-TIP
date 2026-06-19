export type YouTubeLiveChatRealConnectorReadinessGate = {
  readiness_status: "blocked_pending_owner_scope";
  preflight_status?: "blocked" | "code_ready_network_blocked" | "controlled_canary_candidate";
  network_enabled: false;
  oauth_configured: false;
  real_api_execution: false;
  secret_refs_exposed: false;
  endpoint_values_exposed: false;
  raw_tokens_exposed: false;
  owner_approval_created: false;
  github_approval_review_created: false;
  merge_authority_created: false;
  required_owner_scope: [
    "transport_decision",
    "oauth_scope_decision",
    "secret_storage_decision",
    "quota_budget_decision",
    "privacy_review",
    "data_deletion_review",
    "operator_kill_switch"
  ];
  blocking_reason_codes: string[];
  safe_reason_codes: string[];
};

export type YouTubeLiveChatRealConnectorReadinessEvaluationInput = {
  config_status: "planning_valid" | "preflight_blocked" | "controlled_canary_candidate" | "config_invalid" | "config_valid_for_planning" | "config_blocked";
  oauth_contract_status: "pass" | "blocked";
  planner_status: "pass" | "blocked";
  envelope_status: "pass" | "blocked";
  secret_provider_status: "unselected" | "opaque_interface_ready";
  privacy_review_status: "required" | "pass";
  data_deletion_status: "required" | "pass";
  revocation_runbook_status: "documented" | "missing";
  kill_switch_status: "blocked" | "armed_for_controlled_canary";
  network_authorization_status: "absent" | "present";
};

export function buildYouTubeLiveChatRealConnectorReadinessGate(): YouTubeLiveChatRealConnectorReadinessGate {
  return toReadinessGate(defaultYouTubeCanaryAuthorizationBundle(), [
    "owner_scope_required",
    "transport_decision_pending",
    "oauth_scope_decision_pending",
    "secret_storage_decision_pending",
    "quota_budget_decision_pending",
    "privacy_review_required",
    "data_deletion_review_required",
    "operator_kill_switch_required",
    "network_disabled",
    "oauth_not_configured",
    "real_api_execution_false"
  ]);
}

export function evaluateYouTubeLiveChatRealConnectorReadiness(input: YouTubeLiveChatRealConnectorReadinessEvaluationInput): YouTubeLiveChatRealConnectorReadinessGate {
  const bundle = readinessInputToAuthorizationBundle(input);
  const canonical = evaluateYouTubeCanaryAuthorization(bundle);
  const reasons = [
    ...(input.config_status === "preflight_blocked" || input.config_status === "config_invalid" || input.config_status === "config_blocked" ? ["config_blocked"] : []),
    ...(input.oauth_contract_status !== "pass" ? ["oauth_contract_blocked"] : []),
    ...(input.planner_status !== "pass" ? ["planner_blocked"] : []),
    ...(input.envelope_status !== "pass" ? ["envelope_blocked"] : []),
    ...(input.secret_provider_status !== "opaque_interface_ready" ? ["secret_provider_unselected"] : []),
    ...(input.privacy_review_status !== "pass" ? ["privacy_review_required"] : []),
    ...(input.data_deletion_status !== "pass" ? ["data_deletion_review_required"] : []),
    ...(input.revocation_runbook_status !== "documented" ? ["revocation_runbook_missing"] : []),
    ...(input.kill_switch_status !== "armed_for_controlled_canary" ? ["operator_kill_switch_required"] : []),
    ...(input.network_authorization_status !== "present" ? ["network_authorization_absent"] : [])
  ];
  return toReadinessGate(bundle, reasons.length > 0 ? reasons : canonical.blocker_codes.map(toReadinessReasonCode));
}

function toReadinessGate(bundle: YouTubeCanaryAuthorizationBundle, blockingReasonCodes: string[]): YouTubeLiveChatRealConnectorReadinessGate {
  const projected = projectAuthorizationToRealConnectorReadiness(bundle);
  const networkOnly = blockingReasonCodes.length === 1 && blockingReasonCodes[0] === "network_authorization_absent";
  return {
    readiness_status: "blocked_pending_owner_scope",
    preflight_status: networkOnly ? "code_ready_network_blocked" : projected.config_status === "controlled_canary_candidate" ? "controlled_canary_candidate" : "blocked",
    network_enabled: false,
    oauth_configured: false,
    real_api_execution: false,
    secret_refs_exposed: false,
    endpoint_values_exposed: false,
    raw_tokens_exposed: false,
    owner_approval_created: false,
    github_approval_review_created: false,
    merge_authority_created: false,
    required_owner_scope: [
      "transport_decision",
      "oauth_scope_decision",
      "secret_storage_decision",
      "quota_budget_decision",
      "privacy_review",
      "data_deletion_review",
      "operator_kill_switch"
    ],
    blocking_reason_codes: blockingReasonCodes.length > 0 ? blockingReasonCodes : ["network_authorization_absent"],
    safe_reason_codes: [
      "read_only_admin_gate",
      "no_secret_refs",
      "no_endpoint_values",
      "no_raw_tokens",
      "no_network",
      "no_oauth_execution"
    ]
  };
}

function readinessInputToAuthorizationBundle(input: YouTubeLiveChatRealConnectorReadinessEvaluationInput): YouTubeCanaryAuthorizationBundle {
  const defaults = defaultYouTubeCanaryAuthorizationBundle();
  const fieldComplete =
    input.config_status === "controlled_canary_candidate" &&
    input.oauth_contract_status === "pass" &&
    input.planner_status === "pass" &&
    input.envelope_status === "pass" &&
    input.secret_provider_status === "opaque_interface_ready" &&
    input.privacy_review_status === "pass" &&
    input.data_deletion_status === "pass" &&
    input.revocation_runbook_status === "documented" &&
    input.kill_switch_status === "armed_for_controlled_canary";
  return {
    ...defaults,
    bundleStatus: fieldComplete && input.network_authorization_status === "present" ? "owner_inputs_recorded" : defaults.bundleStatus,
    networkAuthorization: input.network_authorization_status === "present" ? "owner_authorization_recorded" : "absent",
    credentialProvider: input.secret_provider_status === "opaque_interface_ready" ? "opaque_interface_ready" : "unselected",
    clientIdRef: input.secret_provider_status === "opaque_interface_ready" ? "opaque_ref_recorded" : "absent",
    clientSecretRef: input.secret_provider_status === "opaque_interface_ready" ? "opaque_ref_recorded" : "absent",
    refreshTokenRef: input.secret_provider_status === "opaque_interface_ready" ? "opaque_ref_recorded" : "absent",
    redirectUri: input.oauth_contract_status === "pass" && fieldComplete ? "confirmed" : "unconfirmed",
    testChannel: fieldComplete ? "selected_test_only" : "unselected",
    testLiveStream: fieldComplete ? "selected_test_only" : "unselected",
    quotaBudget: input.planner_status === "pass" && fieldComplete ? "confirmed_within_first_canary_limits" : "unconfirmed",
    privacyReview: input.privacy_review_status === "pass" ? "pass" : "incomplete",
    dataDeletionReview: input.data_deletion_status === "pass" ? "pass" : "incomplete",
    revocationRunbook: input.revocation_runbook_status,
    killSwitch: input.kill_switch_status
  };
}

function toReadinessReasonCode(code: YouTubeCanaryAuthorizationBlockerCode) {
  const reasonMap: Record<YouTubeCanaryAuthorizationBlockerCode, string> = {
    network_authorization_absent: "network_authorization_absent",
    credential_provider_unselected: "secret_provider_unselected",
    client_id_ref_absent: "secret_provider_unselected",
    client_secret_ref_absent: "secret_provider_unselected",
    refresh_token_ref_absent: "secret_provider_unselected",
    redirect_uri_unconfirmed: "oauth_contract_blocked",
    test_channel_unselected: "transport_decision_pending",
    test_live_stream_unselected: "transport_decision_pending",
    quota_budget_unconfirmed: "quota_budget_decision_pending",
    privacy_review_incomplete: "privacy_review_required",
    data_deletion_review_incomplete: "data_deletion_review_required",
    revocation_runbook_missing: "revocation_runbook_missing",
    kill_switch_blocked: "operator_kill_switch_required",
    bundle_status_incomplete: "owner_scope_required",
    transport_contract_invalid: "transport_decision_pending",
    first_canary_limit_invalid: "quota_budget_decision_pending",
    side_effect_contract_invalid: "transport_decision_pending",
    execution_flag_must_remain_false: "real_api_execution_false",
    unsafe_authorization_value_forbidden: "unsafe_authorization_value_forbidden",
    authorization_bundle_schema_invalid: "config_blocked"
  };
  return reasonMap[code];
}
import {
  defaultYouTubeCanaryAuthorizationBundle,
  evaluateYouTubeCanaryAuthorization,
  projectAuthorizationToRealConnectorReadiness,
  type YouTubeCanaryAuthorizationBlockerCode,
  type YouTubeCanaryAuthorizationBundle
} from "./youtube-live-chat-canary-authorization-gate.js";
