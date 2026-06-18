import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { planYouTubeLiveChatQuotaPolling } from "./youtube-live-chat-quota-polling-planner.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

describe("P1 YouTube Live Chat quota polling planner", () => {
  it("plans a stream poll without starting timers or network calls", () => {
    expect(planYouTubeLiveChatQuotaPolling({
      cycle_index: 0,
      last_polling_interval_ms: 5000,
      quota_remaining_units: 100,
      estimated_request_units: 1,
      same_failure_repeat_count: 0,
      last_failure_class: "none"
    })).toEqual({
      status: "poll_planned",
      next_poll_after_ms: 5000,
      selected_source_mode: "stream",
      max_cycles: 5,
      same_failure_repeat_limit: 2,
      network_call_scheduled: false,
      timer_started: false,
      safe_reason_codes: ["polling_interval_selected"]
    });
  });

  it("clamps polling interval and switches stream disconnection to list fallback planning", () => {
    const plan = planYouTubeLiveChatQuotaPolling({
      cycle_index: 1,
      last_polling_interval_ms: 100,
      quota_remaining_units: 100,
      estimated_request_units: 1,
      same_failure_repeat_count: 1,
      last_failure_class: "stream_disconnected"
    });

    expect(plan.status).toBe("poll_backoff_planned");
    expect(plan.selected_source_mode).toBe("list");
    expect(plan.next_poll_after_ms).toBe(10000);
    expect(plan.network_call_scheduled).toBe(false);
  });

  it("blocks max cycle, insufficient quota, repeated failures, and real connector blockers", () => {
    const base = {
      cycle_index: 0,
      last_polling_interval_ms: 5000,
      quota_remaining_units: 100,
      estimated_request_units: 1,
      same_failure_repeat_count: 0,
      last_failure_class: "none" as const
    };

    expect(planYouTubeLiveChatQuotaPolling({ ...base, cycle_index: 5 }).safe_reason_codes).toContain("max_cycle_reached");
    expect(planYouTubeLiveChatQuotaPolling({ ...base, quota_remaining_units: 0 }).safe_reason_codes).toContain("quota_budget_insufficient");
    expect(planYouTubeLiveChatQuotaPolling({ ...base, same_failure_repeat_count: 2 }).safe_reason_codes).toContain("same_failure_repeat_limit_reached");
    expect(planYouTubeLiveChatQuotaPolling({ ...base, last_failure_class: "network_forbidden" }).safe_reason_codes).toContain("network_forbidden_blocker");
    expect(planYouTubeLiveChatQuotaPolling({ ...base, last_failure_class: "oauth_missing" }).safe_reason_codes).toContain("oauth_missing_blocker");
  });

  it("committed planner evidence preserves no-network no-timer boundaries", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-quota-polling-planner.json");

    expect(evidence.quotaPollingPlannerStatus).toBe("implemented");
    expect(evidence.maxCycles).toBe(5);
    expect(evidence.sameFailureRepeatLimit).toBe(2);
    expect(evidence.networkCallScheduled).toBe(false);
    expect(evidence.timerStarted).toBe(false);
    expect(evidence.realApiExecution).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
