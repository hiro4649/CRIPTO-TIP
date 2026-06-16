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

async function createApprovedBoundary(app: ReturnType<typeof buildServer>, requestId = "internal_outbox") {
  const supportResponse = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: requestId,
      stream_id: `str_${requestId}`,
      character_id: "char_mio",
      display_name: "internal outbox viewer",
      tier: "medium",
      message: "internal outbox raw message 0x1111111111111111111111111111111111111111",
      moderation_status: "approved"
    }
  });
  expect(supportResponse.statusCode).toBe(200);
  const support = supportResponse.json().support_event;
  const candidateResponse = await app.inject({ method: "POST", url: `/admin/support-events/${support.event_id}/reaction-dispatch/candidates`, headers: { authorization: adminAuth } });
  expect(candidateResponse.statusCode).toBe(200);
  const candidate = candidateResponse.json().candidate;
  const approvalResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${candidate.candidate_id}/approve`, headers: { authorization: adminAuth } });
  expect(approvalResponse.statusCode).toBe(200);
  const boundaryResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${candidate.candidate_id}/outbox-boundary`, headers: { authorization: adminAuth } });
  expect(boundaryResponse.statusCode).toBe(200);
  return { support, candidate, approval: approvalResponse.json().approval, boundary: boundaryResponse.json().boundary };
}

function expectInternalOutboxSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("internal outbox raw message");
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
  expect(serialized).not.toContain("adapter_url");
  expect(serialized).not.toContain("webhook_url");
}

describe("P0 reaction dispatch internal outbox enqueue", () => {
  it("requires admin auth and returns 404 for unknown records", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/boundaries/missing/enqueue-internal-outbox" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox/missing" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/boundaries/missing/enqueue-internal-outbox", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/boundaries/missing/enqueue-internal-outbox", headers: { authorization: adminAuth } })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox/missing", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("creates queued_internal safely and idempotently without runtime dispatch", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, candidate, boundary } = await createApprovedBoundary(app);
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size,
      audit: repo.auditLogs.length
    };

    const first = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/boundaries/${boundary.boundary_id}/enqueue-internal-outbox`, headers: { authorization: adminAuth } });
    const second = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/boundaries/${boundary.boundary_id}/enqueue-internal-outbox`, headers: { authorization: adminAuth } });
    const list = await app.inject({ method: "GET", url: "/admin/reaction-dispatch/outbox", headers: { authorization: adminAuth } });
    const detail = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/outbox/${first.json().outbox.outbox_id}`, headers: { authorization: adminAuth } });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(list.statusCode).toBe(200);
    expect(detail.statusCode).toBe(200);
    expect(first.json().outbox).toMatchObject({
      boundary_id: boundary.boundary_id,
      candidate_id: candidate.candidate_id,
      support_event_id: support.event_id,
      stream_id: support.stream_id,
      character_id: support.character_id,
      source: "admin_manual_support",
      contract_version: "2.0",
      candidate_status: "candidate_ready",
      boundary_status: "boundary_ready",
      outbox_status: "queued_internal",
      external_delivery_status: "not_attempted",
      adapter_execution_status: "not_executed",
      dispatch_attempt_count: 0,
      safe_reason_codes: ["boundary_ready", "approved_for_dispatch", "external_execution_forbidden"]
    });
    expect(first.json().outbox.outbox_id).toMatch(/^rdout_[a-f0-9]{24}$/);
    expect(second.json().outbox).toEqual(first.json().outbox);
    expect(second.json().idempotent).toBe(true);
    expect(list.json().outbox).toEqual([first.json().outbox]);
    expect(detail.json().outbox).toEqual(first.json().outbox);
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expect(repo.auditLogs.length).toBe(before.audit + 1);
    expect(repo.auditLogs.at(-1)).toMatchObject({
      action: "reaction_dispatch_internal_outbox_queued",
      target_type: "reaction_dispatch_internal_outbox",
      target_id: first.json().outbox.outbox_id
    });
    expectInternalOutboxSafe(first.json());
    expectInternalOutboxSafe(second.json());
    expectInternalOutboxSafe(list.json());
    expectInternalOutboxSafe(detail.json());
    expectInternalOutboxSafe(repo.auditLogs.at(-1));

    await app.close();
  }, 20_000);

  it("blocks unapproved rejected invalid and stale unsafe candidates before enqueue", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const approved = await createApprovedBoundary(app, "internal_outbox_blocked_base");

    const unapproved = { ...approved.candidate, candidate_id: "rdout_unapproved_candidate", idempotency_key: `${approved.candidate.idempotency_key}:unapproved` };
    await repo.createReactionDispatchCandidateIfAbsent(unapproved);
    await repo.setReactionDispatchOutboxBoundaryIfAbsent({ ...approved.boundary, boundary_id: "rdbound_unapproved", candidate_id: unapproved.candidate_id, idempotency_key: "boundary:unapproved", approval_status: "candidate_ready" });

    const rejected = { ...approved.candidate, candidate_id: "rdout_rejected_candidate", idempotency_key: `${approved.candidate.idempotency_key}:rejected` };
    await repo.createReactionDispatchCandidateIfAbsent(rejected);
    await repo.setReactionDispatchApprovalIfAbsent({ ...approved.approval, candidate_id: rejected.candidate_id, approval_status: "rejected_by_admin", idempotency_key: "approval:rejected", safe_reason_codes: ["admin_rejected", "external_execution_forbidden"] });
    await repo.setReactionDispatchOutboxBoundaryIfAbsent({ ...approved.boundary, boundary_id: "rdbound_rejected", candidate_id: rejected.candidate_id, idempotency_key: "boundary:rejected", approval_status: "rejected_by_admin" });

    const invalid = { ...approved.candidate, candidate_id: "rdout_invalid_candidate", candidate_status: "candidate_invalid", idempotency_key: `${approved.candidate.idempotency_key}:invalid` };
    await repo.createReactionDispatchCandidateIfAbsent(invalid);
    await repo.setReactionDispatchApprovalIfAbsent({ ...approved.approval, candidate_id: invalid.candidate_id, idempotency_key: "approval:invalid" });
    await repo.setReactionDispatchOutboxBoundaryIfAbsent({ ...approved.boundary, boundary_id: "rdbound_invalid", candidate_id: invalid.candidate_id, idempotency_key: "boundary:invalid" });

    const unsafe = { ...approved.candidate, candidate_id: "rdout_unsafe_candidate", safe_context_hash: "0".repeat(64), idempotency_key: `${approved.candidate.idempotency_key}:unsafe` };
    await repo.createReactionDispatchCandidateIfAbsent(unsafe);
    await repo.setReactionDispatchApprovalIfAbsent({ ...approved.approval, candidate_id: unsafe.candidate_id, idempotency_key: "approval:unsafe" });
    await repo.setReactionDispatchOutboxBoundaryIfAbsent({ ...approved.boundary, boundary_id: "rdbound_unsafe", candidate_id: unsafe.candidate_id, idempotency_key: "boundary:unsafe" });

    const unapprovedResponse = await app.inject({ method: "POST", url: "/admin/reaction-dispatch/boundaries/rdbound_unapproved/enqueue-internal-outbox", headers: { authorization: adminAuth } });
    const rejectedResponse = await app.inject({ method: "POST", url: "/admin/reaction-dispatch/boundaries/rdbound_rejected/enqueue-internal-outbox", headers: { authorization: adminAuth } });
    const invalidResponse = await app.inject({ method: "POST", url: "/admin/reaction-dispatch/boundaries/rdbound_invalid/enqueue-internal-outbox", headers: { authorization: adminAuth } });
    const unsafeResponse = await app.inject({ method: "POST", url: "/admin/reaction-dispatch/boundaries/rdbound_unsafe/enqueue-internal-outbox", headers: { authorization: adminAuth } });

    expect(unapprovedResponse.statusCode).toBe(409);
    expect(rejectedResponse.statusCode).toBe(409);
    expect(invalidResponse.statusCode).toBe(409);
    expect(unsafeResponse.statusCode).toBe(409);
    expect(unapprovedResponse.json().outbox.outbox_status).toBe("blocked_internal");
    expect(rejectedResponse.json().outbox.safe_reason_codes).toContain("candidate_not_approved");
    expect(invalidResponse.json().outbox.safe_reason_codes).toContain("candidate_invalid");
    expect(unsafeResponse.json().outbox.safe_reason_codes).toContain("unsafe_context");
    expect(await repo.listReactionDispatchInternalOutbox()).toEqual([]);
    expectInternalOutboxSafe(unapprovedResponse.json());
    expectInternalOutboxSafe(rejectedResponse.json());
    expectInternalOutboxSafe(invalidResponse.json());
    expectInternalOutboxSafe(unsafeResponse.json());

    await app.close();
  }, 20_000);

  it("committed internal outbox evidence preserves no-runtime boundaries", () => {
    const evidence = readCodexEvidence("p0-reaction-dispatch-internal-outbox-enqueue.json");

    expect(evidence.reactionDispatchInternalOutboxEnqueueStatus).toBe("implemented");
    expect(evidence.supportEventContractV2Alignment).toBe("pass");
    expect(evidence.boundaryReadyOnlyStatus).toBe("pass");
    expect(evidence.approvedCandidateOnlyStatus).toBe("pass");
    expect(evidence.internalOutboxIdempotencyStatus).toBe("pass");
    expect(evidence.outboxStatusAllowlistStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.noReactionExecutionStatus).toBe("pass");
    expect(evidence.noOverlayExecutionStatus).toBe("pass");
    expect(evidence.noExternalOutboxDispatchStatus).toBe("pass");
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
