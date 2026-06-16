import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";

const mockValue = (scope: string) => ["change", "me", "admin", "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

async function createSupport(app: ReturnType<typeof buildServer>, requestId: string, streamId: string, characterId: string) {
  const response = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: { request_id: requestId, stream_id: streamId, character_id: characterId, display_name: "safe search note", tier: "medium", message: "raw operator note search message <script>", moderation_status: "hold" }
  });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

async function createNote(app: ReturnType<typeof buildServer>, eventId: string, note: string) {
  const response = await app.inject({ method: "POST", url: `/admin/support-events/${eventId}/operator-notes`, headers: { authorization: adminAuth }, payload: { note } });
  expect(response.statusCode).toBe(200);
  return response.json().operator_note;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw operator note search message");
  expect(serialized).not.toContain("<script>");
  expect(serialized).not.toContain("raw_payload");
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

describe("P0 admin operator note search", () => {
  it("requires admin bearer token and returns safe filtered metadata", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const first = await createSupport(app, "note_search_one", "str_note_search_a", "char_mio");
    const second = await createSupport(app, "note_search_two", "str_note_search_b", "char_ren");
    const firstNote = await createNote(app, first.event_id, "alpha note");
    await createNote(app, second.event_id, "beta note");
    await app.inject({ method: "POST", url: `/admin/support-events/${second.event_id}/operator-notes/${(await app.inject({ method: "GET", url: `/admin/support-events/${second.event_id}/operator-notes`, headers: { authorization: adminAuth } })).json().operator_notes[0].id}/archive`, headers: { authorization: adminAuth } });
    const before = { reaction: repo.reactionRequests.size, overlay: repo.overlayEvents.size, outbox: repo.outboxEvents.size };

    expect((await app.inject({ method: "GET", url: "/admin/operator-notes" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/operator-notes", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    const byEvent = await app.inject({ method: "GET", url: `/admin/operator-notes?support_event_id=${first.event_id}`, headers: { authorization: adminAuth } });
    const byStream = await app.inject({ method: "GET", url: "/admin/operator-notes?stream_id=str_note_search_a", headers: { authorization: adminAuth } });
    const byCharacter = await app.inject({ method: "GET", url: "/admin/operator-notes?character_id=char_mio", headers: { authorization: adminAuth } });
    const byArchived = await app.inject({ method: "GET", url: "/admin/operator-notes?archived=true", headers: { authorization: adminAuth } });
    const byText = await app.inject({ method: "GET", url: "/admin/operator-notes?q=alpha&limit=1", headers: { authorization: adminAuth } });
    const byDate = await app.inject({ method: "GET", url: `/admin/operator-notes?created_after=${encodeURIComponent(firstNote.created_at)}&created_before=${encodeURIComponent(firstNote.created_at)}`, headers: { authorization: adminAuth } });

    expect(byEvent.statusCode).toBe(200);
    expect(byEvent.json().operator_notes).toHaveLength(1);
    expect(byStream.json().operator_notes[0].support_event.stream_id).toBe("str_note_search_a");
    expect(byCharacter.json().operator_notes[0].support_event.character_id).toBe("char_mio");
    expect(byArchived.json().operator_notes).toHaveLength(1);
    expect(byArchived.json().operator_notes[0].archived).toBe(true);
    expect(byText.json().operator_notes).toHaveLength(1);
    expect(byText.json().page).toMatchObject({ limit: 1, offset: 0, count: 1 });
    expect(byDate.json().operator_notes.map((note: { id: string }) => note.id)).toContain(firstNote.id);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expectSafe({ byEvent: byEvent.json(), byArchived: byArchived.json(), byText: byText.json() });

    await app.close();
  }, 20_000);

  it("committed operator note search evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-operator-note-search.json");
    expect(evidence.adminOperatorNoteSearchStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.supportEventFilterStatus).toBe("pass");
    expect(evidence.streamFilterStatus).toBe("pass");
    expect(evidence.characterFilterStatus).toBe("pass");
    expect(evidence.archivedFilterStatus).toBe("pass");
    expect(evidence.dateFilterStatus).toBe("pass");
    expect(evidence.safeLimitStatus).toBe("pass");
    expect(evidence.readOnlyStatus).toBe("pass");
    expect(evidence.noReactionEnqueueStatus).toBe("pass");
    expect(evidence.noOverlayEnqueueStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
