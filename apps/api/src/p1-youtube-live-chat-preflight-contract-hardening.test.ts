import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  consumeYouTubeOAuthState,
  issueYouTubeOAuthState,
  validateYouTubeOAuthCallback
} from "./youtube-oauth-lifecycle-contract.js";
import {
  defaultYouTubeLiveChatRealConnectorConfig,
  validateYouTubeLiveChatRealConnectorConfig
} from "./youtube-live-chat-real-connector-config.js";
import { planYouTubeLiveChatQuotaPolling } from "./youtube-live-chat-quota-polling-planner.js";
import {
  buildYouTubeLiveChatApiRequestEnvelope,
  classifyYouTubeLiveChatApiResponse,
  toYouTubeLiveChatApiRequestAdminProjection
} from "./youtube-live-chat-api-envelope-contract.js";
import { evaluateYouTubeLiveChatRealConnectorReadiness } from "./youtube-live-chat-real-connector-readiness-gate.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

describe("P1 YouTube Live Chat preflight contract hardening", () => {
  it("uses 32-byte OAuth state, session binding, single-use consume, and safe metadata only", () => {
    const issued = issueYouTubeOAuthState({
      redirect_uri: "https://example.invalid/oauth/callback",
      oauth_session_id: "session_a",
      requested_scope_ids: ["https://www.googleapis.com/auth/youtube.readonly"],
      now: new Date("2026-06-18T00:00:00.000Z")
    });

    expect(Buffer.from(issued.raw_state_once, "base64url").byteLength).toBe(32);
    expect(issued.record.state_used).toBe(false);
    expect(validateYouTubeOAuthCallback({
      record: issued.record,
      raw_state: issued.raw_state_once,
      redirect_uri: "https://example.invalid/oauth/callback",
      oauth_session_id: "session_b",
      authorization_code_present: true,
      now: new Date("2026-06-18T00:01:00.000Z")
    }).safe_reason_codes).toContain("session_binding_mismatch");

    const consumed = consumeYouTubeOAuthState({
      record: issued.record,
      raw_state: issued.raw_state_once,
      redirect_uri: "https://example.invalid/oauth/callback",
      oauth_session_id: "session_a",
      authorization_code_present: true,
      approved_scope_ids: ["https://www.googleapis.com/auth/youtube.readonly"],
      now: new Date("2026-06-18T00:01:00.000Z")
    });

    expect(consumed.decision.lifecycle_status).toBe("state_consumed");
    expect(consumed.record.state_used).toBe(true);
    expect(consumed.record.authorization_code_stored).toBe(false);
    expect(validateYouTubeOAuthCallback({
      record: consumed.record,
      raw_state: issued.raw_state_once,
      redirect_uri: "https://example.invalid/oauth/callback",
      oauth_session_id: "session_a",
      authorization_code_present: true,
      now: new Date("2026-06-18T00:02:00.000Z")
    }).safe_reason_codes).toContain("state_reuse_blocked");
  });

  it("hardens config preflight without enabling network execution", () => {
    const base = defaultYouTubeLiveChatRealConnectorConfig();

    expect(validateYouTubeLiveChatRealConnectorConfig({ ...base, max_results: 199 }).safe_reason_codes).toContain("max_results_out_of_bounds");
    expect(validateYouTubeLiveChatRealConnectorConfig({ ...base, list_fallback_enabled: true, list_mode_enabled: false }).safe_reason_codes).toContain("list_fallback_requires_list_mode");
    expect(validateYouTubeLiveChatRealConnectorConfig({
      ...base,
      transport: "direct_rest_fetch_candidate",
      scope_verification_status: "verified_official",
      list_mode_enabled: true,
      kill_switch_status: "armed_for_controlled_canary",
      execution_mode: "controlled_network_canary",
      secret_provider_configured: true,
      quota_budget_units_per_day: 100,
      estimated_list_request_cost_units: 1,
      max_results: 200,
      network_authorization_receipt_present: false
    }).status).toBe("controlled_canary_candidate");
  });

  it("requires explicit list fallback and blocks unsafe planner states", () => {
    const base = {
      cycle_index: 0,
      last_polling_interval_ms: 5000,
      quota_remaining_units: 100,
      estimated_request_units: 1,
      same_failure_repeat_count: 0,
      last_failure_class: "stream_disconnected" as const,
      execution_mode: "fake_transport" as const,
      kill_switch_status: "armed_for_fake_transport" as const,
      network_authorized: false,
      max_results: 200
    };

    expect(planYouTubeLiveChatQuotaPolling({ ...base, list_fallback_enabled: false }).selected_source_mode).toBe("stream");
    expect(planYouTubeLiveChatQuotaPolling({ ...base, list_fallback_enabled: true }).selected_source_mode).toBe("list");
    expect(planYouTubeLiveChatQuotaPolling({ ...base, kill_switch_status: "blocked" }).action).toBe("block_kill_switch");
    expect(planYouTubeLiveChatQuotaPolling({ ...base, last_failure_class: "live_chat_ended" }).action).toBe("stop_live_chat_ended");
  });

  it("validates API envelope bounds, exact parts, safe projection, and response classification", () => {
    expect(() => buildYouTubeLiveChatApiRequestEnvelope({ mode: "list", max_results: 199 })).toThrow("max_results_out_of_bounds");
    expect(() => buildYouTubeLiveChatApiRequestEnvelope({ mode: "list", part: ["snippet"] })).toThrow("part_exact_allowlist_required");
    expect(buildYouTubeLiveChatApiRequestEnvelope({ mode: "list", part: ["id", "snippet", "authorDetails"], max_results: 200 }).query_keys).toEqual(["liveChatId", "part", "maxResults"]);
    expect(classifyYouTubeLiveChatApiResponse({ http_status: 403, reason: "liveChatEnded" })).toBe("live_chat_ended");
    expect(classifyYouTubeLiveChatApiResponse({ http_status: 429 })).toBe("rate_limit_exceeded");

    const projection = toYouTubeLiveChatApiRequestAdminProjection({
      live_chat_id: "live_chat_real_value",
      part: ["id", "snippet", "authorDetails"],
      max_results: 200,
      page_token: "page_real_value"
    });
    expect(JSON.stringify(projection)).not.toContain("live_chat_real_value");
    expect(projection.live_chat_id_hash).toMatch(/^safe_hash_/);
  });

  it("evaluates readiness dynamically while keeping real execution false", () => {
    const readiness = evaluateYouTubeLiveChatRealConnectorReadiness({
      config_status: "controlled_canary_candidate",
      oauth_contract_status: "pass",
      planner_status: "pass",
      envelope_status: "pass",
      secret_provider_status: "opaque_interface_ready",
      privacy_review_status: "pass",
      data_deletion_status: "pass",
      revocation_runbook_status: "documented",
      kill_switch_status: "armed_for_controlled_canary",
      network_authorization_status: "absent"
    });

    expect(readiness.preflight_status).toBe("blocked");
    expect(readiness.readiness_status).toBe("blocked_pending_owner_scope");
    expect(readiness.execution_status).toBe("forbidden");
    expect(readiness.real_api_execution).toBe(false);
    expect(readiness.network_enabled).toBe(false);
  });

  it("committed hardening evidence preserves no-network boundaries", () => {
    const evidence = readCodexEvidence("p1-youtube-live-chat-preflight-contract-hardening.json");

    expect(evidence.preflightContractHardeningStatus).toBe("implemented");
    expect(evidence.oauthSingleUseStatus).toBe("pass");
    expect(evidence.explicitListFallbackStatus).toBe("pass");
    expect(evidence.dynamicReadinessEvaluationStatus).toBe("pass");
    expect(evidence.networkEnabled).toBe(false);
    expect(evidence.realApiExecution).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
