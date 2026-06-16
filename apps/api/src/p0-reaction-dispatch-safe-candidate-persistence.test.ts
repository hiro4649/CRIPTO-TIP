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

async function createManual(app: ReturnType<typeof buildServer>, overrides: Partial<{
  request_id: string;
  stream_id: string;
  character_id: string;
  display_name: string;
  tier: "small" | "medium" | "large" | "high";
  message: string;
  moderation_status: "approved" | "hold" | "rejected";
}> = {}) {
  const response = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: overrides.request_id ?? "reaction_candidate",
      stream_id: overrides.stream_id ?? "str_reaction_candidate",
      character_id: overrides.character_id ?? "char_mio",
      display_name: overrides.display_name ?? "reaction candidate viewer",
      tier: overrides.tier ?? "medium",
      message: overrides.message ?? "safe candidate message 0x1111111111111111111111111111111111111111",
      moderation_status: overrides.moderation_status ?? "approved"
    }
  });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectCandidateSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("safe candidate message");
  expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  expect(serialized).not.toContain("raw_message");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("wallet_address");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
  expect(serialized).not.toContain("jobs_url");
  expect(serialized).not.toContain("logs_url");
  expect(serialized).not.toContain("full_prompt");
  expect(serialized).not.toContain("llm_output");
  expect(serialized).not.toContain("private_url");
}

describe("P0 reaction dispatch safe candidate persistence", () => {
  it("requires admin auth and returns 404 for unknown support event", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "POST", url: "/admin/support-events/missing/reaction-dispatch/candidates" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/reaction-dispatch/candidates" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/support-events/missing/reaction-dispatch/candidates/candidate_1" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/missing/reaction-dispatch/candidates", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/missing/reaction-dispatch/candidates", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("creates idempotent safe candidate metadata without dispatch side effects", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManual(app);
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      affinity: repo.affinityLedger.size,
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size,
      audit: repo.auditLogs.length
    };

    const first = await app.inject({
      method: "POST",
      url: `/admin/support-events/${support.event_id}/reaction-dispatch/candidates`,
      headers: { authorization: adminAuth }
    });
    const second = await app.inject({
      method: "POST",
      url: `/admin/support-events/${support.event_id}/reaction-dispatch/candidates`,
      headers: { authorization: adminAuth }
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(first.json().candidate).toMatchObject({
      support_event_id: support.event_id,
      stream_id: "str_reaction_candidate",
      character_id: "char_mio",
      source: "admin_manual_support",
      contract_version: "2.0",
      validation_status: "valid",
      validation_errors: [],
      persona_version: "operator_managed",
      voice_profile_id: "voice_default",
      motion_profile_id: "motion_default",
      overlay_theme_id: "overlay_default",
      candidate_purpose: "reaction_dispatch",
      candidate_status: "candidate_ready",
      reason_codes: ["contract_v2_valid"],
      preview_summary: {
        preview_status: "computed",
        safe_message_summary: "support_message_available",
        allowed_reaction: true,
        reaction_type: "reaction.requested",
        overlay_effect_id: "tip_alert:medium",
        motion_family: "support_medium",
        outbox_candidate_type: "reaction.request"
      }
    });
    expect(first.json().candidate.candidate_id).toMatch(/^rdcand_[a-f0-9]{24}$/);
    expect(first.json().candidate.safe_context_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.json().candidate.constraints_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(second.json().candidate.candidate_id).toBe(first.json().candidate.candidate_id);
    expect(second.json().persistence).toMatchObject({ status: "candidate_existing", duplicate_safe: true });
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expect(repo.auditLogs.length).toBe(before.audit);
    expectCandidateSafe(first.json());
    expectCandidateSafe(second.json());

    const list = await app.inject({
      method: "GET",
      url: `/admin/support-events/${support.event_id}/reaction-dispatch/candidates`,
      headers: { authorization: adminAuth }
    });
    expect(list.statusCode).toBe(200);
    expect(list.json().candidates).toHaveLength(1);

    const detail = await app.inject({
      method: "GET",
      url: `/admin/support-events/${support.event_id}/reaction-dispatch/candidates/${first.json().candidate.candidate_id}`,
      headers: { authorization: adminAuth }
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().candidate).toEqual(first.json().candidate);
    expectCandidateSafe(list.json());
    expectCandidateSafe(detail.json());

    await app.close();
  }, 20_000);

  it("stores blocked candidate metadata for moderation hold without enqueueing", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManual(app, {
      request_id: "reaction_candidate_hold",
      stream_id: "str_reaction_candidate_hold",
      message: "safe candidate message held 0x2222222222222222222222222222222222222222",
      moderation_status: "hold"
    });

    const response = await app.inject({
      method: "POST",
      url: `/admin/support-events/${support.event_id}/reaction-dispatch/candidates`,
      headers: { authorization: adminAuth }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().candidate).toMatchObject({
      support_event_id: support.event_id,
      validation_status: "valid",
      candidate_status: "candidate_blocked",
      reason_codes: ["contract_v2_valid", "moderation_not_approved"],
      preview_summary: {
        safe_message_summary: "message_hold",
        allowed_reaction: false,
        reaction_type: "reaction.blocked_by_policy"
      }
    });
    expect(repo.reactionRequests.size).toBe(0);
    expect(repo.overlayEvents.size).toBe(0);
    expect(repo.outboxEvents.size).toBe(0);
    expectCandidateSafe(response.json());

    await app.close();
  }, 20_000);

  it("committed candidate persistence evidence preserves no-runtime boundaries", () => {
    const evidence = readCodexEvidence("p0-reaction-dispatch-safe-candidate-persistence.json");

    expect(evidence.reactionDispatchSafeCandidatePersistenceStatus).toBe("implemented");
    expect(evidence.supportEventContractV2Alignment).toBe("pass");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.idempotencyStatus).toBe("pass");
    expect(evidence.noSupportEventMutationStatus).toBe("pass");
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
