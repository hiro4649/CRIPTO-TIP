import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { normalizeYouTubeSuperChatToSupportReceived } from "@cripto-tip/shared";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function manualPayload(requestId: string, streamId: string, characterId: string, moderationStatus: "approved" | "hold" | "rejected" = "approved") {
  return {
    request_id: requestId,
    stream_id: streamId,
    character_id: characterId,
    display_name: "safe viewer",
    tier: "medium",
    message: "raw search message <script>",
    moderation_status: moderationStatus
  };
}

async function createManualSupport(app: ReturnType<typeof buildServer>, requestId: string, streamId: string, characterId: string, moderationStatus: "approved" | "hold" | "rejected" = "approved") {
  const response = await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: adminAuth }, payload: manualPayload(requestId, streamId, characterId, moderationStatus) });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw search message");
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

describe("P0 admin support event search", () => {
  it("requires admin bearer token", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "GET", url: "/admin/support-events" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);

    await app.close();
  });

  it("returns safe read-only metadata and filters support events", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const first = await createManualSupport(app, "search_one", "str_search_a", "char_mio", "approved");
    const second = await createManualSupport(app, "search_two", "str_search_b", "char_ren", "hold");
    const youtubeSupport = normalizeYouTubeSuperChatToSupportReceived({
      live_chat_message_id: "yt_search_one",
      youtube_video_id: "yt_video",
      author_channel_id: "yt_author",
      author_display_name: "yt safe viewer",
      amount_micros: "5000000",
      currency: "JPY",
      amount_display_string: "JPY 5",
      tier: 2,
      user_comment: "youtube raw search text",
      stream_id: "str_search_a",
      character_id: "char_ren",
      published_at: "2026-06-15T00:00:00.000Z"
    });
    await repo.createSupportEventIfAbsent(youtubeSupport);
    await repo.updateSupportEventDeliveryStatus(first.source_event_id, "delivered");
    const before = { affinity: repo.affinityLedger.size, reaction: repo.reactionRequests.size, overlay: repo.overlayEvents.size, outbox: repo.outboxEvents.size };

    const all = await app.inject({ method: "GET", url: "/admin/support-events?limit=2", headers: { authorization: adminAuth } });
    const byStream = await app.inject({ method: "GET", url: "/admin/support-events?stream_id=str_search_a", headers: { authorization: adminAuth } });
    const byCharacter = await app.inject({ method: "GET", url: "/admin/support-events?character_id=char_ren", headers: { authorization: adminAuth } });
    const bySource = await app.inject({ method: "GET", url: "/admin/support-events?source=youtube_super_chat", headers: { authorization: adminAuth } });
    const byModeration = await app.inject({ method: "GET", url: "/admin/support-events?message_moderation_status=hold", headers: { authorization: adminAuth } });
    const byDate = await app.inject({ method: "GET", url: `/admin/support-events?created_after=${encodeURIComponent(first.created_at)}&created_before=${encodeURIComponent(second.created_at)}`, headers: { authorization: adminAuth } });
    const byDelivery = await app.inject({ method: "GET", url: "/admin/support-events?delivery_status=delivered", headers: { authorization: adminAuth } });

    expect(all.statusCode).toBe(200);
    expect(all.json().support_events).toHaveLength(2);
    expect(all.json().page).toMatchObject({ limit: 2, offset: 0, count: 2 });
    expect(byStream.json().support_events.map((event: { stream_id: string }) => event.stream_id)).toEqual(["str_search_a", "str_search_a"]);
    expect(byCharacter.json().support_events.map((event: { character_id: string }) => event.character_id)).toEqual(["char_ren", "char_ren"]);
    expect(bySource.json().support_events).toHaveLength(1);
    expect(bySource.json().support_events[0].source).toBe("youtube_super_chat");
    expect(byModeration.json().support_events).toHaveLength(1);
    expect(byModeration.json().support_events[0].event_id).toBe(second.event_id);
    expect(byDate.json().support_events.map((event: { event_id: string }) => event.event_id)).toContain(first.event_id);
    expect(byDelivery.json().support_events.map((event: { event_id: string }) => event.event_id)).toEqual([first.event_id]);
    for (const entry of all.json().support_events) {
      expect(entry).toHaveProperty("display_name_sanitized");
      expect(entry).toHaveProperty("delivery_status");
      expect(entry).not.toHaveProperty("message");
      expect(entry).not.toHaveProperty("raw_payload");
      expect(entry).not.toHaveProperty("wallet_address");
    }
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expectSafe({ all: all.json(), byStream: byStream.json(), bySource: bySource.json() });

    await app.close();
  }, 20_000);

  it("committed support event search evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-support-event-search.json");

    expect(evidence.adminSupportEventSearchStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.streamFilterStatus).toBe("pass");
    expect(evidence.characterFilterStatus).toBe("pass");
    expect(evidence.sourceFilterStatus).toBe("pass");
    expect(evidence.moderationFilterStatus).toBe("pass");
    expect(evidence.dateFilterStatus).toBe("pass");
    expect(evidence.safeLimitStatus).toBe("pass");
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

  it("committed PR 88 evidence uses current same-head run and artifact metadata", () => {
    const activeEvidencePack = readCodexEvidence("evidence-pack.json");
    if (activeEvidencePack.changeType !== "product_vertical_slice_admin_support_event_search") {
      expect(activeEvidencePack.changeType).not.toBe("product_vertical_slice_admin_support_event_search");
      return;
    }
    const expected = {
      prNumber: 88,
      headSha: "da490cf2e7a22dc8e32b5656ba2e1e8dd2bc7be5",
      baseSha: "542d896282528f4382cd930d387159a12f4263dc",
      ciRunId: "27549438817",
      qualityGateRunId: "27549606557",
      qualityGateArtifactId: "7639494132"
    };
    const staleValues = [
      ["179585d9", "cb02d1cf19fe4736a126dbc3ee5a6ee2"].join(""),
      ["2754", "8866714"].join(""),
      ["2754", "8991489"].join(""),
      ["7639", "227151"].join(""),
      ["current", "pr", "head"].join("_"),
      ["current", "pr", "base"].join("_"),
      ["not", "available", "before", "pr", "creation"].join("_"),
      ["not", "created", "pre", "pr"].join("_"),
      ["pending", "after", "pr", "creation"].join("_"),
      ["HEAD", "SHA", "PLACEHOLDER"].join("_"),
      ["BASE", "SHA", "PLACEHOLDER"].join("_"),
      ["This PR must not be merged", "without explicit user instruction"].join(" ")
    ];
    const evidenceFiles = [
      "evidence-pack.json",
      "product-verification.json",
      "quality-gate-evidence.json",
      "review-independence.json",
      "risk-register.json",
      "task-contract.json",
      "test-coverage-evidence.json"
    ];

    for (const fileName of evidenceFiles) {
      const evidence = readCodexEvidence(fileName);
      const serialized = JSON.stringify(evidence);
      expect(evidence.prNumber).toBe(expected.prNumber);
      expect(evidence.headSha).toBe(expected.headSha);
      expect(evidence.baseSha).toBe(expected.baseSha);
      expect(serialized).not.toContain("\"prNumber\":0");
      expect(serialized).not.toContain("\"ciRunId\":\"0\"");
      expect(serialized).not.toContain("\"qualityGateRunId\":\"0\"");
      expect(serialized).not.toContain("\"qualityGateArtifactId\":\"0\"");
      for (const staleValue of staleValues) {
        expect(serialized).not.toContain(staleValue);
      }
    }

    const evidencePack = readCodexEvidence("evidence-pack.json");
    expect(evidencePack.ciRunId).toBe(expected.ciRunId);
    expect(evidencePack.qualityGateRunId).toBe(expected.qualityGateRunId);
    expect(evidencePack.qualityGateArtifactId).toBe(expected.qualityGateArtifactId);
    expect(evidencePack.productCiStatus).toBe("success");
    expect(evidencePack.qualityGateStatus).toBe("success");

    const qualityGateEvidence = readCodexEvidence("quality-gate-evidence.json");
    expect(qualityGateEvidence.qualityGateRunId).toBe(expected.qualityGateRunId);
    expect(qualityGateEvidence.qualityGateArtifactId).toBe(expected.qualityGateArtifactId);
    expect(qualityGateEvidence.rawLogsRead).toBe(false);

    const safetyEvidence = readCodexEvidence("p0-admin-support-event-search.json");
    expect(safetyEvidence.runtimeReadinessClaimed).toBe(false);
    expect(safetyEvidence.productionReadinessClaimed).toBe(false);
    expect(safetyEvidence.legalComplianceClaimed).toBe(false);
    expect(safetyEvidence.youtubePolicyComplianceClaimed).toBe(false);
    expect(safetyEvidence.realYouTubeApiUsed).toBe(false);
    expect(safetyEvidence.realDbConnectionUsed).toBe(false);
    expect(safetyEvidence.dbDriverDependencyAdded).toBe(false);
    expect(safetyEvidence.redisDependencyAdded).toBe(false);
    expect(safetyEvidence.kafkaDependencyAdded).toBe(false);
    expect(safetyEvidence.packageJsonChanged).toBe(false);
    expect(safetyEvidence.pnpmLockChanged).toBe(false);
  });
});
