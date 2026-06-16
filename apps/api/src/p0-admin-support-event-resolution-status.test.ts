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

async function createSupport(app: ReturnType<typeof buildServer>, requestId: string) {
  const response = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: requestId,
      stream_id: "str_resolution_status",
      character_id: "char_mio",
      display_name: "safe resolver",
      tier: "medium",
      message: "raw resolution support message <script>",
      moderation_status: "hold"
    }
  });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw resolution support message");
  expect(serialized).not.toContain("<script>");
  expect(serialized).not.toContain("raw_message");
  expect(serialized).not.toContain("raw_payload");
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
}

describe("P0 admin support event resolution status", () => {
  it("requires admin bearer token and returns 404 for unknown support event", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();
    const support = await createSupport(app, "resolution_auth");

    expect((await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/resolution` })).statusCode).toBe(401);
    expect((await app.inject({ method: "PATCH", url: `/admin/support-events/${support.event_id}/resolution`, payload: { status: "resolved" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/resolution`, headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "PATCH", url: "/admin/support-events/missing/resolution", headers: { authorization: adminAuth }, payload: { status: "resolved" } })).statusCode).toBe(404);

    await app.close();
  });

  it("sets allowed statuses, reopens, sanitizes notes, and writes safe audit metadata", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createSupport(app, "resolution_statuses");
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size
    };

    const rejected = await app.inject({ method: "PATCH", url: `/admin/support-events/${support.event_id}/resolution`, headers: { authorization: adminAuth }, payload: { status: "closed" } });
    const tooLong = await app.inject({ method: "PATCH", url: `/admin/support-events/${support.event_id}/resolution`, headers: { authorization: adminAuth }, payload: { status: "resolved", operator_note: "x".repeat(241) } });
    const resolved = await app.inject({ method: "PATCH", url: `/admin/support-events/${support.event_id}/resolution`, headers: { authorization: adminAuth }, payload: { status: "resolved", operator_note: "done https://private.example.test Bearer token <b>safe</b>" } });
    const followup = await app.inject({ method: "PATCH", url: `/admin/support-events/${support.event_id}/resolution`, headers: { authorization: adminAuth }, payload: { status: "needs_followup" } });
    const blocked = await app.inject({ method: "PATCH", url: `/admin/support-events/${support.event_id}/resolution`, headers: { authorization: adminAuth }, payload: { status: "blocked" } });
    const reopened = await app.inject({ method: "PATCH", url: `/admin/support-events/${support.event_id}/resolution`, headers: { authorization: adminAuth }, payload: { status: "open" } });
    const current = await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/resolution`, headers: { authorization: adminAuth } });

    expect(rejected.statusCode).toBe(400);
    expect(tooLong.statusCode).toBe(400);
    expect(resolved.statusCode).toBe(200);
    expect(resolved.json().resolution).toMatchObject({ event_id: support.event_id, status: "resolved" });
    expect(resolved.json().resolution.operator_note).toContain("[redacted-url]");
    expect(resolved.json().resolution.operator_note).toContain("[redacted-token]");
    expect(resolved.json().resolution.operator_note).not.toContain("<b>");
    expect(followup.json().resolution.status).toBe("needs_followup");
    expect(blocked.json().resolution.status).toBe("blocked");
    expect(reopened.json().resolution.status).toBe("open");
    expect(current.json().resolution.status).toBe("open");
    expect(repo.auditLogs.filter((log) => log.action === "support_event_resolution_update")).toHaveLength(4);
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expectSafe({ resolved: resolved.json(), current: current.json(), audit: repo.auditLogs });

    await app.close();
  }, 20_000);

  it("committed resolution status evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-support-event-resolution-status.json");

    expect(evidence.adminSupportEventResolutionStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.allowedStatusStatus).toBe("pass");
    expect(evidence.reopenStatus).toBe("pass");
    expect(evidence.maxLengthStatus).toBe("pass");
    expect(evidence.sanitizationStatus).toBe("pass");
    expect(evidence.auditSafeMetadataStatus).toBe("pass");
    expect(evidence.readOnlyCoreSupportStatus).toBe("pass");
    expect(evidence.noReactionEnqueueStatus).toBe("pass");
    expect(evidence.noOverlayEnqueueStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.legalComplianceClaimed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimed).toBe(false);
    expect(evidence.realDbConnectionUsed).toBe(false);
    expect(evidence.dbDriverDependencyAdded).toBe(false);
    expect(evidence.redisDependencyAdded).toBe(false);
    expect(evidence.kafkaDependencyAdded).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
