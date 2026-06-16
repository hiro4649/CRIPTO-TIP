import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";
import type { ReactionDispatchCandidateMetadata } from "./repositories/types.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

async function createManual(app: ReturnType<typeof buildServer>, overrides: Partial<{
  request_id: string;
  stream_id: string;
  message: string;
  moderation_status: "approved" | "hold" | "rejected";
}> = {}) {
  const response = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: overrides.request_id ?? "reaction_approval",
      stream_id: overrides.stream_id ?? "str_reaction_approval",
      character_id: "char_mio",
      display_name: "reaction approval viewer",
      tier: "medium",
      message: overrides.message ?? "approval gate raw message 0x1111111111111111111111111111111111111111",
      moderation_status: overrides.moderation_status ?? "approved"
    }
  });
  expect(response.statusCode).toBe(200);
  return response.json().support_event;
}

async function createCandidate(app: ReturnType<typeof buildServer>, supportEventId: string) {
  const response = await app.inject({
    method: "POST",
    url: `/admin/support-events/${supportEventId}/reaction-dispatch/candidates`,
    headers: { authorization: adminAuth }
  });
  expect(response.statusCode).toBe(200);
  return response.json().candidate as ReactionDispatchCandidateMetadata;
}

function cloneCandidate(candidate: ReactionDispatchCandidateMetadata, patch: Partial<ReactionDispatchCandidateMetadata>) {
  const candidateId = patch.candidate_id ?? `${candidate.candidate_id}_copy`;
  return { ...candidate, ...patch, candidate_id: candidateId, idempotency_key: patch.idempotency_key ?? `${candidate.idempotency_key}:${candidateId}` };
}

function expectApprovalSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("approval gate raw message");
  expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  expect(serialized).not.toContain("raw_message");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("wallet_address");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("private_url");
  expect(serialized).not.toContain("stdout");
  expect(serialized).not.toContain("stderr");
  expect(serialized).not.toContain("jobs_url");
  expect(serialized).not.toContain("logs_url");
  expect(serialized).not.toContain("full_prompt");
  expect(serialized).not.toContain("llm_output");
}

describe("P0 admin reaction dispatch approval gate", () => {
  it("requires admin auth and returns 404 for unknown candidate", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/candidates/missing/approve" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/candidates/missing/reject" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/candidates/missing/approval" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/candidates/missing/approve", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/candidates/missing/approve", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("approves candidate_ready idempotently with safe audit metadata and no dispatch side effects", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManual(app);
    const candidate = await createCandidate(app, support.event_id);
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size,
      audit: repo.auditLogs.length
    };

    const first = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${candidate.candidate_id}/approve`, headers: { authorization: adminAuth } });
    const second = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${candidate.candidate_id}/approve`, headers: { authorization: adminAuth } });
    const detail = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/candidates/${candidate.candidate_id}/approval`, headers: { authorization: adminAuth } });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(detail.statusCode).toBe(200);
    expect(first.json().approval).toMatchObject({
      candidate_id: candidate.candidate_id,
      support_event_id: support.event_id,
      candidate_status: "candidate_ready",
      approval_status: "approved_for_dispatch",
      approved_by_actor_type: "admin",
      safe_reason_codes: ["contract_v2_valid", "admin_approved", "external_execution_forbidden"],
      contract_validation_status: "valid"
    });
    expect(second.json().approval).toEqual(first.json().approval);
    expect(second.json().idempotent).toBe(true);
    expect(detail.json().approval).toEqual(first.json().approval);
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expect(repo.auditLogs.length).toBe(before.audit + 1);
    expect(repo.auditLogs.at(-1)).toMatchObject({
      action: "reaction_dispatch_candidate_approved",
      target_type: "reaction_dispatch_candidate",
      target_id: candidate.candidate_id
    });
    expectApprovalSafe(first.json());
    expectApprovalSafe(second.json());
    expectApprovalSafe(detail.json());
    expectApprovalSafe(repo.auditLogs.at(-1));

    await app.close();
  }, 20_000);

  it("rejects candidate_ready idempotently and blocks approved candidate reversal", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const rejectedSupport = await createManual(app, { request_id: "reaction_approval_reject", stream_id: "str_reaction_approval_reject" });
    const rejectedCandidate = await createCandidate(app, rejectedSupport.event_id);

    const firstReject = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${rejectedCandidate.candidate_id}/reject`, headers: { authorization: adminAuth } });
    const secondReject = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${rejectedCandidate.candidate_id}/reject`, headers: { authorization: adminAuth } });

    expect(firstReject.statusCode).toBe(200);
    expect(secondReject.statusCode).toBe(200);
    expect(firstReject.json().approval.approval_status).toBe("rejected_by_admin");
    expect(secondReject.json().approval).toEqual(firstReject.json().approval);
    expect(secondReject.json().idempotent).toBe(true);

    const approvedSupport = await createManual(app, { request_id: "reaction_approval_approved_reject", stream_id: "str_reaction_approval_approved_reject" });
    const approvedCandidate = await createCandidate(app, approvedSupport.event_id);
    expect((await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${approvedCandidate.candidate_id}/approve`, headers: { authorization: adminAuth } })).statusCode).toBe(200);
    const blockedReject = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${approvedCandidate.candidate_id}/reject`, headers: { authorization: adminAuth } });
    expect(blockedReject.statusCode).toBe(409);
    expect(blockedReject.json().approval.approval_status).toBe("approved_for_dispatch");
    expect(blockedReject.json().approval.safe_reason_codes).toContain("admin_approved");
    expectApprovalSafe(blockedReject.json());

    await app.close();
  }, 20_000);

  it("blocks invalid blocked superseded and unsafe candidates before approval", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const support = await createManual(app);
    const ready = await createCandidate(app, support.event_id);
    const invalid = cloneCandidate(ready, { candidate_id: "rdcand_invalid_for_approval", candidate_status: "candidate_invalid", validation_status: "invalid", validation_errors: ["forced_invalid"] });
    const blocked = cloneCandidate(ready, { candidate_id: "rdcand_blocked_for_approval", candidate_status: "candidate_blocked" });
    const superseded = cloneCandidate(ready, { candidate_id: "rdcand_superseded_for_approval", candidate_status: "candidate_superseded" });
    const unsafe = cloneCandidate(ready, { candidate_id: "rdcand_unsafe_for_approval", safe_context_hash: "0".repeat(64) });
    await repo.createReactionDispatchCandidateIfAbsent(invalid);
    await repo.createReactionDispatchCandidateIfAbsent(blocked);
    await repo.createReactionDispatchCandidateIfAbsent(superseded);
    await repo.createReactionDispatchCandidateIfAbsent(unsafe);
    const before = {
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size
    };

    const invalidResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${invalid.candidate_id}/approve`, headers: { authorization: adminAuth } });
    const blockedResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${blocked.candidate_id}/approve`, headers: { authorization: adminAuth } });
    const supersededResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${superseded.candidate_id}/approve`, headers: { authorization: adminAuth } });
    const unsafeResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${unsafe.candidate_id}/approve`, headers: { authorization: adminAuth } });

    expect(invalidResponse.statusCode).toBe(409);
    expect(invalidResponse.json().approval.approval_status).toBe("candidate_invalid");
    expect(blockedResponse.statusCode).toBe(409);
    expect(blockedResponse.json().approval.approval_status).toBe("approval_blocked");
    expect(supersededResponse.statusCode).toBe(409);
    expect(supersededResponse.json().approval.approval_status).toBe("candidate_superseded");
    expect(unsafeResponse.statusCode).toBe(409);
    expect(unsafeResponse.json().approval.safe_reason_codes).toContain("unsafe_context");
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expectApprovalSafe(invalidResponse.json());
    expectApprovalSafe(blockedResponse.json());
    expectApprovalSafe(supersededResponse.json());
    expectApprovalSafe(unsafeResponse.json());

    await app.close();
  }, 20_000);

  it("committed approval gate evidence preserves no-runtime boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-reaction-dispatch-approval-gate.json");

    expect(evidence.adminReactionDispatchApprovalGateStatus).toBe("implemented");
    expect(evidence.supportEventContractV2Alignment).toBe("pass");
    expect(evidence.candidateApprovalStatus).toBe("pass");
    expect(evidence.candidateRejectionStatus).toBe("pass");
    expect(evidence.candidateIdempotencyStatus).toBe("pass");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.noReactionEnqueueStatus).toBe("pass");
    expect(evidence.noOverlayEnqueueStatus).toBe("pass");
    expect(evidence.noOutboxEnqueueStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.auditSafeMetadataStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.walletAddressExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.privateUrlExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.legalComplianceClaimed).toBe(false);
    expect(evidence.youtubePolicyComplianceClaimed).toBe(false);
    expect(evidence.realTtsCallUsed).toBe(false);
    expect(evidence.realLive2dCallUsed).toBe(false);
    expect(evidence.realRendererCallUsed).toBe(false);
    expect(evidence.realObsCallUsed).toBe(false);
    expect(evidence.realWebSocketDeliveryUsed).toBe(false);
    expect(evidence.irisCoreCallUsed).toBe(false);
    expect(evidence.voxweaveCallUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
