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
    stream_id: "str_note_management",
    character_id: "char_mio",
    display_name: "safe note manager",
    tier: "medium",
    message: "raw note management support message <script>",
    moderation_status: "hold"
  };
}

async function createSupportAndNote(app: ReturnType<typeof buildServer>, requestId: string) {
  const supportResponse = await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: adminAuth }, payload: manualPayload(requestId) });
  expect(supportResponse.statusCode).toBe(200);
  const support = supportResponse.json().support_event;
  const noteResponse = await app.inject({ method: "POST", url: `/admin/support-events/${support.event_id}/operator-notes`, headers: { authorization: adminAuth }, payload: { note: "initial safe note" } });
  expect(noteResponse.statusCode).toBe(200);
  return { support, note: noteResponse.json().operator_note };
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw note management support message");
  expect(serialized).not.toContain("<script>");
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

describe("P0 admin support event operator note management", () => {
  it("requires admin bearer token and returns 404 for unknown support event or note", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();
    const { support } = await createSupportAndNote(app, "note_management_auth");

    expect((await app.inject({ method: "PATCH", url: `/admin/support-events/${support.event_id}/operator-notes/missing`, payload: { note: "safe" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "PATCH", url: `/admin/support-events/${support.event_id}/operator-notes/missing`, headers: { authorization: "Bearer wrong-token" }, payload: { note: "safe" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "PATCH", url: "/admin/support-events/missing/operator-notes/note_one", headers: { authorization: adminAuth }, payload: { note: "safe" } })).statusCode).toBe(404);
    expect((await app.inject({ method: "PATCH", url: `/admin/support-events/${support.event_id}/operator-notes/missing`, headers: { authorization: adminAuth }, payload: { note: "safe" } })).statusCode).toBe(404);

    await app.close();
  });

  it("patches safe note text, enforces max length, and writes safe audit metadata", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, note } = await createSupportAndNote(app, "note_management_patch");
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size
    };

    const tooLong = await app.inject({ method: "PATCH", url: `/admin/support-events/${support.event_id}/operator-notes/${note.id}`, headers: { authorization: adminAuth }, payload: { note: "x".repeat(241) } });
    const patched = await app.inject({ method: "PATCH", url: `/admin/support-events/${support.event_id}/operator-notes/${note.id}`, headers: { authorization: adminAuth }, payload: { note: "updated https://private.example.test Bearer token <i>safe</i>" } });

    expect(tooLong.statusCode).toBe(400);
    expect(patched.statusCode).toBe(200);
    expect(patched.json().operator_note.note).toContain("[redacted-url]");
    expect(patched.json().operator_note.note).toContain("[redacted-token]");
    expect(patched.json().operator_note.note).not.toContain("<i>");
    expect(repo.auditLogs.at(-1)).toMatchObject({ action: "update_operator_note", target_id: support.event_id });
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expectSafe({ patched: patched.json(), audit: repo.auditLogs.at(-1) });

    await app.close();
  }, 20_000);

  it("archives notes idempotently and list excludes archived by default", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, note } = await createSupportAndNote(app, "note_management_archive");

    const first = await app.inject({ method: "POST", url: `/admin/support-events/${support.event_id}/operator-notes/${note.id}/archive`, headers: { authorization: adminAuth } });
    const second = await app.inject({ method: "POST", url: `/admin/support-events/${support.event_id}/operator-notes/${note.id}/archive`, headers: { authorization: adminAuth } });
    const defaultList = await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/operator-notes`, headers: { authorization: adminAuth } });
    const archivedList = await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/operator-notes?include_archived=true`, headers: { authorization: adminAuth } });

    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ status: "archived" });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toMatchObject({ status: "already_archived" });
    expect(defaultList.json().operator_notes).toHaveLength(0);
    expect(archivedList.json().operator_notes).toHaveLength(1);
    expect(archivedList.json().operator_notes[0]).toMatchObject({ id: note.id, archived: true });
    expect(repo.auditLogs.filter((log) => log.action === "archive_operator_note")).toHaveLength(1);
    expectSafe({ first: first.json(), second: second.json(), archivedList: archivedList.json() });

    await app.close();
  }, 20_000);

  it("committed operator note management evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-support-event-operator-note-management.json");

    expect(evidence.adminSupportEventOperatorNoteManagementStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.maxLengthStatus).toBe("pass");
    expect(evidence.sanitizationStatus).toBe("pass");
    expect(evidence.archiveStatus).toBe("pass");
    expect(evidence.archiveIdempotencyStatus).toBe("pass");
    expect(evidence.auditSafeMetadataStatus).toBe("pass");
    expect(evidence.readOnlyCoreSupportStatus).toBe("pass");
    expect(evidence.noReactionEnqueueStatus).toBe("pass");
    expect(evidence.noOverlayEnqueueStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
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
