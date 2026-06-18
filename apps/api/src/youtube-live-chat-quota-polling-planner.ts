export type YouTubeLiveChatPlannerStatus =
  | "poll_planned"
  | "poll_backoff_planned"
  | "poll_blocked"
  | "poll_terminal";

export type YouTubeLiveChatPlannerFailureClass =
  | "none"
  | "quota_unavailable"
  | "stream_disconnected"
  | "page_token_invalid"
  | "network_forbidden"
  | "real_api_not_configured"
  | "oauth_missing"
  | "live_chat_ended"
  | "live_chat_disabled"
  | "live_chat_not_found"
  | "rate_limit_exceeded";

export type YouTubeLiveChatConnectorExecutionMode = "fake_transport" | "controlled_network_canary";
export type YouTubeLiveChatConnectorKillSwitchStatus = "blocked" | "armed_for_fake_transport" | "armed_for_controlled_network_canary";

export type YouTubeLiveChatQuotaPollingPlannerInput = {
  cycle_index: number;
  last_polling_interval_ms: number | null;
  quota_remaining_units: number | null;
  estimated_request_units: number;
  same_failure_repeat_count: number;
  last_failure_class: YouTubeLiveChatPlannerFailureClass;
  preferred_mode?: "stream" | "list";
  stream_mode_enabled?: boolean;
  list_mode_enabled?: boolean;
  list_fallback_enabled?: boolean;
  stream_connected?: boolean;
  next_page_token?: string | null;
  polling_interval_ms?: number | null;
  max_results?: number;
  execution_mode?: YouTubeLiveChatConnectorExecutionMode;
  kill_switch_status?: YouTubeLiveChatConnectorKillSwitchStatus;
  network_authorized?: boolean;
};

export type YouTubeLiveChatQuotaPollingPlan = {
  status: YouTubeLiveChatPlannerStatus;
  next_poll_after_ms: number | null;
  selected_source_mode: "stream" | "list" | null;
  action:
    | "open_stream_contract"
    | "resume_stream_contract"
    | "read_list_after_ms"
    | "reconcile_cursor"
    | "stop_live_chat_ended"
    | "block_live_chat_disabled"
    | "block_live_chat_not_found"
    | "block_rate_limited"
    | "block_quota"
    | "block_oauth"
    | "block_network"
    | "block_kill_switch"
    | "stop_cycle_budget"
    | "stop_same_failure_repeat"
    | "poll_blocked";
  max_cycles: 5;
  same_failure_repeat_limit: 2;
  network_call_scheduled: false;
  fake_transport_call_scheduled: boolean;
  execution_mode: YouTubeLiveChatConnectorExecutionMode;
  timer_started: false;
  safe_reason_codes: string[];
};

const maxCycles = 5;
const sameFailureRepeatLimit = 2;
const defaultPollingIntervalMs = 5000;
const minPollingIntervalMs = 1000;
const maxPollingIntervalMs = 60000;

function clampPollingInterval(value: number | null) {
  if (value === null || !Number.isFinite(value)) return defaultPollingIntervalMs;
  return Math.min(maxPollingIntervalMs, Math.max(minPollingIntervalMs, Math.trunc(value)));
}

function backoffForFailure(repeatCount: number) {
  return Math.min(maxPollingIntervalMs, defaultPollingIntervalMs * Math.max(1, repeatCount + 1));
}

export function planYouTubeLiveChatQuotaPolling(input: YouTubeLiveChatQuotaPollingPlannerInput): YouTubeLiveChatQuotaPollingPlan {
  const reasons: string[] = [];
  const executionMode = input.execution_mode ?? "fake_transport";

  if (!Number.isInteger(input.cycle_index) || input.cycle_index < 0) reasons.push("cycle_index_invalid");
  if (input.cycle_index >= maxCycles) reasons.push("max_cycle_reached");
  if (!Number.isInteger(input.estimated_request_units) || input.estimated_request_units <= 0) reasons.push("estimated_request_units_invalid");
  if (input.quota_remaining_units !== null && input.quota_remaining_units < input.estimated_request_units) reasons.push("quota_budget_insufficient");
  if (input.same_failure_repeat_count >= sameFailureRepeatLimit) reasons.push("same_failure_repeat_limit_reached");
  if (executionMode === "fake_transport") {
    if (input.kill_switch_status !== undefined && input.kill_switch_status !== "armed_for_fake_transport") reasons.push(input.kill_switch_status === "blocked" ? "kill_switch_blocked" : "kill_switch_mode_mismatch");
    if (input.network_authorized !== false) reasons.push("fake_transport_requires_network_authorized_false");
  }
  if (executionMode === "controlled_network_canary") {
    reasons.push("controlled_network_canary_out_of_scope");
    if (input.kill_switch_status === "armed_for_fake_transport") reasons.push("kill_switch_mode_mismatch");
  }
  if (input.max_results !== undefined && (!Number.isInteger(input.max_results) || input.max_results < 200 || input.max_results > 2000)) reasons.push("max_results_out_of_bounds");
  if (input.last_failure_class === "network_forbidden" || input.last_failure_class === "real_api_not_configured" || input.last_failure_class === "oauth_missing") reasons.push(`${input.last_failure_class}_blocker`);
  if (input.last_failure_class === "live_chat_ended") reasons.push("live_chat_ended_terminal");
  if (input.last_failure_class === "live_chat_disabled") reasons.push("live_chat_disabled_blocker");
  if (input.last_failure_class === "live_chat_not_found") reasons.push("live_chat_not_found_blocker");

  const invalid = reasons.some((reason) => reason.endsWith("_invalid"));
  const blocked = invalid
    || reasons.includes("max_cycle_reached")
    || reasons.includes("quota_budget_insufficient")
    || reasons.includes("same_failure_repeat_limit_reached")
    || reasons.includes("kill_switch_blocked")
    || reasons.includes("kill_switch_mode_mismatch")
    || reasons.includes("fake_transport_requires_network_authorized_false")
    || reasons.includes("controlled_network_canary_out_of_scope")
    || reasons.includes("network_not_authorized")
    || reasons.some((reason) => reason.endsWith("_blocker"));

  if (reasons.includes("live_chat_ended_terminal")) {
    return {
      status: "poll_terminal",
      next_poll_after_ms: null,
      selected_source_mode: null,
      action: "stop_live_chat_ended",
      max_cycles: maxCycles,
      same_failure_repeat_limit: sameFailureRepeatLimit,
      network_call_scheduled: false,
      fake_transport_call_scheduled: false,
      execution_mode: executionMode,
      timer_started: false,
      safe_reason_codes: reasons
    };
  }

  if (blocked) {
    const action = reasons.includes("max_cycle_reached") ? "stop_cycle_budget"
      : reasons.includes("same_failure_repeat_limit_reached") ? "stop_same_failure_repeat"
      : reasons.includes("quota_budget_insufficient") ? "block_quota"
      : reasons.includes("oauth_missing_blocker") ? "block_oauth"
      : reasons.includes("network_forbidden_blocker") || reasons.includes("controlled_network_canary_out_of_scope") ? "block_network"
      : reasons.includes("kill_switch_blocked") || reasons.includes("kill_switch_mode_mismatch") ? "block_kill_switch"
      : reasons.includes("live_chat_disabled_blocker") ? "block_live_chat_disabled"
      : reasons.includes("live_chat_not_found_blocker") ? "block_live_chat_not_found"
      : "poll_blocked";
    return {
      status: "poll_blocked",
      next_poll_after_ms: null,
      selected_source_mode: null,
      action,
      max_cycles: maxCycles,
      same_failure_repeat_limit: sameFailureRepeatLimit,
      network_call_scheduled: false,
      fake_transport_call_scheduled: false,
      execution_mode: executionMode,
      timer_started: false,
      safe_reason_codes: reasons
    };
  }

  const backoffFailure = input.last_failure_class !== "none";
  const selectedMode = input.preferred_mode === "list" ? "list"
    : input.preferred_mode === "stream" && input.next_page_token ? "stream"
    : input.last_failure_class === "stream_disconnected" && input.list_fallback_enabled === true ? "list"
    : "stream";
  const action = input.last_failure_class === "page_token_invalid" ? "reconcile_cursor"
    : selectedMode === "list" ? "read_list_after_ms"
    : input.next_page_token ? "resume_stream_contract"
    : "open_stream_contract";
  return {
    status: backoffFailure ? "poll_backoff_planned" : "poll_planned",
    next_poll_after_ms: backoffFailure ? backoffForFailure(input.same_failure_repeat_count) : clampPollingInterval(input.polling_interval_ms ?? input.last_polling_interval_ms),
    selected_source_mode: selectedMode,
    action,
    max_cycles: maxCycles,
    same_failure_repeat_limit: sameFailureRepeatLimit,
    network_call_scheduled: false,
    fake_transport_call_scheduled: executionMode === "fake_transport",
    execution_mode: executionMode,
    timer_started: false,
    safe_reason_codes: backoffFailure ? [`${input.last_failure_class}_backoff_planned`] : ["polling_interval_selected"]
  };
}
