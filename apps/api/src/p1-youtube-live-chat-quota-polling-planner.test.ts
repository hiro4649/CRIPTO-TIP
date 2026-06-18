import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { planYouTubeLiveChatQuotaPolling } from "./youtube-live-chat-quota-polling-planner.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

const fakeMode = {
  execution_mode: "fake_transport" as const,
  kill_switch_status: "armed_for_fake_transport" as const,
  network_authorized: false
};

describe("P1 YouTube Live Chat quota polling planner", () => {
  it("plans a stream poll without starting timers or network calls", () => {
    expect(planYouTubeLiveChatQuotaPolling({
      cycle_index: 0,
      last_polling_interval_ms: 5000,
      quota_remaining_units: 100,
      estimated_request_units: 1,
      same_failure_repeat_count: 0,
      last_failure_class: "none",
      ...fakeMode
    })).toEqual({
      status: "poll_planned",
      next_poll_after_ms: 5000,
      selected_source_mode: "stream",
      action: "open_stream_contract",
      max_cycles: 5,
      same_failure_repeat_limit: 2,
      network_call_scheduled: false,
      fake_transport_call_scheduled: true,
      execution_mode: "fake_transport",
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
      last_failure_class: "stream_disconnected",
      ...fakeMode
    });

    expect(plan.status).toBe("poll_backoff_planned");
    expect(plan.selected_source_mode).toBe("stream");
    expect(plan.action).toBe("open_stream_contract");
    expect(plan.next_poll_after_ms).toBe(10000);
    expect(plan.network_call_scheduled).toBe(false);
    expect(plan.fake_transport_call_scheduled).toBe(true);
  });

  it("blocks max cycle, insufficient quota, repeated failures, and real connector blockers", () => {
    const base = {
      cycle_index: 0,
      last_polling_interval_ms: 5000,
      quota_remaining_units: 100,
      estimated_request_units: 1,
      same_failure_repeat_count: 0,
      last_failure_class: "none" as const,
      ...fakeMode
    };

    expect(planYouTubeLiveChatQuotaPolling({ ...base, cycle_index: 5 }).safe_reason_codes).toContain("max_cycle_reached");
    expect(planYouTubeLiveChatQuotaPolling({ ...base, quota_remaining_units: 0 }).safe_reason_codes).toContain("quota_budget_insufficient");
    expect(planYouTubeLiveChatQuotaPolling({ ...base, same_failure_repeat_count: 2 }).safe_reason_codes).toContain("same_failure_repeat_limit_reached");
    expect(planYouTubeLiveChatQuotaPolling({ ...base, last_failure_class: "network_forbidden" }).safe_reason_codes).toContain("network_forbidden_blocker");
    expect(planYouTubeLiveChatQuotaPolling({ ...base, last_failure_class: "oauth_missing" }).safe_reason_codes).toContain("oauth_missing_blocker");
  });

  it("aligns fake transport mode with kill switch and keeps controlled canary blocked", () => {
    const base = {
      cycle_index: 0,
      last_polling_interval_ms: 5000,
      quota_remaining_units: 100,
      estimated_request_units: 1,
      same_failure_repeat_count: 0,
      last_failure_class: "none" as const
    };

    expect(planYouTubeLiveChatQuotaPolling({ ...base, ...fakeMode })).toMatchObject({
      status: "poll_planned",
      execution_mode: "fake_transport",
      fake_transport_call_scheduled: true,
      network_call_scheduled: false
    });
    expect(planYouTubeLiveChatQuotaPolling({ ...base, execution_mode: "fake_transport", kill_switch_status: "blocked", network_authorized: false })).toMatchObject({
      status: "poll_blocked",
      action: "block_kill_switch",
      fake_transport_call_scheduled: false
    });
    expect(planYouTubeLiveChatQuotaPolling({ ...base, execution_mode: "fake_transport", kill_switch_status: "armed_for_fake_transport", network_authorized: true })).toMatchObject({
      status: "poll_blocked",
      safe_reason_codes: ["fake_transport_requires_network_authorized_false"]
    });
    expect(planYouTubeLiveChatQuotaPolling({ ...base, execution_mode: "controlled_network_canary", kill_switch_status: "armed_for_controlled_network_canary", network_authorized: true })).toMatchObject({
      status: "poll_blocked",
      action: "block_network",
      safe_reason_codes: ["controlled_network_canary_out_of_scope"]
    });
    expect(planYouTubeLiveChatQuotaPolling({ ...base, execution_mode: "fake_transport", kill_switch_status: "armed_for_controlled_network_canary", network_authorized: false })).toMatchObject({
      status: "poll_blocked",
      action: "block_kill_switch",
      safe_reason_codes: ["kill_switch_mode_mismatch"]
    });
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
