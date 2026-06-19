import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const internalAuth = `Bearer ${mockValue("internal")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function superChatFixture(overrides: Record<string, unknown> = {}) {
  return {
    live_chat_message_id: "ytmsg_route_module",
    stream_id: "stream_route_module",
    youtube_video_id: "yt_video_route_module",
    character_id: "char_route_module",
    author_channel_id: "yt_channel_route_module",
    author_display_name: "Route Viewer",
    amount_micros: "1500000",
    currency: "JPY",
    amount_display_string: "JPY 1,500",
    tier: 3,
    user_comment: "Great stream",
    published_at: "2026-06-19T00:00:00.000Z",
    ...overrides
  };
}

function cursorPayload(overrides: Record<string, unknown> = {}) {
  return {
    stream_id: "stream_route_cursor",
    youtube_video_id: "yt_video_route_cursor",
    live_chat_id: "live_chat_route_cursor",
    character_id: "char_route_cursor",
    ...overrides
  };
}

describe("P1 API YouTube fixture route module", () => {
  it("registers fixture routes with existing auth, status, response, and idempotency behavior", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    const unauthNormalize = await app.inject({ method: "POST", url: "/internal/fixtures/youtube-superchat/normalize", payload: superChatFixture() });
    const invalidNormalize = await app.inject({
      method: "POST",
      url: "/internal/fixtures/youtube-superchat/normalize",
      headers: { authorization: internalAuth },
      payload: superChatFixture({ amount_micros: "-1" })
    });
    const normalize = await app.inject({
      method: "POST",
      url: "/internal/fixtures/youtube-superchat/normalize",
      headers: { authorization: internalAuth },
      payload: superChatFixture()
    });
    const ingest = await app.inject({
      method: "POST",
      url: "/internal/fixtures/youtube-superchat/ingest",
      headers: { authorization: internalAuth },
      payload: superChatFixture({ live_chat_message_id: "ytmsg_route_module_ingest" })
    });
    const createCursor = await app.inject({
      method: "POST",
      url: "/internal/fixtures/youtube-live-chat/cursors",
      headers: { authorization: internalAuth },
      payload: cursorPayload()
    });
    const duplicateCursor = await app.inject({
      method: "POST",
      url: "/internal/fixtures/youtube-live-chat/cursors",
      headers: { authorization: internalAuth },
      payload: cursorPayload()
    });
    const cursorId = createCursor.json().cursor.cursor_id as string;
    const cursorDetail = await app.inject({ method: "GET", url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}`, headers: { authorization: internalAuth } });
    const missingFailure = await app.inject({
      method: "POST",
      url: "/internal/fixtures/youtube-live-chat/cursors/missing/failure-state",
      headers: { authorization: internalAuth },
      payload: {
        failure_class: "upstream_unavailable",
        failure_count: 1,
        safe_failure_fingerprint: "p1_list_connector:upstream_unavailable:route_module"
      }
    });
    const failureSet = await app.inject({
      method: "POST",
      url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/failure-state`,
      headers: { authorization: internalAuth },
      payload: {
        failure_class: "upstream_unavailable",
        failure_count: 1,
        safe_failure_fingerprint: "p1_list_connector:upstream_unavailable:route_module"
      }
    });
    const failureClear = await app.inject({ method: "DELETE", url: `/internal/fixtures/youtube-live-chat/cursors/${cursorId}/failure-state`, headers: { authorization: internalAuth } });

    expect(unauthNormalize.statusCode).toBe(401);
    expect(invalidNormalize.statusCode).toBe(400);
    expect(invalidNormalize.json().error).toBe("youtube_superchat_fixture_invalid");
    expect(normalize.statusCode).toBe(200);
    expect(normalize.json().contract_validation.status).toBe("valid");
    expect(normalize.json().side_effects.support_event_persisted).toBe("skipped");
    expect(ingest.statusCode).toBe(200);
    expect(ingest.json().support_event.source).toBe("youtube_super_chat");
    expect(createCursor.statusCode).toBe(200);
    expect(duplicateCursor.statusCode).toBe(200);
    expect(duplicateCursor.json().idempotent).toBe(true);
    expect(cursorDetail.statusCode).toBe(200);
    expect(cursorDetail.json().cursor.cursor_id).toBe(cursorId);
    expect(missingFailure.statusCode).toBe(404);
    expect(failureSet.statusCode).toBe(200);
    expect(failureSet.json().failure_state_status).toBe("stored");
    expect(failureClear.statusCode).toBe(200);
    expect(failureClear.json().failure_state_status).toBe("cleared");

    await app.close();
  });

  it("keeps route module dependency-injected and server as composition root", () => {
    const routeSource = fs.readFileSync(path.join(root, "apps", "api", "src", "routes", "youtube-fixture-routes.ts"), "utf8");
    const dependencySource = fs.readFileSync(path.join(root, "apps", "api", "src", "routes", "youtube-fixture-route-dependencies.ts"), "utf8");
    const serverSource = fs.readFileSync(path.join(root, "apps", "api", "src", "server.ts"), "utf8");

    for (const source of [routeSource, dependencySource]) {
      expect(source).not.toContain("process.env");
      expect(source).not.toContain("INTERNAL_TOKEN");
      expect(source).not.toContain("ADMIN_TOKEN");
      expect(source).not.toContain("new InMemoryRepository");
      expect(source).not.toContain("globalThis");
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toContain("../server");
    }
    expect(serverSource).toContain("registerYouTubeFixtureRoutes(app, {");
    expect(serverSource).not.toContain('app.post("/internal/fixtures/youtube-superchat/normalize"');
    expect(serverSource).not.toContain('app.post("/internal/fixtures/youtube-superchat/ingest"');
    expect(serverSource).not.toContain('app.post("/internal/fixtures/youtube-live-chat/cursors"');
  });

  it("committed API YouTube fixture route evidence preserves local-only boundaries", () => {
    const evidence = readCodexEvidence("p1-api-youtube-fixture-routes.json");

    expect(evidence.youtubeFixtureRouteModuleStatus).toBe("implemented");
    expect(evidence.routeRegistrationStatus).toBe("pass");
    expect(evidence.authParityStatus).toBe("pass");
    expect(evidence.statusCodeParityStatus).toBe("pass");
    expect(evidence.responseParityStatus).toBe("pass");
    expect(evidence.sideEffectParityStatus).toBe("pass");
    expect(evidence.cursorParityStatus).toBe("pass");
    expect(evidence.failureStateParityStatus).toBe("pass");
    expect(evidence.processEnvRead).toBe(false);
    expect(evidence.globalRepositoryImport).toBe(false);
    expect(evidence.globalFetchUsed).toBe(false);
    expect(evidence.productBehaviorChanged).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
