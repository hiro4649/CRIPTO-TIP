export type YouTubeLiveChatRealConnectorReadinessGate = {
  readiness_status: "blocked_pending_owner_scope";
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
