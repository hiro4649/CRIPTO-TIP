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

function manualPayload(requestId: string, moderationStatus: "approved" | "hold" | "rejected" = "hold") {
  return {
    request_id: requestId,
    stream_id: "str_action_plan",
    character_id: "char_mio",
    display_name: "safe action viewer",
    tier: "medium",
    message: "raw action plan message <script>",
    moderation_status: moderationStatus
  };
}

async function createManualSupport(app: ReturnType<typeof buildServer>, requestId: string, moderationStatus: "approved" | "hold" | "rejected" = "hold") {
  const response = await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: adminAuth }, payload: manualPayload(requestId, moderationStatus) });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw action plan message");
  expect(serialized).not.toContain("<script>");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("message_sanitized");
  expect(serialized).not.toContain("wallet_address");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("http://");
  expect(serialized).not.toContain("https://");
  expect(serialized).not.toContain("stack");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
  expect(serialized).not.toContain("logs_url");
  expect(serialized).not.toContain("jobs_url");
  expect(serialized).not.toContain("runtime_ready");
  expect(serialized).not.toContain("production_ready");
}

function expectEligibleAllowlist(body: { eligible_actions: string[] }) {
  expect(body.eligible_actions).toEqual([
    "approve_hold",
    "reject_hold",
    "view_timeline",
    "view_side_effects",
    "overlay_resend",
    "reaction_resend",
    "adjust_safe_fields",
    "bulk_preview"
  ]);
}

describe("P0 admin support event action plan", () => {
  it("requires admin bearer token and returns 404 for unknown support event", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/action-plan" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/action-plan", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/action-plan", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("returns safe read-only held event action plan metadata", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const held = await createManualSupport(app, "action_plan_hold", "hold");
    const before = { affinity: repo.affinityLedger.size, reaction: repo.reactionRequests.size, overlay: repo.overlayEvents.size, outbox: repo.outboxEvents.size, audit: repo.auditLogs.length };

    const response = await app.inject({ method: "GET", url: `/admin/support-events/${held.event_id}/action-plan`, headers: { authorization: adminAuth } });
    const second = await app.inject({ method: "GET", url: `/admin/support-events/${held.event_id}/action-plan`, headers: { authorization: adminAuth } });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.support_event).toMatchObject({
      event_id: held.event_id,
      moderation_status: "hold",
      review_status: "not_reviewed",
      delivery_status: "pending",
      source: "admin_manual_support",
      stream_id: "str_action_plan",
      character_id: "char_mio"
    });
    expectEligibleAllowlist(body);
    expect(body.blocked_actions).toEqual(expect.arrayContaining([
      { action: "overlay_resend", reason: "held_requires_review" },
      { action: "reaction_resend", reason: "held_requires_review" }
    ]));
    expect(body.side_effects).toMatchObject({
      affinity_applied: false,
      reaction_requested: false,
      overlay_requested: false,
      outbox_enqueued: false
    });
    expect(body.timeline_ref).toMatchObject({ event_id: held.event_id });
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expect(repo.auditLogs.length).toBe(before.audit);
    expect(second.json()).toEqual(body);
    expectSafe(body);

    await app.close();
  }, 20_000);

  it("returns approved and rejected blocked action reasons without mutation", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const approved = await createManualSupport(app, "action_plan_approved", "approved");
    const rejected = await createManualSupport(app, "action_plan_rejected", "rejected");
    const before = { affinity: repo.affinityLedger.size, reaction: repo.reactionRequests.size, overlay: repo.overlayEvents.size, outbox: repo.outboxEvents.size };

    const approvedPlan = await app.inject({ method: "GET", url: `/admin/support-events/${approved.event_id}/action-plan`, headers: { authorization: adminAuth } });
    const rejectedPlan = await app.inject({ method: "GET", url: `/admin/support-events/${rejected.event_id}/action-plan`, headers: { authorization: adminAuth } });
    const approvedBody = approvedPlan.json();
    const rejectedBody = rejectedPlan.json();

    expect(approvedPlan.statusCode).toBe(200);
    expect(approvedBody.blocked_actions).toEqual(expect.arrayContaining([
      { action: "approve_hold", reason: "already_approved" },
      { action: "reject_hold", reason: "already_approved" },
      { action: "overlay_resend", reason: "side_effect_already_applied" },
      { action: "reaction_resend", reason: "side_effect_already_applied" }
    ]));
    expect(approvedBody.side_effects).toMatchObject({
      affinity_applied: true,
      reaction_requested: true,
      overlay_requested: true,
      outbox_enqueued: true
    });
    expect(rejectedBody.blocked_actions).toEqual(expect.arrayContaining([
      { action: "approve_hold", reason: "already_rejected" },
      { action: "reject_hold", reason: "already_rejected" },
      { action: "overlay_resend", reason: "already_rejected" },
      { action: "reaction_resend", reason: "already_rejected" }
    ]));
    expect(rejectedBody.side_effects).toMatchObject({
      affinity_applied: false,
      reaction_requested: false,
      overlay_requested: false,
      outbox_enqueued: false
    });
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expectSafe({ approvedBody, rejectedBody });

    await app.close();
  }, 20_000);

  it("committed action plan evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-support-event-action-plan.json");

    expect(evidence.adminSupportEventActionPlanStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.eligibleActionAllowlistStatus).toBe("pass");
    expect(evidence.blockedReasonStatus).toBe("pass");
    expect(evidence.sideEffectSummaryStatus).toBe("pass");
    expect(evidence.readOnlyStatus).toBe("pass");
    expect(evidence.noReactionEnqueueStatus).toBe("pass");
    expect(evidence.noOverlayEnqueueStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.legalComplianceClaimed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimed).toBe(false);
    expect(evidence.realYouTubeApiUsed).toBe(false);
    expect(evidence.realDbConnectionUsed).toBe(false);
    expect(evidence.dbDriverDependencyAdded).toBe(false);
    expect(evidence.redisDependencyAdded).toBe(false);
    expect(evidence.kafkaDependencyAdded).toBe(false);
    expect(evidence.realTtsCallUsed).toBe(false);
    expect(evidence.realLive2dCallUsed).toBe(false);
    expect(evidence.realRendererCallUsed).toBe(false);
    expect(evidence.realObsCallUsed).toBe(false);
    expect(evidence.realWebSocketDeliveryUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
