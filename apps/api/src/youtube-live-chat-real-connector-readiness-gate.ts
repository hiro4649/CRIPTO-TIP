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
  const blockingReasonCodes = [
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
  ];
  return {
    readiness_status: "blocked_pending_owner_scope",
    preflight_status: "blocked",
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
    blocking_reason_codes: blockingReasonCodes,
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

export function evaluateYouTubeLiveChatRealConnectorReadiness(input: YouTubeLiveChatRealConnectorReadinessEvaluationInput): YouTubeLiveChatRealConnectorReadinessGate {
  const gate = buildYouTubeLiveChatRealConnectorReadinessGate();
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
  return {
    ...gate,
    preflight_status: reasons.length === 1 && reasons[0] === "network_authorization_absent" ? "code_ready_network_blocked" : "blocked",
    blocking_reason_codes: reasons.length > 0 ? reasons : ["network_authorization_absent"],
    network_enabled: false,
    oauth_configured: false,
    real_api_execution: false
  };
}
