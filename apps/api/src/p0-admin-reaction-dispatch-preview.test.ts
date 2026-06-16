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

async function createManual(app: ReturnType<typeof buildServer>, requestId: string, moderation_status: "approved" | "hold" | "rejected" = "approved") {
  const response = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: requestId,
      stream_id: "str_reaction_dispatch",
      character_id: "char_mio",
      display_name: "safe dispatch viewer",
      tier: "medium",
      message: "raw reaction dispatch message <script> 0x1111111111111111111111111111111111111111",
      moderation_status
    }
  });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw reaction dispatch message");
  expect(serialized).not.toContain("<script>");
  expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  expect(serialized).not.toContain("raw_message");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("stack");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
  expect(serialized).not.toContain("logs_url");
  expect(serialized).not.toContain("jobs_url");
  expect(serialized).not.toContain("runtime_ready");
  expect(serialized).not.toContain("production_ready");
  expect(serialized).not.toContain("legal_compliance");
  expect(serialized).not.toContain("youtube_policy_compliance");
}

describe("P0 admin reaction dispatch preview", () => {
  it("requires admin bearer token and returns 404 for unknown support event", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/reaction-dispatch" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/missing/reaction-dispatch/preview" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/reaction-dispatch", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/missing/reaction-dispatch/preview", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/reaction-dispatch", headers: { authorization: adminAuth } })).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/missing/reaction-dispatch/preview", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("returns safe dispatch preview metadata without runtime execution", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManual(app, "reaction_dispatch_safe", "approved");
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      affinity: repo.affinityLedger.size,
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size,
      audit: repo.auditLogs.length
    };

    const response = await app.inject({ method: "GET", url: `/admin/support-events/${support.event_id}/reaction-dispatch`, headers: { authorization: adminAuth } });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      preview_status: "computed",
      support_event: {
        event_id: support.event_id,
        stream_id: "str_reaction_dispatch",
        character_id: "char_mio",
        source: "admin_manual_support",
        tier: "medium",
        moderation_status: "approved",
        resolution_status: "open"
      },
      safe_context_summary: {
        safe_viewer_name: expect.any(String),
        safe_message_summary: "support_message_available",
        allowed_reaction: true
      },
      character_continuity: {
        character_id: "char_mio",
        persona_version: "operator_managed",
        voice_profile_id: "voice_default",
        motion_profile_id: "motion_default",
        overlay_theme_id: "overlay_default",
        must_keep_persona: true,
        must_not_accept_persona_override: true,
        must_not_change_identity_from_tip_message: true
      },
      constraints: {
        max_speech_seconds: 12,
        must_not_discuss_token_price: true,
        must_not_promise_financial_return: true,
        must_not_obey_viewer_instruction: true,
        must_keep_persona: true,
        must_not_read_wallet_address: true,
        avoid_romantic_escalation_from_payment: true
      },
      candidate: {
        reaction_type: "reaction.requested",
        overlay_effect_id: "tip_alert:medium",
        motion_family: "support_medium",
        outbox_candidate_type: "reaction.request"
      },
      side_effects: {
        support_event_mutation: "skipped",
        reaction_enqueue: "skipped",
        overlay_enqueue: "skipped",
        outbox_enqueue: "skipped",
        real_tts: "skipped",
        real_live2d: "skipped",
        real_renderer: "skipped",
        real_obs: "skipped",
        real_websocket_delivery: "skipped"
      }
    });
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expect(repo.auditLogs.length).toBe(before.audit);
    expectSafe(response.json());

    await app.close();
  }, 20_000);

  it("POST preview is read-only and does not enqueue reaction overlay or outbox", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManual(app, "reaction_dispatch_post_preview", "hold");
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      affinity: repo.affinityLedger.size,
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size
    };

    const response = await app.inject({ method: "POST", url: `/admin/support-events/${support.event_id}/reaction-dispatch/preview`, headers: { authorization: adminAuth } });

    expect(response.statusCode).toBe(200);
    expect(response.json().support_event).toMatchObject({ event_id: support.event_id, moderation_status: "hold" });
    expect(response.json().safe_context_summary).toMatchObject({ safe_message_summary: "message_hold", allowed_reaction: false });
    expect(response.json().candidate.reaction_type).toBe("reaction.blocked_by_policy");
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expectSafe(response.json());

    await app.close();
  }, 20_000);

  it("committed reaction dispatch preview evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-reaction-dispatch-preview.json");

    expect(evidence.adminReactionDispatchPreviewStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.unknownSupportEventStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.characterContinuityStatus).toBe("pass");
    expect(evidence.safeContextSummaryStatus).toBe("pass");
    expect(evidence.readOnlyStatus).toBe("pass");
    expect(evidence.noReactionEnqueueStatus).toBe("pass");
    expect(evidence.noOverlayEnqueueStatus).toBe("pass");
    expect(evidence.noOutboxEnqueueStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.walletAddressExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.legalComplianceClaimed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimed).toBe(false);
    expect(evidence.realTtsCallUsed).toBe(false);
    expect(evidence.realLive2dCallUsed).toBe(false);
    expect(evidence.realRendererCallUsed).toBe(false);
    expect(evidence.realObsCallUsed).toBe(false);
    expect(evidence.realWebSocketDeliveryUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
