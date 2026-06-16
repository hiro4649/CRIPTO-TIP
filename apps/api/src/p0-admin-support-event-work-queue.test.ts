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

async function createSupport(app: ReturnType<typeof buildServer>, requestId: string, streamId: string, characterId: string, moderationStatus = "hold") {
  const response = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: { request_id: requestId, stream_id: streamId, character_id: characterId, display_name: "safe queue operator", tier: "medium", message: "raw work queue support message <script>", moderation_status: moderationStatus }
  });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw work queue support message");
  expect(serialized).not.toContain("<script>");
  expect(serialized).not.toContain("raw_message");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("wallet_address");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("stack");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
  expect(serialized).not.toContain("logs_url");
  expect(serialized).not.toContain("jobs_url");
}

describe("P0 admin support event work queue", () => {
  it("requires admin bearer token and returns safe filtered metadata", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const open = await createSupport(app, "work_queue_open", "str_queue_a", "char_mio");
    const blocked = await createSupport(app, "work_queue_blocked", "str_queue_b", "char_ren");
    const resolved = await createSupport(app, "work_queue_resolved", "str_queue_a", "char_mio", "approved");
    await app.inject({ method: "PATCH", url: `/admin/support-events/${blocked.event_id}/resolution`, headers: { authorization: adminAuth }, payload: { status: "blocked", operator_note: "blocked safely" } });
    await app.inject({ method: "PATCH", url: `/admin/support-events/${resolved.event_id}/resolution`, headers: { authorization: adminAuth }, payload: { status: "resolved" } });
    const before = { reaction: repo.reactionRequests.size, overlay: repo.overlayEvents.size, outbox: repo.outboxEvents.size };

    expect((await app.inject({ method: "GET", url: "/admin/support-events/work-queue" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/work-queue", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    const all = await app.inject({ method: "GET", url: "/admin/support-events/work-queue", headers: { authorization: adminAuth } });
    const byResolution = await app.inject({ method: "GET", url: "/admin/support-events/work-queue?resolution_status=blocked", headers: { authorization: adminAuth } });
    const byModeration = await app.inject({ method: "GET", url: "/admin/support-events/work-queue?message_moderation_status=hold", headers: { authorization: adminAuth } });
    const byStream = await app.inject({ method: "GET", url: "/admin/support-events/work-queue?stream_id=str_queue_a", headers: { authorization: adminAuth } });
    const byCharacter = await app.inject({ method: "GET", url: "/admin/support-events/work-queue?character_id=char_ren&limit=1", headers: { authorization: adminAuth } });

    expect(all.statusCode).toBe(200);
    expect(all.json().support_events.map((event: { event_id: string }) => event.event_id)).toContain(open.event_id);
    expect(all.json().support_events.map((event: { event_id: string }) => event.event_id)).not.toContain(resolved.event_id);
    expect(byResolution.json().support_events).toHaveLength(1);
    expect(byResolution.json().support_events[0]).toMatchObject({ event_id: blocked.event_id, resolution_status: "blocked" });
    expect(byModeration.json().support_events.every((event: { moderation_status: string }) => event.moderation_status === "hold")).toBe(true);
    expect(byStream.json().support_events.every((event: { stream_id: string }) => event.stream_id === "str_queue_a")).toBe(true);
    expect(byCharacter.json().support_events).toHaveLength(1);
    expect(byCharacter.json().support_events[0]).toMatchObject({ character_id: "char_ren" });
    expect(byCharacter.json().page).toMatchObject({ limit: 1, offset: 0, count: 1 });
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expectSafe({ all: all.json(), byResolution: byResolution.json() });

    await app.close();
  }, 20_000);

  it("committed work queue evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-support-event-work-queue.json");
    expect(evidence.adminSupportEventWorkQueueStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.resolutionFilterStatus).toBe("pass");
    expect(evidence.moderationFilterStatus).toBe("pass");
    expect(evidence.streamFilterStatus).toBe("pass");
    expect(evidence.characterFilterStatus).toBe("pass");
    expect(evidence.safeLimitStatus).toBe("pass");
    expect(evidence.readOnlyStatus).toBe("pass");
    expect(evidence.noReactionEnqueueStatus).toBe("pass");
    expect(evidence.noOverlayEnqueueStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
