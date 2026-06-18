export type YouTubeLiveChatPlannerStatus =
  | "poll_planned"
  | "poll_backoff_planned"
  | "poll_blocked";

export type YouTubeLiveChatPlannerFailureClass =
  | "none"
  | "quota_unavailable"
  | "stream_disconnected"
  | "page_token_invalid"
  | "network_forbidden"
  | "real_api_not_configured"
  | "oauth_missing";

export type YouTubeLiveChatQuotaPollingPlannerInput = {
  cycle_index: number;
  last_polling_interval_ms: number | null;
  quota_remaining_units: number | null;
  estimated_request_units: number;
  same_failure_repeat_count: number;
  last_failure_class: YouTubeLiveChatPlannerFailureClass;
};

export type YouTubeLiveChatQuotaPollingPlan = {
  status: YouTubeLiveChatPlannerStatus;
  next_poll_after_ms: number | null;
  selected_source_mode: "stream" | "list" | null;
  max_cycles: 5;
  same_failure_repeat_limit: 2;
  network_call_scheduled: false;
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

  if (!Number.isInteger(input.cycle_index) || input.cycle_index < 0) reasons.push("cycle_index_invalid");
  if (input.cycle_index >= maxCycles) reasons.push("max_cycle_reached");
  if (!Number.isInteger(input.estimated_request_units) || input.estimated_request_units <= 0) reasons.push("estimated_request_units_invalid");
  if (input.quota_remaining_units !== null && input.quota_remaining_units < input.estimated_request_units) reasons.push("quota_budget_insufficient");
  if (input.same_failure_repeat_count >= sameFailureRepeatLimit) reasons.push("same_failure_repeat_limit_reached");
  if (input.last_failure_class === "network_forbidden" || input.last_failure_class === "real_api_not_configured" || input.last_failure_class === "oauth_missing") reasons.push(`${input.last_failure_class}_blocker`);

  const invalid = reasons.some((reason) => reason.endsWith("_invalid"));
  const blocked = invalid
    || reasons.includes("max_cycle_reached")
    || reasons.includes("quota_budget_insufficient")
    || reasons.includes("same_failure_repeat_limit_reached")
    || reasons.some((reason) => reason.endsWith("_blocker"));

  if (blocked) {
    return {
      status: "poll_blocked",
      next_poll_after_ms: null,
      selected_source_mode: null,
      max_cycles: maxCycles,
      same_failure_repeat_limit: sameFailureRepeatLimit,
      network_call_scheduled: false,
      timer_started: false,
      safe_reason_codes: reasons
    };
  }

  const backoffFailure = input.last_failure_class !== "none";
  return {
    status: backoffFailure ? "poll_backoff_planned" : "poll_planned",
    next_poll_after_ms: backoffFailure ? backoffForFailure(input.same_failure_repeat_count) : clampPollingInterval(input.last_polling_interval_ms),
    selected_source_mode: input.last_failure_class === "stream_disconnected" ? "list" : "stream",
    max_cycles: maxCycles,
    same_failure_repeat_limit: sameFailureRepeatLimit,
    network_call_scheduled: false,
    timer_started: false,
    safe_reason_codes: backoffFailure ? [`${input.last_failure_class}_backoff_planned`] : ["polling_interval_selected"]
  };
}
