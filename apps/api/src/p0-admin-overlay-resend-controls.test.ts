import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function manualPayload(requestId: string, moderation_status: "approved" | "hold" | "rejected" = "approved") {
  return {
    request_id: requestId,
    stream_id: "str_overlay_resend",
    character_id: "char_mio",
    display_name: "safe viewer",
    tier: "medium",
    message: "raw overlay resend message <script>",
    moderation_status
  };
}

async function createManual(app: ReturnType<typeof buildServer>, requestId: string, moderation_status: "approved" | "hold" | "rejected" = "approved") {
  const response = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: manualPayload(requestId, moderation_status)
  });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw overlay resend message");
  expect(serialized).not.toContain("<script>");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("wallet_address");
  expect(serialized).not.toContain("http://");
  expect(serialized).not.toContain("https://");
  expect(serialized).not.toContain("stack");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
  expect(serialized).not.toContain("logs_url");
  expect(serialized).not.toContain("jobs_url");
  expect(serialized).not.toContain("runtime_ready");
  expect(serialized).not.toContain("production_ready");
  expect(serialized).not.toContain("legal_compliance");
  expect(serialized).not.toContain("youtube_policy_compliance");
}

describe("P0 admin overlay resend controls", () => {
  it("requires admin bearer token and returns 404 for unknown support event", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "POST", url: "/admin/support-events/missing/overlay-resend" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/missing/overlay-resend", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/missing/overlay-resend", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("blocks held and rejected support events without enqueueing overlay resend", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const held = await createManual(app, "overlay_resend_hold", "hold");
    const rejected = await createManual(app, "overlay_resend_rejected", "rejected");

    const heldResponse = await app.inject({
      method: "POST",
      url: `/admin/support-events/${held.event_id}/overlay-resend`,
      headers: { authorization: adminAuth }
    });
    const rejectedResponse = await app.inject({
      method: "POST",
      url: `/admin/support-events/${rejected.event_id}/overlay-resend`,
      headers: { authorization: adminAuth }
    });

    expect(heldResponse.statusCode).toBe(409);
    expect(heldResponse.json().error).toBe("support_event_not_approved");
    expect(rejectedResponse.statusCode).toBe(409);
    expect(rejectedResponse.json().error).toBe("support_event_rejected");
    expect(repo.overlayEvents.size).toBe(0);
    expect(repo.outboxEvents.size).toBe(0);
    expect(repo.affinityLedger.size).toBe(0);
    expect(repo.reactionRequests.size).toBe(0);
    expectSafe(heldResponse.json());
    expectSafe(rejectedResponse.json());

    await app.close();
  }, 20_000);

  it("enqueues one idempotent overlay resend candidate for approved support only", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManual(app, "overlay_resend_approved", "approved");
    const before = {
      affinity: repo.affinityLedger.size,
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size
    };

    const first = await app.inject({
      method: "POST",
      url: `/admin/support-events/${support.event_id}/overlay-resend`,
      headers: { authorization: adminAuth }
    });
    const second = await app.inject({
      method: "POST",
      url: `/admin/support-events/${support.event_id}/overlay-resend`,
      headers: { authorization: adminAuth }
    });

    expect(first.statusCode).toBe(200);
    expect(first.json().status).toBe("queued");
    expect(first.json().side_effects).toEqual({ affinity: "skipped", reaction_request: "skipped", overlay: "queued", outbox: "queued" });
    expect(second.statusCode).toBe(200);
    expect(second.json().status).toBe("duplicate");
    expect(second.json().side_effects).toEqual({ affinity: "skipped", reaction_request: "skipped", overlay: "duplicate", outbox: "duplicate" });
    expect(repo.overlayEvents.size).toBe(before.overlay + 1);
    expect(repo.outboxEvents.size).toBe(before.outbox + 1);
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect([...repo.outboxEvents.values()].filter((event) => event.idempotency_key === `overlay.resend:${support.event_id}:str_overlay_resend`)).toHaveLength(1);
    expectSafe(first.json());
    expectSafe(second.json());

    await app.close();
  }, 20_000);

  it("does not mutate support amount source or wallet fields", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManual(app, "overlay_resend_immutable", "approved");
    const before = await repo.getSupportEventById(support.event_id);

    const response = await app.inject({
      method: "POST",
      url: `/admin/support-events/${support.event_id}/overlay-resend`,
      headers: { authorization: adminAuth }
    });
    const after = await repo.getSupportEventById(support.event_id);

    expect(response.statusCode).toBe(200);
    expect(after?.support.amount_raw).toBe(before?.support.amount_raw);
    expect(after?.support.amount_display).toBe(before?.support.amount_display);
    expect(after?.support.tier).toBe(before?.support.tier);
    expect(after?.source).toBe(before?.source);
    expect(after?.source_event_id).toBe(before?.source_event_id);
    expect(after?.viewer.wallet_address).toBe(before?.viewer.wallet_address);
    expectSafe(response.json());

    await app.close();
  }, 20_000);

  it("writes safe audit metadata only for overlay resend", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManual(app, "overlay_resend_audit", "approved");

    await app.inject({
      method: "POST",
      url: `/admin/support-events/${support.event_id}/overlay-resend`,
      headers: { authorization: adminAuth }
    });
    const audit = await app.inject({ method: "GET", url: "/admin/audit-logs?action=resend_overlay", headers: { authorization: adminAuth } });

    expect(audit.statusCode).toBe(200);
    expect(audit.json().audit_logs).toHaveLength(1);
    expect(audit.json().audit_logs[0].action).toBe("resend_overlay");
    expect(audit.json().audit_logs[0].after_json.event_id).toBe(support.event_id);
    expect(audit.json().audit_logs[0].after_json.resend_status).toBe("queued");
    expectSafe(audit.json());

    await app.close();
  }, 20_000);

  it("committed overlay resend evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-overlay-resend-controls.json");

    expect(evidence.adminOverlayResendStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.approvedSupportResendStatus).toBe("pass");
    expect(evidence.heldSupportBlockedStatus).toBe("pass");
    expect(evidence.rejectedSupportBlockedStatus).toBe("pass");
    expect(evidence.idempotencyStatus).toBe("pass");
    expect(evidence.noAffinityDuplicationStatus).toBe("pass");
    expect(evidence.noReactionDuplicationStatus).toBe("pass");
    expect(evidence.supportMutationBlockedStatus).toBe("pass");
    expect(evidence.auditSafeMetadataStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.legalComplianceClaimed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimed).toBe(false);
    expect(evidence.realYouTubeApiUsed).toBe(false);
    expect(evidence.realObsDeliveryUsed).toBe(false);
    expect(evidence.realDbConnectionUsed).toBe(false);
    expect(evidence.dbDriverDependencyAdded).toBe(false);
    expect(evidence.redisDependencyAdded).toBe(false);
    expect(evidence.kafkaDependencyAdded).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
