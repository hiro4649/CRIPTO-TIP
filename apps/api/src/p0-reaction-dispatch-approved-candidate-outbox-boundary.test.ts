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

async function createApprovedCandidate(app: ReturnType<typeof buildServer>, requestId = "outbox_boundary") {
  const supportResponse = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: requestId,
      stream_id: `str_${requestId}`,
      character_id: "char_mio",
      display_name: "outbox boundary viewer",
      tier: "medium",
      message: "outbox boundary raw message 0x1111111111111111111111111111111111111111",
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
  return { support, candidate, approval: approvalResponse.json().approval };
}

function expectBoundarySafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("outbox boundary raw message");
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

describe("P0 approved reaction dispatch candidate outbox boundary", () => {
  it("requires admin auth and returns 404 for unknown candidate", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/candidates/missing/outbox-boundary" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/candidates/missing/outbox-boundary" })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/candidates/missing/outbox-boundary", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/candidates/missing/outbox-boundary", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("records approved candidate boundary idempotently without enqueueing outbox", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, candidate } = await createApprovedCandidate(app);
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outbox: repo.outboxEvents.size,
      audit: repo.auditLogs.length
    };

    const first = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${candidate.candidate_id}/outbox-boundary`, headers: { authorization: adminAuth } });
    const second = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${candidate.candidate_id}/outbox-boundary`, headers: { authorization: adminAuth } });
    const detail = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/candidates/${candidate.candidate_id}/outbox-boundary`, headers: { authorization: adminAuth } });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(detail.statusCode).toBe(200);
    expect(first.json().boundary).toMatchObject({
      candidate_id: candidate.candidate_id,
      support_event_id: support.event_id,
      boundary_status: "boundary_ready",
      approval_status: "approved_for_dispatch",
      candidate_status: "candidate_ready",
      safe_reason_codes: ["approved_for_dispatch", "external_execution_forbidden"],
      contract_validation_status: "valid"
    });
    expect(first.json().boundary.boundary_id).toMatch(/^rdbound_[a-f0-9]{24}$/);
    expect(second.json().boundary).toEqual(first.json().boundary);
    expect(second.json().idempotent).toBe(true);
    expect(detail.json().boundary).toEqual(first.json().boundary);
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outbox);
    expect(repo.auditLogs.length).toBe(before.audit + 1);
    expect(repo.auditLogs.at(-1)).toMatchObject({
      action: "reaction_dispatch_outbox_boundary_recorded",
      target_type: "reaction_dispatch_outbox_boundary",
      target_id: first.json().boundary.boundary_id
    });
    expectBoundarySafe(first.json());
    expectBoundarySafe(second.json());
    expectBoundarySafe(detail.json());
    expectBoundarySafe(repo.auditLogs.at(-1));

    await app.close();
  }, 20_000);

  it("blocks unapproved rejected and unsafe candidates", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, candidate } = await createApprovedCandidate(app, "outbox_boundary_blocked_base");
    const unapprovedSupportResponse = await app.inject({
      method: "POST",
      url: "/admin/support-events/manual",
      headers: { authorization: adminAuth },
      payload: {
        request_id: "outbox_boundary_unapproved",
        stream_id: "str_outbox_boundary_unapproved",
        character_id: "char_mio",
        display_name: "outbox boundary viewer",
        tier: "medium",
        message: "outbox boundary raw message 0x2222222222222222222222222222222222222222",
        moderation_status: "approved"
      }
    });
    const unapprovedSupport = unapprovedSupportResponse.json().support_event;
    const unapprovedCandidateResponse = await app.inject({ method: "POST", url: `/admin/support-events/${unapprovedSupport.event_id}/reaction-dispatch/candidates`, headers: { authorization: adminAuth } });
    const unapprovedCandidate = unapprovedCandidateResponse.json().candidate;
    const rejectedSupport = await createApprovedCandidate(app, "outbox_boundary_rejected_seed");
    await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${rejectedSupport.candidate.candidate_id}/reject`, headers: { authorization: adminAuth } });

    const unsafe = { ...candidate, candidate_id: "rdbound_unsafe_candidate", safe_context_hash: "0".repeat(64), idempotency_key: `${candidate.idempotency_key}:unsafe-boundary` };
    await repo.createReactionDispatchCandidateIfAbsent(unsafe);
    await repo.setReactionDispatchApprovalIfAbsent({ ...rejectedSupport.approval, candidate_id: unsafe.candidate_id, support_event_id: support.event_id, idempotency_key: `approval:${unsafe.candidate_id}` });

    const unapproved = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${unapprovedCandidate.candidate_id}/outbox-boundary`, headers: { authorization: adminAuth } });
    const unsafeResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${unsafe.candidate_id}/outbox-boundary`, headers: { authorization: adminAuth } });

    expect(unapproved.statusCode).toBe(409);
    expect(unapproved.json().boundary.boundary_status).toBe("candidate_not_approved");
    expect(unsafeResponse.statusCode).toBe(409);
    expect(unsafeResponse.json().boundary.boundary_status).toBe("boundary_blocked");
    expect(unsafeResponse.json().boundary.safe_reason_codes).toContain("unsafe_context");
    expectBoundarySafe(unapproved.json());
    expectBoundarySafe(unsafeResponse.json());

    await app.close();
  }, 20_000);

  it("committed outbox boundary evidence preserves no-runtime boundaries", () => {
    const evidence = readCodexEvidence("p0-reaction-dispatch-approved-candidate-outbox-boundary.json");

    expect(evidence.approvedCandidateOutboxBoundaryStatus).toBe("implemented");
    expect(evidence.adminApprovalGateAlignment).toBe("pass");
    expect(evidence.boundaryIdempotencyStatus).toBe("pass");
    expect(evidence.noOutboxEnqueueStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
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
