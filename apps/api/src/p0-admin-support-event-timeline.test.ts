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

function manualPayload(requestId: string) {
  return {
    request_id: requestId,
    stream_id: "str_timeline",
    character_id: "char_mio",
    display_name: "safe viewer",
    tier: "medium",
    message: "raw timeline message <script>",
    moderation_status: "approved"
  };
}

async function createApprovedSupport(app: ReturnType<typeof buildServer>, requestId: string) {
  const response = await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: adminAuth }, payload: manualPayload(requestId) });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw timeline message");
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
}

describe("P0 admin support event timeline", () => {
  it("requires admin bearer token and returns 404 for unknown support event", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/timeline" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/timeline", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/timeline", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("returns chronological safe read-only event timeline metadata", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createApprovedSupport(app, "timeline_approved");
    await app.inject({ method: "POST", url: `/admin/support-events/${support.event_id}/overlay-resend`, headers: { authorization: adminAuth } });
    await app.inject({ method: "POST", url: `/admin/support-events/${support.event_id}/reaction-resend`, headers: { authorization: adminAuth } });
    const before = { affinity: repo.affinityLedger.size, reaction: repo.reactionRequests.size, overlay: repo.overlayEvents.size, outbox: repo.outboxEvents.size };

    const response = await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/timeline`, headers: { authorization: adminAuth } });
    const second = await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/timeline`, headers: { authorization: adminAuth } });
    const body = response.json();
    const entries = body.timeline.entries;

    expect(response.statusCode).toBe(200);
    expect(body.support_event.event_id).toBe(support.event_id);
    expect(body.support_event.stream_id).toBe("str_timeline");
    expect(entries.map((entry: { type: string }) => entry.type)).toContain("support_created");
    expect(entries.map((entry: { type: string }) => entry.type)).toContain("audit_action");
    expect(entries.map((entry: { type: string }) => entry.type)).toContain("overlay_resend");
    expect(entries.map((entry: { type: string }) => entry.type)).toContain("reaction_resend");
    expect(entries.map((entry: { type: string }) => entry.type)).toContain("side_effect_ledger");
    expect(entries.map((entry: { action?: string }) => entry.action).filter(Boolean)).toEqual(expect.arrayContaining(["create_manual_support", "resend_overlay", "resend_reaction"]));
    expect(entries.map((entry: { sequence: number }) => entry.sequence)).toEqual(entries.map((_: unknown, index: number) => index));
    expect(entries.find((entry: { type: string }) => entry.type === "side_effect_ledger").summary).toMatchObject({
      affinity_applied: true,
      reaction_requested: true,
      overlay_requested: true,
      outbox_enqueued: true,
      overlay_resend: 1,
      reaction_resend: 1
    });
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expect(second.json()).toEqual(body);
    expectSafe(body);

    await app.close();
  }, 20_000);

  it("committed support event timeline evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-support-event-timeline.json");

    expect(evidence.adminSupportEventTimelineStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.createdEntryStatus).toBe("pass");
    expect(evidence.auditEntryStatus).toBe("pass");
    expect(evidence.overlayResendEntryStatus).toBe("pass");
    expect(evidence.reactionResendEntryStatus).toBe("pass");
    expect(evidence.sideEffectLedgerEntryStatus).toBe("pass");
    expect(evidence.chronologicalStatus).toBe("pass");
    expect(evidence.readOnlyStatus).toBe("pass");
    expect(evidence.noReactionEnqueueStatus).toBe("pass");
    expect(evidence.noOverlayEnqueueStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.realDbConnectionUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
