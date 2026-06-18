import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";
import {
  defaultYouTubeLiveChatControlledCanaryPreflightInput,
  evaluateYouTubeLiveChatControlledCanaryPreflight
} from "./youtube-live-chat-controlled-canary-preflight.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function expectSafeOutput(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("client_secret");
  expect(serialized).not.toContain("refresh_token");
  expect(serialized).not.toContain("access_token");
  expect(serialized).not.toContain("secretref:");
  expect(serialized).not.toContain("https://");
  expect(serialized).not.toContain("127.0.0.1");
  expect(serialized).not.toContain("live_chat_id");
}

function codeReadyInput() {
  return {
    config_status: "controlled_canary_candidate" as const,
    oauth_contract_status: "pass" as const,
    credential_provider_status: "opaque_interface_ready" as const,
    kill_switch_status: "armed_for_controlled_canary" as const,
    quota_planner_status: "pass" as const,
    direct_rest_transport_status: "pass" as const,
    list_connector_service_status: "pass" as const,
    stream_contract_status: "pass" as const,
    privacy_review_status: "pass" as const,
    data_deletion_review_status: "pass" as const,
    revocation_runbook_status: "documented" as const,
    network_authorization_status: "absent" as const
  };
}

describe("P1 admin YouTube controlled canary preflight", () => {
  it("evaluates default and code-ready-network-blocked states without creating authority", () => {
    const blocked = evaluateYouTubeLiveChatControlledCanaryPreflight(defaultYouTubeLiveChatControlledCanaryPreflightInput());
    const ready = evaluateYouTubeLiveChatControlledCanaryPreflight(codeReadyInput());

    expect(blocked.preflight_status).toBe("blocked");
    expect(blocked.safe_reason_codes).toContain("real_credential_provider_missing");
    expect(ready.preflight_status).toBe("code_ready_network_blocked");
    expect(ready.safe_reason_codes).toEqual(["network_authorization_missing"]);
    for (const result of [blocked, ready]) {
      expect(result.network_enabled).toBe(false);
      expect(result.oauth_configured).toBe(false);
      expect(result.real_api_execution).toBe(false);
      expect(result.owner_approval_created).toBe(false);
      expect(result.github_approval_review_created).toBe(false);
      expect(result.merge_authority_created).toBe(false);
      expect(result.config_hash).toMatch(/^safe_hash_/);
      expectSafeOutput(result);
    }
  });

  it("serves read-only GET and POST admin endpoints with auth and safe validation", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    const unauthorized = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/controlled-canary-preflight" });
    const get = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/controlled-canary-preflight", headers: { authorization: adminAuth } });
    const post = await app.inject({ method: "POST", url: "/admin/youtube-live-chat/controlled-canary-preflight/evaluate", headers: { authorization: adminAuth }, payload: codeReadyInput() });
    const unknown = await app.inject({ method: "POST", url: "/admin/youtube-live-chat/controlled-canary-preflight/evaluate", headers: { authorization: adminAuth }, payload: { ...codeReadyInput(), unknown: true } });
    const unsafe = await app.inject({ method: "POST", url: "/admin/youtube-live-chat/controlled-canary-preflight/evaluate", headers: { authorization: adminAuth }, payload: { ...codeReadyInput(), credential_provider_status: "Bearer raw" } });

    expect(unauthorized.statusCode).toBe(401);
    expect(get.statusCode).toBe(200);
    expect(get.json().preflight_status).toBe("blocked");
    expect(post.statusCode).toBe(200);
    expect(post.json().preflight_status).toBe("code_ready_network_blocked");
    expect(unknown.statusCode).toBe(400);
    expect(unsafe.statusCode).toBe(400);
    expectSafeOutput(get.json());
    expectSafeOutput(post.json());

    await app.close();
  });

  it("keeps existing real connector readiness blocked pending owner scope", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    const readiness = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/real-connector-readiness", headers: { authorization: adminAuth } });

    expect(readiness.statusCode).toBe(200);
    expect(readiness.json().readiness_status).toBe("blocked_pending_owner_scope");
    expect(readiness.json().real_api_execution).toBe(false);

    await app.close();
  });

  it("committed controlled canary preflight evidence preserves network-disabled boundaries", () => {
    const evidence = readCodexEvidence("p1-admin-youtube-controlled-canary-preflight.json");

    expect(evidence.controlledCanaryPreflightStatus).toBe("implemented");
    expect(evidence.readOnlyStatus).toBe("pass");
    expect(evidence.dynamicEvaluationStatus).toBe("pass");
    expect(evidence.listTransportStatus).toBe("pass");
    expect(evidence.listConnectorServiceStatus).toBe("pass");
    expect(evidence.streamContractStatus).toBe("pass");
    expect(evidence.networkEnabled).toBe(false);
    expect(evidence.oauthConfigured).toBe(false);
    expect(evidence.realApiExecution).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
