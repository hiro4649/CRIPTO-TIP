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

async function createDryRunBoundary(app: ReturnType<typeof buildServer>, requestId = "dry_run_approval") {
  const supportResponse = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: requestId,
      stream_id: `str_${requestId}`,
      character_id: "char_mio",
      display_name: "dry run approval viewer",
      tier: "medium",
      message: "dry run approval raw message 0x1111111111111111111111111111111111111111 https://private.example/hook adapter_url webhook_url Authorization Bearer secret token",
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
  const boundary = boundaryResponse.json().boundary;
  const outboxResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/boundaries/${boundary.boundary_id}/enqueue-internal-outbox`, headers: { authorization: adminAuth } });
  expect(outboxResponse.statusCode).toBe(200);
  const outbox = outboxResponse.json().outbox;
  const leaseResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/lease`, headers: { authorization: adminAuth } });
  expect(leaseResponse.statusCode).toBe(200);
  const lease = leaseResponse.json().lease_status;
  const planResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/outbox/${outbox.outbox_id}/attempt-plan`, headers: { authorization: adminAuth }, payload: { lease_id: lease.lease_id } });
  expect(planResponse.statusCode).toBe(200);
  const plan = planResponse.json().attempt_plan;
  const dryRunResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/attempt-plans/${plan.plan_id}/dry-run-adapter-boundary`, headers: { authorization: adminAuth }, payload: { lease_id: lease.lease_id } });
  expect(dryRunResponse.statusCode).toBe(200);
  return { support, candidate, boundary, outbox, lease, plan, dryRun: dryRunResponse.json().dry_run_boundary };
}

function expectDryRunApprovalSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("dry run approval raw message");
  expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  expect(serialized).not.toContain("private.example");
  expect(serialized).not.toContain("raw_message");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("wallet_address");
  expect(serialized).not.toContain("authorization");
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("token");
  expect(serialized).not.toContain("private_url");
  expect(serialized).not.toContain("adapter_url");
  expect(serialized).not.toContain("webhook_url");
  expect(serialized).not.toContain("headers");
  expect(serialized).not.toContain("full_prompt");
  expect(serialized).not.toContain("llm_output");
  expect(serialized).not.toContain("tts_text");
  expect(serialized).not.toContain("audio_url");
  expect(serialized).not.toContain("renderer_url");
}

function dryRunApprovalAuditLogs(repo: InMemoryRepository) {
  return repo.auditLogs.filter((log) => log.target_type === "reaction_dispatch_dry_run_boundary");
}

describe("P0 admin reaction dispatch dry-run approval gate", () => {
  it("requires admin auth and returns 404 for unknown dry-run boundary", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    for (const method of ["GET", "POST"] as const) {
      const suffix = method === "GET" ? "/approval" : "/approve";
      expect((await app.inject({ method, url: `/admin/reaction-dispatch/dry-run-boundaries/rddry_missing${suffix}` })).statusCode).toBe(401);
      expect((await app.inject({ method, url: `/admin/reaction-dispatch/dry-run-boundaries/rddry_missing${suffix}`, headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
      expect((await app.inject({ method, url: `/admin/reaction-dispatch/dry-run-boundaries/rddry_missing${suffix}`, headers: { authorization: adminAuth } })).statusCode).toBe(404);
    }
    expect((await app.inject({ method: "POST", url: "/admin/reaction-dispatch/dry-run-boundaries/rddry_missing/reject", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("approves dry_run_ready idempotently with safe metadata and no execution side effects", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, outbox, lease, plan, dryRun } = await createDryRunBoundary(app);
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      outbox: await repo.getReactionDispatchInternalOutbox(outbox.outbox_id),
      lease: await repo.getReactionDispatchInternalOutboxLease(outbox.outbox_id),
      plan: await repo.getReactionDispatchInternalOutboxAttemptPlan(outbox.outbox_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      externalOutbox: repo.outboxEvents.size
    };

    const approval = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/approve`, headers: { authorization: adminAuth } });
    const duplicate = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/approve`, headers: { authorization: adminAuth } });
    const status = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/approval`, headers: { authorization: adminAuth } });

    expect(approval.statusCode).toBe(200);
    expect(duplicate.statusCode).toBe(200);
    expect(status.statusCode).toBe(200);
    expect(approval.json().approval).toMatchObject({
      dry_run_boundary_id: dryRun.dry_run_boundary_id,
      plan_id: plan.plan_id,
      outbox_id: outbox.outbox_id,
      lease_id: lease.lease_id,
      support_event_id: support.event_id,
      adapter_kind: "iris_core_reaction",
      dry_run_status: "dry_run_ready",
      approval_status: "approved_for_adapter_execution",
      approved_by_actor_type: "admin",
      external_delivery_status: "not_attempted",
      adapter_execution_status: "not_executed",
      dispatch_attempt_count: 0
    });
    expect(approval.json().approval.safe_reason_codes).toEqual(["admin_approved", "external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"]);
    expect(duplicate.json().approval.safe_reason_codes).toEqual(["already_approved", "external_execution_forbidden"]);
    expect(status.json().approval.approval_status).toBe("approved_for_adapter_execution");
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(await repo.getReactionDispatchInternalOutbox(outbox.outbox_id)).toEqual(before.outbox);
    expect(await repo.getReactionDispatchInternalOutboxLease(outbox.outbox_id)).toEqual(before.lease);
    expect(await repo.getReactionDispatchInternalOutboxAttemptPlan(outbox.outbox_id)).toEqual(before.plan);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.externalOutbox);
    const approvalAudits = dryRunApprovalAuditLogs(repo);
    expect(approvalAudits).toHaveLength(1);
    expect(approvalAudits[0]).toMatchObject({
      action: "reaction_dispatch_dry_run_boundary_approved",
      target_type: "reaction_dispatch_dry_run_boundary",
      target_id: dryRun.dry_run_boundary_id
    });
    expectDryRunApprovalSafe(approval.json());
    expectDryRunApprovalSafe(duplicate.json());
    expectDryRunApprovalSafe(status.json());
    expectDryRunApprovalSafe(repo.auditLogs);

    await app.close();
  }, 20_000);

  it("rejects dry-run boundary idempotently and fail-closes approve after reject", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { dryRun } = await createDryRunBoundary(app, "dry_run_reject");

    const rejection = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/reject`, headers: { authorization: adminAuth } });
    const duplicate = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/reject`, headers: { authorization: adminAuth } });
    const approveAfterReject = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/approve`, headers: { authorization: adminAuth } });

    expect(rejection.statusCode).toBe(200);
    expect(rejection.json().approval).toMatchObject({ approval_status: "rejected_by_admin", rejected_by_actor_type: "admin" });
    expect(rejection.json().approval.safe_reason_codes).toEqual(["admin_rejected", "external_execution_forbidden"]);
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json().approval.safe_reason_codes).toEqual(["already_rejected", "external_execution_forbidden"]);
    expect(approveAfterReject.statusCode).toBe(409);
    expect(approveAfterReject.json().approval.safe_reason_codes).toEqual(["state_transition_blocked", "external_execution_forbidden"]);
    const rejectionAudits = dryRunApprovalAuditLogs(repo);
    expect(rejectionAudits).toHaveLength(1);
    expect(rejectionAudits[0]?.action).toBe("reaction_dispatch_dry_run_boundary_rejected");
    expectDryRunApprovalSafe(rejection.json());
    expectDryRunApprovalSafe(duplicate.json());
    expectDryRunApprovalSafe(approveAfterReject.json());

    await app.close();
  }, 20_000);

  it("rejects unsafe approval states without mutating support, outbox, lease, or attempt plan", async () => {
    const cases = [
      {
        name: "dry_run_blocked",
        mutate: async (repo: InMemoryRepository, outboxId: string) => {
          const lease = await repo.getReactionDispatchInternalOutboxLease(outboxId);
          if (lease) await repo.setReactionDispatchInternalOutboxLease({ ...lease, lease_status: "lease_released", updated_at: new Date().toISOString() });
        },
        expectedReason: "dry_run_blocked"
      },
      {
        name: "dry_run_invalid",
        mutate: async (repo: InMemoryRepository, outboxId: string) => {
          const plan = await repo.getReactionDispatchInternalOutboxAttemptPlan(outboxId);
          if (plan) await repo.setReactionDispatchInternalOutboxAttemptPlan({ ...plan, attempt_plan_status: "plan_expired", updated_at: new Date().toISOString() });
        },
        expectedReason: "dry_run_invalid"
      },
      {
        name: "dry_run_superseded",
        mutate: async (repo: InMemoryRepository, outboxId: string) => {
          const plan = await repo.getReactionDispatchInternalOutboxAttemptPlan(outboxId);
          if (plan) await repo.setReactionDispatchInternalOutboxAttemptPlan({ ...plan, attempt_plan_status: "plan_superseded", updated_at: new Date().toISOString() });
        },
        expectedReason: "dry_run_superseded"
      },
      {
        name: "external_delivery_status",
        mutate: async (repo: InMemoryRepository, outboxId: string) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(outboxId);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, external_delivery_status: "delivered" as never, updated_at: new Date().toISOString() });
        },
        expectedReason: "state_transition_blocked"
      },
      {
        name: "adapter_execution_status",
        mutate: async (repo: InMemoryRepository, outboxId: string) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(outboxId);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, adapter_execution_status: "executed" as never, updated_at: new Date().toISOString() });
        },
        expectedReason: "state_transition_blocked"
      },
      {
        name: "dispatch_attempt_count",
        mutate: async (repo: InMemoryRepository, outboxId: string) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(outboxId);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, dispatch_attempt_count: 1, updated_at: new Date().toISOString() });
        },
        expectedReason: "dispatch_attempt_count_not_zero"
      }
    ] as const;

    for (const testCase of cases) {
      const repo = new InMemoryRepository();
      const app = buildServer(repo);
      await app.ready();
      const { support, outbox, plan } = await createDryRunBoundary(app, `dry_run_approval_${testCase.name}`);
      await testCase.mutate(repo, outbox.outbox_id);
      const before = {
        support: await repo.getSupportEventById(support.event_id),
        outbox: await repo.getReactionDispatchInternalOutbox(outbox.outbox_id),
        lease: await repo.getReactionDispatchInternalOutboxLease(outbox.outbox_id),
        plan: await repo.getReactionDispatchInternalOutboxAttemptPlan(outbox.outbox_id),
        reaction: repo.reactionRequests.size,
        overlay: repo.overlayEvents.size,
        externalOutbox: repo.outboxEvents.size
      };

      const currentDryRun = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/dry-run-boundaries?plan_id=${plan.plan_id}&limit=1`, headers: { authorization: adminAuth } });
      expect(currentDryRun.statusCode).toBe(200);
      const currentDryRunBoundaryId = currentDryRun.json().dry_run_boundaries[0].dry_run_boundary_id;
      const response = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${currentDryRunBoundaryId}/approve`, headers: { authorization: adminAuth } });

      expect(response.statusCode, testCase.name).toBe(409);
      expect(response.json().approval.safe_reason_codes).toContain(testCase.expectedReason);
      expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
      expect(await repo.getReactionDispatchInternalOutbox(outbox.outbox_id)).toEqual(before.outbox);
      expect(await repo.getReactionDispatchInternalOutboxLease(outbox.outbox_id)).toEqual(before.lease);
      expect(await repo.getReactionDispatchInternalOutboxAttemptPlan(outbox.outbox_id)).toEqual(before.plan);
      expect(repo.reactionRequests.size).toBe(before.reaction);
      expect(repo.overlayEvents.size).toBe(before.overlay);
      expect(repo.outboxEvents.size).toBe(before.externalOutbox);
      expect(dryRunApprovalAuditLogs(repo)).toHaveLength(0);
      expectDryRunApprovalSafe(response.json());
      await app.close();
    }
  }, 60_000);

  it("fail-closes reject after approval", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { dryRun } = await createDryRunBoundary(app, "dry_run_reject_after_approve");

    const approval = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/approve`, headers: { authorization: adminAuth } });
    const rejection = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/reject`, headers: { authorization: adminAuth } });

    expect(approval.statusCode).toBe(200);
    expect(rejection.statusCode).toBe(409);
    expect(rejection.json().approval.approval_status).toBe("approved_for_adapter_execution");
    expect(rejection.json().approval.safe_reason_codes).toEqual(["state_transition_blocked", "external_execution_forbidden"]);
    expect(dryRunApprovalAuditLogs(repo)).toHaveLength(1);
    expectDryRunApprovalSafe(rejection.json());

    await app.close();
  }, 20_000);

  it("committed dry-run approval gate evidence preserves no-execution boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-reaction-dispatch-dry-run-approval-gate.json");

    expect(evidence.adminReactionDispatchDryRunApprovalGateStatus).toBe("implemented");
    expect(evidence.dryRunApprovalStatus).toBe("pass");
    expect(evidence.dryRunRejectionStatus).toBe("pass");
    expect(evidence.dryRunApprovalIdempotencyStatus).toBe("pass");
    expect(evidence.dryRunApprovalStateGuardStatus).toBe("pass");
    expect(evidence.adapterKindAllowlistStatus).toBe("pass");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.readOnlySupportEventStatus).toBe("pass");
    expect(evidence.readOnlyOutboxStatus).toBe("pass");
    expect(evidence.readOnlyLeaseStatus).toBe("pass");
    expect(evidence.readOnlyAttemptPlanStatus).toBe("pass");
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
    expect(evidence.adapterUrlExcluded).toBe(true);
    expect(evidence.webhookUrlExcluded).toBe(true);
    expect(evidence.headersExcluded).toBe(true);
    expect(evidence.tokensExcluded).toBe(true);
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
    expect(evidence.irisCoreCallUsed).toBe(false);
    expect(evidence.voxweaveCallUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
