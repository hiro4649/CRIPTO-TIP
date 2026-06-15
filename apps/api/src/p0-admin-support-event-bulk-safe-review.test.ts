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

function manualPayload(requestId: string, moderationStatus: "approved" | "hold" | "rejected" = "approved") {
  return {
    request_id: requestId,
    stream_id: "str_bulk_preview",
    character_id: "char_mio",
    display_name: "safe bulk viewer",
    tier: "medium",
    message: "raw bulk preview message <script>",
    moderation_status: moderationStatus
  };
}

async function createManualSupport(app: ReturnType<typeof buildServer>, requestId: string, moderationStatus: "approved" | "hold" | "rejected" = "approved") {
  const response = await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: adminAuth }, payload: manualPayload(requestId, moderationStatus) });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw bulk preview message");
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

describe("P0 admin support event bulk safe review preview", () => {
  it("requires admin bearer token and rejects invalid input safely", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "POST", url: "/admin/support-events/bulk-review/preview", payload: { event_ids: ["evt_one"] } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/bulk-review/preview", headers: { authorization: "Bearer wrong-token" }, payload: { event_ids: ["evt_one"] } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/bulk-review/preview", headers: { authorization: adminAuth }, payload: { event_ids: [] } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/bulk-review/preview", headers: { authorization: adminAuth }, payload: { event_ids: Array.from({ length: 51 }, (_, index) => `evt_${index}`) } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/bulk-review/preview", headers: { authorization: adminAuth }, payload: { event_ids: ["evt_dup", "evt_dup"] } })).statusCode).toBe(400);

    await app.close();
  });

  it("returns safe eligibility metadata without mutating support or enqueueing side effects", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const approved = await createManualSupport(app, "bulk_approved", "approved");
    const held = await createManualSupport(app, "bulk_hold", "hold");
    const rejected = await createManualSupport(app, "bulk_rejected", "rejected");
    const before = {
      supportEvents: repo.supportEvents.size,
      affinity: repo.affinityLedger.size,
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size,
      audit: repo.auditLogs.length
    };

    const response = await app.inject({
      method: "POST",
      url: "/admin/support-events/bulk-review/preview",
      headers: { authorization: adminAuth },
      payload: { event_ids: [held.event_id, rejected.event_id, approved.event_id, "evt_missing_bulk"] }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.page).toMatchObject({ requested_count: 4, result_count: 4, max_event_ids: 50 });
    expect(body.duplicate_count).toBe(0);
    const heldEntry = body.support_events.find((entry: { event_id: string }) => entry.event_id === held.event_id);
    const rejectedEntry = body.support_events.find((entry: { event_id: string }) => entry.event_id === rejected.event_id);
    const approvedEntry = body.support_events.find((entry: { event_id: string }) => entry.event_id === approved.event_id);
    const missingEntry = body.support_events.find((entry: { event_id: string }) => entry.event_id === "evt_missing_bulk");
    expect(heldEntry).toMatchObject({
      exists: true,
      stream_id: "str_bulk_preview",
      character_id: "char_mio",
      source: "admin_manual_support",
      moderation_status: "hold"
    });
    expect(heldEntry.eligible_actions).toEqual(["approve_hold", "reject_hold", "view_timeline", "view_side_effects", "adjust_safe_fields"]);
    expect(rejectedEntry.eligible_actions).not.toContain("approve_hold");
    expect(rejectedEntry.ineligible_reason).toBe("rejected_support_event");
    expect(approvedEntry.eligible_actions).toContain("overlay_resend");
    expect(approvedEntry.eligible_actions).toContain("reaction_resend");
    expect(missingEntry).toEqual({ event_id: "evt_missing_bulk", exists: false, eligible_actions: [], ineligible_reason: "not_found" });
    for (const entry of body.support_events) {
      expect(entry.eligible_actions.every((action: string) => ["approve_hold", "reject_hold", "view_timeline", "view_side_effects", "overlay_resend", "reaction_resend", "adjust_safe_fields"].includes(action))).toBe(true);
      expect(entry).not.toHaveProperty("message");
      expect(entry).not.toHaveProperty("raw_payload");
      expect(entry).not.toHaveProperty("wallet_address");
    }
    expect(repo.supportEvents.size).toBe(before.supportEvents);
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expect(repo.auditLogs.length).toBe(before.audit);
    expectSafe(body);

    await app.close();
  }, 20_000);

  it("committed bulk safe review evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-support-event-bulk-safe-review.json");

    expect(evidence.adminSupportBulkSafeReviewStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.eventIdLimitStatus).toBe("pass");
    expect(evidence.unknownEventSafeStatus).toBe("pass");
    expect(evidence.eligibleActionAllowlistStatus).toBe("pass");
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
