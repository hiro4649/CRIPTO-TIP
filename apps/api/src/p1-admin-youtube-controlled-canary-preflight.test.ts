import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";
import {
  defaultYouTubeLiveChatControlledCanaryPreflightInput,
  evaluateYouTubeLiveChatControlledCanaryPreflight
} from "./youtube-live-chat-controlled-canary-preflight.js";
import { defaultYouTubeCanaryAuthorizationBundle } from "./youtube-live-chat-canary-authorization-gate.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");
const fixedNow = new Date("2026-06-20T12:00:00.000Z");

function buildTestServer() {
  return buildServer({ repo: new InMemoryRepository(), now: () => fixedNow });
}

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function expectSafeOutput(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("client_secret=");
  expect(serialized).not.toContain("refresh_token=");
  expect(serialized).not.toContain("access_token=");
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

function completeAuthorizationBundle() {
  return {
    ...defaultYouTubeCanaryAuthorizationBundle(),
    bundleStatus: "owner_inputs_recorded" as const,
    networkAuthorization: "owner_authorization_recorded" as const,
    credentialProvider: "opaque_interface_ready" as const,
    clientIdRef: "opaque_ref_recorded" as const,
    clientSecretRef: "opaque_ref_recorded" as const,
    refreshTokenRef: "opaque_ref_recorded" as const,
    redirectUri: "confirmed" as const,
    testChannel: "selected_test_only" as const,
    testLiveStream: "selected_test_only" as const,
    quotaBudget: "confirmed_within_first_canary_limits" as const,
    privacyReview: "pass" as const,
    dataDeletionReview: "pass" as const,
    killSwitch: "armed_for_controlled_canary" as const
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
    const app = buildTestServer();
    await app.ready();

    const unauthorized = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/controlled-canary-preflight" });
    const get = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/controlled-canary-preflight", headers: { authorization: adminAuth } });
    const post = await app.inject({ method: "POST", url: "/admin/youtube-live-chat/controlled-canary-preflight/evaluate", headers: { authorization: adminAuth }, payload: codeReadyInput() });
    const unknown = await app.inject({ method: "POST", url: "/admin/youtube-live-chat/controlled-canary-preflight/evaluate", headers: { authorization: adminAuth }, payload: { ...codeReadyInput(), unknown: true } });
    const unsafe = await app.inject({ method: "POST", url: "/admin/youtube-live-chat/controlled-canary-preflight/evaluate", headers: { authorization: adminAuth }, payload: { ...codeReadyInput(), credential_provider_status: "Bearer raw" } });

    expect(unauthorized.statusCode).toBe(401);
    expect(get.statusCode).toBe(200);
    expect(get.json().preflight_status).toBe("blocked");
    expect(get.json().evaluated_at).toBe(fixedNow.toISOString());
    expect(post.statusCode).toBe(200);
    expect(post.json().preflight_status).toBe("code_ready_network_blocked");
    expect(post.json().evaluated_at).toBe(fixedNow.toISOString());
    expect(unknown.statusCode).toBe(400);
    expect(unsafe.statusCode).toBe(400);
    expectSafeOutput(get.json());
    expectSafeOutput(post.json());

    await app.close();
  });

  it("serves canonical authorization GET and POST without mutating defaults or enabling execution", async () => {
    const app = buildTestServer();
    await app.ready();

    const unauthorizedGet = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/canary-authorization-preflight" });
    const unauthorizedPost = await app.inject({ method: "POST", url: "/admin/youtube-live-chat/canary-authorization-preflight/evaluate", payload: completeAuthorizationBundle() });
    const getBefore = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/canary-authorization-preflight", headers: { authorization: adminAuth } });
    const post = await app.inject({ method: "POST", url: "/admin/youtube-live-chat/canary-authorization-preflight/evaluate", headers: { authorization: adminAuth }, payload: completeAuthorizationBundle() });
    const alias = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/canary-authorization", headers: { authorization: adminAuth } });
    const unknown = await app.inject({ method: "POST", url: "/admin/youtube-live-chat/canary-authorization-preflight/evaluate", headers: { authorization: adminAuth }, payload: { ...completeAuthorizationBundle(), unknown: true } });
    const unsafe = await app.inject({ method: "POST", url: "/admin/youtube-live-chat/canary-authorization-preflight/evaluate", headers: { authorization: adminAuth }, payload: { ...completeAuthorizationBundle(), clientIdRef: "Bearer raw" } });
    const getAfter = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/canary-authorization-preflight", headers: { authorization: adminAuth } });

    expect(unauthorizedGet.statusCode).toBe(401);
    expect(unauthorizedPost.statusCode).toBe(401);
    expect(getBefore.statusCode).toBe(200);
    expect(getBefore.json().authorization_status).toBe("awaiting_owner_authorization");
    expect(getBefore.json().execution_status).toBe("forbidden");
    expect(getBefore.json().input_trust).toBe("committed_safe_bundle");
    expect(getBefore.json().preview_only).toBe(false);
    expect(getBefore.json().state_persisted).toBe(false);
    expect(getBefore.json().evaluated_at).toBe(fixedNow.toISOString());
    expect(getBefore.json().audit_receipt.evaluated_at).toBe(fixedNow.toISOString());
    expect(getBefore.json().audit_receipt.receipt_persisted).toBe(false);
    expect(getBefore.json().audit_receipt.audit_retrievable).toBe(false);
    expect(alias.json()).toEqual(getBefore.json());
    expect(post.statusCode).toBe(200);
    expect(post.json().authorization_status).toBe("authorization_fields_complete");
    expect(post.json().preflight_status).toBe("authorization_fields_complete_network_disabled");
    expect(post.json().execution_status).toBe("forbidden");
    expect(post.json().input_trust).toBe("untrusted_preview");
    expect(post.json().preview_only).toBe(true);
    expect(post.json().state_persisted).toBe(false);
    expect(post.json().evaluated_at).toBe(fixedNow.toISOString());
    expect(post.json().audit_receipt.preview_only).toBe(true);
    expect(post.json().audit_receipt.state_persisted).toBe(false);
    expect(post.json().audit_receipt.receipt_persisted).toBe(false);
    expect(post.json().network_enabled).toBe(false);
    expect(post.json().real_api_execution).toBe(false);
    expect(unknown.statusCode).toBe(400);
    expect(unsafe.statusCode).toBe(400);
    expect(getAfter.json()).toEqual(getBefore.json());
    expectSafeOutput(getBefore.json());
    expectSafeOutput(post.json());

    await app.close();
  });

  it("does not infer owner-only authorization fields from legacy coarse statuses", () => {
    const ready = evaluateYouTubeLiveChatControlledCanaryPreflight(codeReadyInput());

    expect(ready.preflight_status).toBe("code_ready_network_blocked");
    expect(ready.authorization_status).toBe("awaiting_owner_authorization");
    expect(ready.authorization_blocker_codes).toContain("client_id_ref_absent");
    expect(ready.authorization_blocker_codes).toContain("test_channel_unselected");
    expect(ready.authorization_blocker_codes).toContain("test_live_stream_unselected");
    expect(ready.execution_status).toBe("forbidden");
  });

  it("keeps existing real connector readiness blocked pending owner scope", async () => {
    const app = buildTestServer();
    await app.ready();

    const readiness = await app.inject({ method: "GET", url: "/admin/youtube-live-chat/real-connector-readiness", headers: { authorization: adminAuth } });

    expect(readiness.statusCode).toBe(200);
    expect(readiness.json().readiness_status).toBe("blocked_pending_owner_scope");
    expect(readiness.json().preflight_status).toBe("blocked");
    expect(readiness.json().execution_status).toBe("forbidden");
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
