import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";
import { buildYouTubeLiveChatRealConnectorReadinessGate } from "./youtube-live-chat-real-connector-readiness-gate.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function expectNoUnsafeReadinessOutput(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("access_token");
  expect(serialized).not.toContain("refresh_token");
  expect(serialized).not.toContain("client_secret");
  expect(serialized).not.toContain("secretref:");
  expect(serialized).not.toContain("https://");
  expect(serialized).not.toContain("127.0.0.1");
}

describe("P1 admin YouTube real connector readiness gate", () => {
  it("builds blocked readiness without creating authority or exposing sensitive references", () => {
    const gate = buildYouTubeLiveChatRealConnectorReadinessGate();

    expect(gate.readiness_status).toBe("blocked_pending_owner_scope");
    expect(gate.preflight_status).toBe("blocked");
    expect(gate.network_enabled).toBe(false);
    expect(gate.oauth_configured).toBe(false);
    expect(gate.real_api_execution).toBe(false);
    expect(gate.secret_refs_exposed).toBe(false);
    expect(gate.endpoint_values_exposed).toBe(false);
    expect(gate.raw_tokens_exposed).toBe(false);
    expect(gate.owner_approval_created).toBe(false);
    expect(gate.github_approval_review_created).toBe(false);
    expect(gate.merge_authority_created).toBe(false);
    expect(gate.blocking_reason_codes).toContain("owner_scope_required");
    expect(gate.blocking_reason_codes).toContain("transport_decision_pending");
    expect(gate.blocking_reason_codes).toContain("operator_kill_switch_required");
    expectNoUnsafeReadinessOutput(gate);
  });

  it("serves a read-only admin endpoint and rejects unauthorized access", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    const unauthorized = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/real-connector-readiness" });
    const response = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/real-connector-readiness", headers: { authorization: adminAuth } });

    expect(unauthorized.statusCode).toBe(401);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(buildYouTubeLiveChatRealConnectorReadinessGate());
    expectNoUnsafeReadinessOutput(response.json());

    await app.close();
  });

  it("committed readiness evidence preserves real connector blocked state", () => {
    const evidence = readCodexEvidence("p1-admin-youtube-real-connector-readiness-gate.json");

    expect(evidence.adminRealConnectorReadinessGateStatus).toBe("implemented");
    expect(evidence.readinessStatus).toBe("blocked_pending_owner_scope");
    expect(evidence.networkEnabled).toBe(false);
    expect(evidence.oauthConfigured).toBe(false);
    expect(evidence.realApiExecution).toBe(false);
    expect(evidence.secretRefsExposed).toBe(false);
    expect(evidence.endpointValuesExposed).toBe(false);
    expect(evidence.rawTokensExposed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
