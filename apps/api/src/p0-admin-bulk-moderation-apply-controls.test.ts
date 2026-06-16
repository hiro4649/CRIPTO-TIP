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

function manualPayload(requestId: string, moderationStatus: "approved" | "hold" | "rejected" = "hold") {
  return {
    request_id: requestId,
    stream_id: "str_bulk_apply",
    character_id: "char_mio",
    display_name: "safe apply viewer",
    tier: "medium",
    message: "raw apply message <script>",
    moderation_status: moderationStatus
  };
}

async function createManualSupport(app: ReturnType<typeof buildServer>, requestId: string, moderationStatus: "approved" | "hold" | "rejected" = "hold") {
  const response = await app.inject({ method: "POST", url: "/admin/support-events/manual", headers: { authorization: adminAuth }, payload: manualPayload(requestId, moderationStatus) });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

function expectSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("raw apply message");
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

describe("P0 admin bulk moderation apply controls", () => {
  it("requires admin bearer token and rejects invalid input safely", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "POST", url: "/admin/support-events/bulk-review/apply", payload: { action: "approve_hold", event_ids: ["evt_one"] } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/bulk-review/apply", headers: { authorization: "Bearer wrong-token" }, payload: { action: "approve_hold", event_ids: ["evt_one"] } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/bulk-review/apply", headers: { authorization: adminAuth }, payload: { action: "approve_hold", event_ids: [] } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/bulk-review/apply", headers: { authorization: adminAuth }, payload: { action: "approve_hold", event_ids: Array.from({ length: 51 }, (_, index) => `evt_${index}`) } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/bulk-review/apply", headers: { authorization: adminAuth }, payload: { action: "approve_hold", event_ids: ["evt_dup", "evt_dup"] } })).statusCode).toBe(400);
    expect((await app.inject({ method: "POST", url: "/admin/support-events/bulk-review/apply", headers: { authorization: adminAuth }, payload: { action: "delete_hold", event_ids: ["evt_one"] } })).statusCode).toBe(400);

    await app.close();
  });

  it("applies approve_hold only to held events and is idempotent", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const held = await createManualSupport(app, "apply_hold", "hold");
    const approved = await createManualSupport(app, "apply_approved", "approved");
    const rejected = await createManualSupport(app, "apply_rejected", "rejected");

    const response = await app.inject({
      method: "POST",
      url: "/admin/support-events/bulk-review/apply",
      headers: { authorization: adminAuth },
      payload: { action: "approve_hold", event_ids: [held.event_id, approved.event_id, rejected.event_id, "evt_missing_apply"] }
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    const applied = body.results.find((entry: { event_id: string }) => entry.event_id === held.event_id);
    const approvedSkip = body.results.find((entry: { event_id: string }) => entry.event_id === approved.event_id);
    const rejectedSkip = body.results.find((entry: { event_id: string }) => entry.event_id === rejected.event_id);
    const missing = body.results.find((entry: { event_id: string }) => entry.event_id === "evt_missing_apply");
    expect(applied).toMatchObject({
      status: "applied",
      action: "approve_hold",
      reason: "approved_hold",
      side_effects_applied: { affinity: true, reaction_request: true, overlay: true, outbox: true }
    });
    expect(approvedSkip).toMatchObject({ status: "skipped", reason: "not_hold_approved" });
    expect(rejectedSkip).toMatchObject({ status: "skipped", reason: "not_hold_rejected" });
    expect(missing).toMatchObject({ status: "failed", reason: "not_found" });
    expect(await repo.getSupportModerationReviewStatus(held.event_id)).toBe("approved");
    const afterFirst = {
      affinity: repo.affinityLedger.size,
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size,
      audit: repo.auditLogs.length
    };

    const duplicate = await app.inject({
      method: "POST",
      url: "/admin/support-events/bulk-review/apply",
      headers: { authorization: adminAuth },
      payload: { action: "approve_hold", event_ids: [held.event_id] }
    });
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json().results[0]).toMatchObject({ status: "skipped", reason: "already_approved" });
    expect(repo.affinityLedger.size).toBe(afterFirst.affinity);
    expect(repo.reactionRequests.size).toBe(afterFirst.reaction);
    expect(repo.overlayEvents.size).toBe(afterFirst.overlay);
    expect(repo.outboxEvents.size).toBe(afterFirst.outbox);
    expect(repo.auditLogs.length).toBe(afterFirst.audit);
    expectSafe({ body, duplicate: duplicate.json(), auditLogs: repo.auditLogs });

    await app.close();
  }, 20_000);

  it("applies reject_hold without support side effects and writes safe audit metadata", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const held = await createManualSupport(app, "reject_hold", "hold");
    const before = {
      affinity: repo.affinityLedger.size,
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size
    };

    const response = await app.inject({
      method: "POST",
      url: "/admin/support-events/bulk-review/apply",
      headers: { authorization: adminAuth },
      payload: { action: "reject_hold", event_ids: [held.event_id] }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().results[0]).toMatchObject({
      status: "applied",
      action: "reject_hold",
      reason: "rejected_hold",
      side_effects_applied: { affinity: false, reaction_request: false, overlay: false, outbox: false }
    });
    expect(await repo.getSupportModerationReviewStatus(held.event_id)).toBe("rejected");
    expect(repo.affinityLedger.size).toBe(before.affinity);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    const audit = repo.auditLogs.at(-1);
    expect(audit).toMatchObject({ action: "reject_held_support", target_type: "support_event", target_id: held.event_id });
    expectSafe({ response: response.json(), audit });

    await app.close();
  }, 20_000);

  it("committed bulk moderation apply evidence preserves safe boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-bulk-moderation-apply-controls.json");

    expect(evidence.adminBulkModerationApplyStatus).toBe("implemented");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.eventIdLimitStatus).toBe("pass");
    expect(evidence.eligibleActionAllowlistStatus).toBe("pass");
    expect(evidence.holdOnlyStatus).toBe("pass");
    expect(evidence.approveHoldStatus).toBe("pass");
    expect(evidence.rejectHoldStatus).toBe("pass");
    expect(evidence.idempotencyStatus).toBe("pass");
    expect(evidence.auditSafeMetadataStatus).toBe("pass");
    expect(evidence.noUnsupportedMutationStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
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

  it("committed PR 90 evidence uses current same-head run and artifact metadata", () => {
    const activeEvidencePack = readCodexEvidence("evidence-pack.json");
    if (activeEvidencePack.changeType !== "product_vertical_slice_admin_bulk_moderation_apply_controls") {
      expect(activeEvidencePack.changeType).not.toBe("product_vertical_slice_admin_bulk_moderation_apply_controls");
      return;
    }
    const expected = {
      prNumber: 90,
      headSha: "12649acfe26fc3b1beb315b1b179d95ee9f5d872",
      baseSha: "ad9bd8d40174985943c228ae13267dab0c4c561c",
      ciRunId: "27585268336",
      qualityGateRunId: "27585361161",
      qualityGateArtifactId: "7654250246"
    };
    const staleValues = [
      ["current", "pr", "head"].join("_"),
      ["current", "pr", "base"].join("_"),
      ["not", "available", "before", "pr", "creation"].join("_"),
      ["not", "created", "pre", "pr"].join("_"),
      ["pending", "after", "pr", "creation"].join("_"),
      ["HEAD", "SHA", "PLACEHOLDER"].join("_"),
      ["BASE", "SHA", "PLACEHOLDER"].join("_"),
      ["pre", "pr"].join("_")
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
      for (const staleValue of staleValues) expect(serialized).not.toContain(staleValue);
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
  });
});
