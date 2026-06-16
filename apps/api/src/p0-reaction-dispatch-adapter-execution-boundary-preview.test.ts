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

async function createApprovedDryRunBoundary(app: ReturnType<typeof buildServer>, requestId = "adapter_execution_preview") {
  const supportResponse = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: requestId,
      stream_id: `str_${requestId}`,
      character_id: "char_mio",
      display_name: "adapter execution preview viewer",
      tier: "medium",
      message: "adapter execution preview raw message 0x1111111111111111111111111111111111111111 https://private.example/hook adapter_url webhook_url Authorization Bearer secret token",
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
  const dryRun = dryRunResponse.json().dry_run_boundary;
  const dryRunApprovalResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/approve`, headers: { authorization: adminAuth } });
  expect(dryRunApprovalResponse.statusCode).toBe(200);
  return { support, candidate, boundary, outbox, lease, plan, dryRun, dryRunApproval: dryRunApprovalResponse.json().approval };
}

function expectPreviewSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("adapter execution preview raw message");
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

describe("P0 reaction dispatch adapter execution boundary preview", () => {
  it("requires admin auth and returns 404 for unknown dry-run boundary", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    const url = "/admin/reaction-dispatch/dry-run-boundaries/rddry_missing/adapter-execution-boundary-preview";
    expect((await app.inject({ method: "POST", url })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url, headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url, headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("creates safe preview from approved dry-run boundary without execution or mutation", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, outbox, lease, plan, dryRun } = await createApprovedDryRunBoundary(app);
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      outbox: await repo.getReactionDispatchInternalOutbox(outbox.outbox_id),
      lease: await repo.getReactionDispatchInternalOutboxLease(outbox.outbox_id),
      plan: await repo.getReactionDispatchInternalOutboxAttemptPlan(outbox.outbox_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      externalOutbox: repo.outboxEvents.size,
      approvalAudits: repo.auditLogs.filter((log) => log.target_type === "reaction_dispatch_dry_run_boundary").length
    };

    const response = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/adapter-execution-boundary-preview`, headers: { authorization: adminAuth } });
    const duplicate = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/adapter-execution-boundary-preview`, headers: { authorization: adminAuth } });

    expect(response.statusCode).toBe(200);
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json()).toEqual(response.json());
    expect(response.json().adapter_execution_boundary_preview).toMatchObject({
      dry_run_boundary_id: dryRun.dry_run_boundary_id,
      plan_id: plan.plan_id,
      outbox_id: outbox.outbox_id,
      lease_id: lease.lease_id,
      support_event_id: support.event_id,
      adapter_kind: "iris_core_reaction",
      approval_status: "approved_for_adapter_execution",
      preview_status: "adapter_execution_boundary_preview_ready",
      execution_mode: "preview_only",
      external_delivery_status: "not_attempted",
      adapter_execution_status: "not_executed",
      dispatch_attempt_count: 0
    });
    expect(response.json().adapter_execution_boundary_preview.adapter_execution_boundary_preview_id).toMatch(/^rdexecprev_[a-f0-9]{24}$/);
    expect(response.json().adapter_execution_boundary_preview.request_envelope_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(await repo.getReactionDispatchInternalOutbox(outbox.outbox_id)).toEqual(before.outbox);
    expect(await repo.getReactionDispatchInternalOutboxLease(outbox.outbox_id)).toEqual(before.lease);
    expect(await repo.getReactionDispatchInternalOutboxAttemptPlan(outbox.outbox_id)).toEqual(before.plan);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.externalOutbox);
    expect(repo.auditLogs.filter((log) => log.target_type === "reaction_dispatch_dry_run_boundary")).toHaveLength(before.approvalAudits);
    expectPreviewSafe(response.json());

    await app.close();
  }, 20_000);

  it("blocks unapproved, rejected, and drifted dry-run boundaries", async () => {
    const unapprovedRepo = new InMemoryRepository();
    const unapprovedApp = buildServer(unapprovedRepo);
    await unapprovedApp.ready();
    const unapproved = await createApprovedDryRunBoundary(unapprovedApp, "adapter_execution_unapproved");
    unapprovedRepo.reactionDispatchDryRunApprovals.clear();
    const unapprovedResponse = await unapprovedApp.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${unapproved.dryRun.dry_run_boundary_id}/adapter-execution-boundary-preview`, headers: { authorization: adminAuth } });
    expect(unapprovedResponse.statusCode).toBe(409);
    expect(unapprovedResponse.json().adapter_execution_boundary_preview.preview_status).toBe("adapter_execution_boundary_preview_blocked");
    expectPreviewSafe(unapprovedResponse.json());
    await unapprovedApp.close();

    const rejectedRepo = new InMemoryRepository();
    const rejectedApp = buildServer(rejectedRepo);
    await rejectedApp.ready();
    const rejected = await createApprovedDryRunBoundary(rejectedApp, "adapter_execution_rejected");
    rejectedRepo.reactionDispatchDryRunApprovals.clear();
    const rejectResponse = await rejectedApp.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${rejected.dryRun.dry_run_boundary_id}/reject`, headers: { authorization: adminAuth } });
    expect(rejectResponse.statusCode).toBe(200);
    const rejectedPreview = await rejectedApp.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${rejected.dryRun.dry_run_boundary_id}/adapter-execution-boundary-preview`, headers: { authorization: adminAuth } });
    expect(rejectedPreview.statusCode).toBe(409);
    expect(rejectedPreview.json().adapter_execution_boundary_preview.approval_status).toBe("rejected_by_admin");
    expectPreviewSafe(rejectedPreview.json());
    await rejectedApp.close();

    const driftRepo = new InMemoryRepository();
    const driftApp = buildServer(driftRepo);
    await driftApp.ready();
    const drift = await createApprovedDryRunBoundary(driftApp, "adapter_execution_drift");
    const outbox = await driftRepo.getReactionDispatchInternalOutbox(drift.outbox.outbox_id);
    if (outbox) await driftRepo.updateReactionDispatchInternalOutbox({ ...outbox, candidate_status: "candidate_blocked", updated_at: new Date().toISOString() });
    const drifted = await driftApp.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${drift.dryRun.dry_run_boundary_id}/adapter-execution-boundary-preview`, headers: { authorization: adminAuth } });
    expect(drifted.statusCode).toBe(409);
    expect(drifted.json().adapter_execution_boundary_preview.safe_reason_codes).toContain("unsafe_context");
    expectPreviewSafe(drifted.json());
    await driftApp.close();
  }, 60_000);

  it("committed adapter execution boundary preview evidence preserves no-execution boundaries", () => {
    const evidence = readCodexEvidence("p0-reaction-dispatch-adapter-execution-boundary-preview.json");

    expect(evidence.reactionDispatchAdapterExecutionBoundaryPreviewStatus).toBe("implemented");
    expect(evidence.approvedDryRunBoundaryRequiredStatus).toBe("pass");
    expect(evidence.adapterExecutionBoundaryPreviewStatus).toBe("pass");
    expect(evidence.noAdapterExecutionStatus).toBe("pass");
    expect(evidence.noExternalOutboxDispatchStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
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
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
