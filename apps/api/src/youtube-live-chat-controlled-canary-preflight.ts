import { createHash } from "node:crypto";

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
  return {
    config_status: "planning_valid",
    oauth_contract_status: "pass",
    credential_provider_status: "missing",
    kill_switch_status: "blocked",
    quota_planner_status: "pass",
    direct_rest_transport_status: "pass",
    list_connector_service_status: "pass",
    stream_contract_status: "pass",
    privacy_review_status: "required",
    data_deletion_review_status: "required",
    revocation_runbook_status: "documented",
    network_authorization_status: "absent"
  };
}

export function evaluateYouTubeLiveChatControlledCanaryPreflight(input: YouTubeLiveChatControlledCanaryPreflightInput, now = new Date("2026-06-18T00:00:00.000Z")): YouTubeLiveChatControlledCanaryPreflightResult {
  const reasons = [
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
    config_hash: safeConfigHash(input),
    evaluated_at: now.toISOString(),
    secret_refs_exposed: false,
    credential_handle_exposed: false,
    endpoint_values_exposed: false,
    owner_approval_created: false,
    github_approval_review_created: false,
    merge_authority_created: false
  };
}

function safeConfigHash(input: YouTubeLiveChatControlledCanaryPreflightInput) {
  return `safe_hash_${createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16)}`;
}
