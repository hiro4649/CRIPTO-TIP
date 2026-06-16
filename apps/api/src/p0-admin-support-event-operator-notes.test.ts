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
    stream_id: "str_operator_notes",
    character_id: "char_mio",
    display_name: "safe note viewer",
    tier: "medium",
    message: "raw operator note support message <script>",
    moderation_status: "hold"
  };
}

async function createManualSupport(app: ReturnType<typeof buildServer>, requestId: string) {
  const response = await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: adminAuth }, payload: manualPayload(requestId) });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw operator note support message");
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
  expect(serialized).not.toContain("runtime_ready");
  expect(serialized).not.toContain("production_ready");
}

describe("P0 admin support event operator notes", () => {
  it("requires admin bearer token and returns 404 for unknown support event", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/operator-notes" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/operator-notes", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/operator-notes", headers: { authorization: adminAuth } })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/missing/operator-notes", headers: { authorization: adminAuth }, payload: { note: "safe note" } })).statusCode).toBe(404);

    await app.close();
  });

  it("creates and lists safe operator notes without mutating support core fields", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManualSupport(app, "operator_note_one");
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      affinity: repo.affinityLedger.size,
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size
    };

    const create = await app.inject({
      method: "POST",
      url: `/admin/support-events/${support.event_id}/operator-notes`,
      headers: { authorization: adminAuth },
      payload: { note: "Investigate safely https://private.example.test Bearer top-secret-token <b>ok</b>" }
    });
    const list = await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/operator-notes`, headers: { authorization: adminAuth } });

    expect(create.statusCode).toBe(200);
    expect(create.json().operator_note).toMatchObject({ event_id: support.event_id });
    expect(create.json().operator_note.note).toContain("[redacted-url]");
    expect(create.json().operator_note.note).toContain("[redacted-token]");
    expect(create.json().operator_note.note).not.toContain("<b>");
    expect(list.statusCode).toBe(200);
    expect(list.json().operator_notes).toHaveLength(1);
    expect(list.json().operator_notes[0]).toEqual(create.json().operator_note);
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expectSafe({ create: create.json(), list: list.json() });

    await app.close();
  }, 20_000);

  it("enforces note length and writes safe audit metadata", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManualSupport(app, "operator_note_length");

    const tooLong = await app.inject({
      method: "POST",
      url: `/admin/support-events/${support.event_id}/operator-notes`,
      headers: { authorization: adminAuth },
      payload: { note: "x".repeat(241) }
    });
    const ok = await app.inject({
      method: "POST",
      url: `/admin/support-events/${support.event_id}/operator-notes`,
      headers: { authorization: adminAuth },
      payload: { note: "safe operator note" }
    });

    expect(tooLong.statusCode).toBe(400);
    expect(ok.statusCode).toBe(200);
    const audit = repo.auditLogs.at(-1);
    expect(audit).toMatchObject({ action: "create_operator_note", target_type: "support_event", target_id: support.event_id });
    expect(JSON.stringify(audit)).toContain("operator_note_id");
    expectSafe({ ok: ok.json(), audit });

    await app.close();
  });

  it("committed operator notes evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-support-event-operator-notes.json");

    expect(evidence.adminSupportEventOperatorNotesStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.maxLengthStatus).toBe("pass");
    expect(evidence.sanitizationStatus).toBe("pass");
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
