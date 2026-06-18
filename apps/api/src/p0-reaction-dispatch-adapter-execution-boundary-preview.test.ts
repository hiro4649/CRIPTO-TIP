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

function previewUrl(dryRunBoundaryId: string) {
  return `/admin/reaction-dispatch/dry-run-boundaries/${dryRunBoundaryId}/adapter-execution-boundary-preview`;
}

async function expectPreviewBlocked(app: ReturnType<typeof buildServer>, dryRunBoundaryId: string, expectedReason: string) {
  const response = await app.inject({ method: "POST", url: previewUrl(dryRunBoundaryId), headers: { authorization: adminAuth } });
  expect(response.statusCode).toBe(409);
  expect(response.json().adapter_execution_boundary_preview.preview_status).toBe("adapter_execution_boundary_preview_blocked");
  expect(response.json().adapter_execution_boundary_preview.safe_reason_codes).toContain(expectedReason);
  expectPreviewSafe(response.json());
}

async function createReadyAdapterExecutionPreview(app: ReturnType<typeof buildServer>, requestId = "adapter_execution_approval") {
  const fixture = await createApprovedDryRunBoundary(app, requestId);
  const response = await app.inject({
    method: "POST",
    url: previewUrl(fixture.dryRun.dry_run_boundary_id),
    headers: { authorization: adminAuth }
  });
  expect(response.statusCode).toBe(200);
  return { ...fixture, preview: response.json().adapter_execution_boundary_preview };
}

function approvalUrl(dryRunBoundaryId: string, action: "approve" | "reject" | "approval" = "approve") {
  const base = `/admin/reaction-dispatch/adapter-execution-boundary-previews/${dryRunBoundaryId}`;
  return action === "approval" ? `${base}/approval` : `${base}/${action}`;
}

function approvalPayload(preview: Record<string, string>) {
  return {
    adapter_execution_boundary_preview_id: preview.adapter_execution_boundary_preview_id,
    request_envelope_hash: preview.request_envelope_hash,
    safe_context_hash: preview.safe_context_hash,
    constraints_hash: preview.constraints_hash,
    request_preview_hash: preview.request_preview_hash
  };
}

function simulationUrl(dryRunBoundaryId: string) {
  return `/admin/reaction-dispatch/adapter-execution-boundary-previews/${dryRunBoundaryId}/simulate`;
}

async function createApprovedAdapterExecutionBoundary(app: ReturnType<typeof buildServer>, requestId = "adapter_execution_simulation") {
  const fixture = await createReadyAdapterExecutionPreview(app, requestId);
  const approval = await app.inject({
    method: "POST",
    url: approvalUrl(fixture.dryRun.dry_run_boundary_id),
    headers: { authorization: adminAuth },
    payload: approvalPayload(fixture.preview)
  });
  expect(approval.statusCode).toBe(200);
  return { ...fixture, approval: approval.json().approval };
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
  expect(serialized).not.toContain("request_body");
  expect(serialized).not.toContain("raw_lease_token");
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
    const { support, outbox, lease, plan, dryRun, dryRunApproval } = await createApprovedDryRunBoundary(app);
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

    const response = await app.inject({ method: "POST", url: previewUrl(dryRun.dry_run_boundary_id), headers: { authorization: adminAuth } });
    const duplicate = await app.inject({ method: "POST", url: previewUrl(dryRun.dry_run_boundary_id), headers: { authorization: adminAuth } });

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
    expect(response.json().adapter_execution_boundary_preview.snapshot_at).toBe(dryRunApproval.updated_at);
    expect(response.json().adapter_execution_boundary_preview.derived_from_approval_at).toBe(dryRunApproval.approved_at);
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
    const unapprovedResponse = await unapprovedApp.inject({ method: "POST", url: previewUrl(unapproved.dryRun.dry_run_boundary_id), headers: { authorization: adminAuth } });
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
    const rejectedPreview = await rejectedApp.inject({ method: "POST", url: previewUrl(rejected.dryRun.dry_run_boundary_id), headers: { authorization: adminAuth } });
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
    const drifted = await driftApp.inject({ method: "POST", url: previewUrl(drift.dryRun.dry_run_boundary_id), headers: { authorization: adminAuth } });
    expect(drifted.statusCode).toBe(409);
    expect(drifted.json().adapter_execution_boundary_preview.safe_reason_codes).toContain("unsafe_context");
    expectPreviewSafe(drifted.json());
    await driftApp.close();
  }, 60_000);

  it("blocks lease, outbox, adapter, and approval snapshot drift without mutation", async () => {
    const cases: Array<{
      name: string;
      reason: string;
      mutate: (repo: InMemoryRepository, fixture: Awaited<ReturnType<typeof createApprovedDryRunBoundary>>) => Promise<void> | void;
    }> = [
      {
        name: "expired lease",
        reason: "lease_required",
        mutate: (repo, fixture) => {
          repo.reactionDispatchInternalOutboxLeases.set(fixture.outbox.outbox_id, {
          ...fixture.lease,
          lease_status: "leased_internal",
          lease_expires_at: "2000-01-01T00:00:00.000Z"
          });
        }
      },
      {
        name: "released lease",
        reason: "lease_required",
        mutate: (repo, fixture) => {
          repo.reactionDispatchInternalOutboxLeases.set(fixture.outbox.outbox_id, {
          ...fixture.lease,
          lease_status: "lease_released"
          });
        }
      },
      {
        name: "cancelled outbox",
        reason: "dry_run_invalid",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, outbox_status: "cancelled_internal" });
        }
      },
      {
        name: "blocked outbox",
        reason: "dry_run_not_ready",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, outbox_status: "blocked_internal" });
        }
      },
      {
        name: "dispatch attempt drift",
        reason: "dispatch_attempt_count_not_zero",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, dispatch_attempt_count: 1 });
        }
      },
      {
        name: "external delivery drift",
        reason: "state_transition_blocked",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, external_delivery_status: "attempted" as "not_attempted" });
        }
      },
      {
        name: "adapter execution drift",
        reason: "state_transition_blocked",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, adapter_execution_status: "executed" as "not_executed" });
        }
      },
      {
        name: "unknown adapter",
        reason: "adapter_kind_not_allowed",
        mutate: (repo, fixture) => {
          repo.reactionDispatchDryRunApprovals.set(fixture.dryRun.dry_run_boundary_id, {
          ...fixture.dryRunApproval,
          adapter_kind: "unknown_adapter" as "iris_core_reaction"
          });
        }
      },
      {
        name: "approval safe context hash mismatch",
        reason: "unsafe_context",
        mutate: (repo, fixture) => {
          repo.reactionDispatchDryRunApprovals.set(fixture.dryRun.dry_run_boundary_id, {
          ...fixture.dryRunApproval,
          safe_context_hash: "mismatched_safe_context_hash"
          });
        }
      },
      {
        name: "request preview hash mismatch",
        reason: "unsafe_context",
        mutate: (repo, fixture) => {
          repo.reactionDispatchDryRunApprovals.set(fixture.dryRun.dry_run_boundary_id, {
          ...fixture.dryRunApproval,
          request_preview_hash: "mismatched_request_preview_hash"
          });
        }
      },
      {
        name: "constraints hash mismatch",
        reason: "unsafe_context",
        mutate: (repo, fixture) => {
          repo.reactionDispatchDryRunApprovals.set(fixture.dryRun.dry_run_boundary_id, {
          ...fixture.dryRunApproval,
          constraints_hash: "mismatched_constraints_hash"
          });
        }
      }
    ];

    for (const testCase of cases) {
      const repo = new InMemoryRepository();
      const app = buildServer(repo);
      await app.ready();
      const fixture = await createApprovedDryRunBoundary(app, `adapter_execution_${testCase.name.replaceAll(" ", "_")}`);
      const auditCount = repo.auditLogs.length;

      await testCase.mutate(repo, fixture);
      await expectPreviewBlocked(app, fixture.dryRun.dry_run_boundary_id, testCase.reason);
      expect(repo.auditLogs).toHaveLength(auditCount);
      await app.close();
    }
  }, 120_000);

  it("lists and details adapter execution boundary preview review entries read-only", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const ready = await createApprovedDryRunBoundary(app, "adapter_execution_review_ready");
    const blocked = await createApprovedDryRunBoundary(app, "adapter_execution_review_blocked");
    const blockedOutbox = await repo.getReactionDispatchInternalOutbox(blocked.outbox.outbox_id);
    if (blockedOutbox) await repo.updateReactionDispatchInternalOutbox({ ...blockedOutbox, dispatch_attempt_count: 1 });
    const before = {
      supportReady: await repo.getSupportEventById(ready.support.event_id),
      supportBlocked: await repo.getSupportEventById(blocked.support.event_id),
      readyOutbox: await repo.getReactionDispatchInternalOutbox(ready.outbox.outbox_id),
      blockedOutbox: await repo.getReactionDispatchInternalOutbox(blocked.outbox.outbox_id),
      readyLease: await repo.getReactionDispatchInternalOutboxLease(ready.outbox.outbox_id),
      blockedLease: await repo.getReactionDispatchInternalOutboxLease(blocked.outbox.outbox_id),
      auditCount: repo.auditLogs.length
    };

    const list = await app.inject({
      method: "GET",
      url: "/admin/reaction-dispatch/adapter-execution-boundary-previews",
      headers: { authorization: adminAuth }
    });
    const readyOnly = await app.inject({
      method: "GET",
      url: "/admin/reaction-dispatch/adapter-execution-boundary-previews?preview_status=adapter_execution_boundary_preview_ready",
      headers: { authorization: adminAuth }
    });
    const detail = await app.inject({
      method: "GET",
      url: `/admin/reaction-dispatch/adapter-execution-boundary-previews/${ready.dryRun.dry_run_boundary_id}`,
      headers: { authorization: adminAuth }
    });

    expect(list.statusCode).toBe(200);
    expect(list.json().review_entries).toHaveLength(2);
    expect(list.json().review_summary).toEqual({ ready: 1, blocked: 1 });
    expect(readyOnly.statusCode).toBe(200);
    expect(readyOnly.json().review_entries).toHaveLength(1);
    expect(readyOnly.json().review_entries[0].dry_run_boundary_id).toBe(ready.dryRun.dry_run_boundary_id);
    expect(detail.statusCode).toBe(200);
    expect(detail.json().review_entry.preview_status).toBe("adapter_execution_boundary_preview_ready");
    expect(detail.json().review_entry.adapter_execution_boundary_preview_id).toMatch(/^rdexecprev_[a-f0-9]{24}$/);
    expectPreviewSafe(list.json());
    expectPreviewSafe(detail.json());
    expect(await repo.getSupportEventById(ready.support.event_id)).toEqual(before.supportReady);
    expect(await repo.getSupportEventById(blocked.support.event_id)).toEqual(before.supportBlocked);
    expect(await repo.getReactionDispatchInternalOutbox(ready.outbox.outbox_id)).toEqual(before.readyOutbox);
    expect(await repo.getReactionDispatchInternalOutbox(blocked.outbox.outbox_id)).toEqual(before.blockedOutbox);
    expect(await repo.getReactionDispatchInternalOutboxLease(ready.outbox.outbox_id)).toEqual(before.readyLease);
    expect(await repo.getReactionDispatchInternalOutboxLease(blocked.outbox.outbox_id)).toEqual(before.blockedLease);
    expect(repo.auditLogs).toHaveLength(before.auditCount);

    await app.close();
  }, 60_000);

  it("committed adapter execution boundary preview evidence preserves no-execution boundaries", () => {
    const evidence = readCodexEvidence("p0-reaction-dispatch-adapter-execution-boundary-preview.json");

    expect(evidence.reactionDispatchAdapterExecutionBoundaryPreviewStatus).toBe("implemented");
    expect(evidence.approvedDryRunBoundaryRequiredStatus).toBe("pass");
    expect(evidence.adapterExecutionBoundaryPreviewStatus).toBe("pass");
    expect(evidence.approvalSnapshotBindingStatus).toBe("pass");
    expect(evidence.leaseValidityGuardStatus).toBe("pass");
    expect(evidence.outboxLifecycleGuardStatus).toBe("pass");
    expect(evidence.adapterAllowlistFailClosedStatus).toBe("pass");
    expect(evidence.deterministicPreviewStatus).toBe("pass");
    expect(evidence.mutationFreeDuplicatePreviewStatus).toBe("pass");
    expect(evidence.timestampSemanticsStatus).toBe("pass");
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

  it("committed adapter execution boundary review surface evidence preserves read-only boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-adapter-execution-boundary-review-surface.json");

    expect(evidence.adminAdapterExecutionBoundaryReviewSurfaceStatus).toBe("implemented");
    expect(evidence.listEndpointStatus).toBe("pass");
    expect(evidence.detailEndpointStatus).toBe("pass");
    expect(evidence.readOnlyStatus).toBe("pass");
    expect(evidence.readyPreviewReviewStatus).toBe("pass");
    expect(evidence.blockedPreviewReviewStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.noAdapterExecutionStatus).toBe("pass");
    expect(evidence.noExternalOutboxDispatchStatus).toBe("pass");
    expect(evidence.noSupportEventMutationStatus).toBe("pass");
    expect(evidence.noOutboxMutationStatus).toBe("pass");
    expect(evidence.noLeaseMutationStatus).toBe("pass");
    expect(evidence.noAttemptPlanMutationStatus).toBe("pass");
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });

  it("committed adapter execution boundary approval gate evidence preserves local-only boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-adapter-execution-boundary-approval-gate.json");

    expect(evidence.adminAdapterExecutionBoundaryApprovalGateStatus).toBe("implemented");
    expect(evidence.approvalSnapshotBindingStatus).toBe("pass");
    expect(evidence.previewIdBindingStatus).toBe("pass");
    expect(evidence.requestEnvelopeHashBindingStatus).toBe("pass");
    expect(evidence.leaseGuardStatus).toBe("pass");
    expect(evidence.outboxGuardStatus).toBe("pass");
    expect(evidence.candidateGuardStatus).toBe("pass");
    expect(evidence.adapterKindAllowlistStatus).toBe("pass");
    expect(evidence.approvalIdempotencyStatus).toBe("pass");
    expect(evidence.rejectionIdempotencyStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.auditSafeMetadataStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.noReactionExecutionStatus).toBe("pass");
    expect(evidence.noOverlayExecutionStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.privateUrlExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.irisCoreCallUsed).toBe(false);
    expect(evidence.voxweaveCallUsed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });

  it.each([
    ["success", "simulated_success", "simulation_success"],
    ["retryable_failure", "simulated_retryable_failure", "simulation_retryable_failure"],
    ["terminal_failure", "simulated_terminal_failure", "simulation_terminal_failure"]
  ] as const)("simulates local adapter %s without external execution or state mutation", async (simulationCase, expectedStatus, expectedReason) => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const fixture = await createApprovedAdapterExecutionBoundary(app, `adapter_execution_sim_${simulationCase}`);
    const before = {
      support: await repo.getSupportEventById(fixture.support.event_id),
      outbox: await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id),
      lease: await repo.getReactionDispatchInternalOutboxLease(fixture.outbox.outbox_id),
      plan: await repo.getReactionDispatchInternalOutboxAttemptPlan(fixture.outbox.outbox_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      externalOutbox: repo.outboxEvents.size,
      auditCount: repo.auditLogs.length
    };

    const response = await app.inject({
      method: "POST",
      url: simulationUrl(fixture.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: { simulation_case: simulationCase }
    });
    const duplicate = await app.inject({
      method: "POST",
      url: simulationUrl(fixture.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: { simulation_case: simulationCase }
    });

    expect(response.statusCode).toBe(200);
    expect(duplicate.statusCode).toBe(200);
    expect(duplicate.json().idempotent).toBe(true);
    expect(duplicate.json().simulation_result).toEqual(response.json().simulation_result);
    expect(response.json().simulation_result).toMatchObject({
      approval_id: fixture.approval.approval_id,
      adapter_execution_boundary_preview_id: fixture.preview.adapter_execution_boundary_preview_id,
      dry_run_boundary_id: fixture.dryRun.dry_run_boundary_id,
      plan_id: fixture.plan.plan_id,
      outbox_id: fixture.outbox.outbox_id,
      lease_id: fixture.lease.lease_id,
      candidate_id: fixture.candidate.candidate_id,
      support_event_id: fixture.support.event_id,
      adapter_kind: "iris_core_reaction",
      simulation_case: simulationCase,
      simulation_status: expectedStatus,
      simulation_attempt_count: 1
    });
    expect(response.json().simulation_result.simulation_result_id).toMatch(/^rdsim_[a-f0-9]{24}$/);
    expect(response.json().simulation_result.simulation_snapshot_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(response.json().simulation_result.safe_reason_codes).toContain(expectedReason);
    expect(response.json().simulation_result.safe_reason_codes).toContain("external_execution_forbidden");
    expect(response.json().side_effects).toMatchObject({
      external_adapter_execution: "skipped",
      external_outbox_dispatch: "skipped",
      iris_core_call: "skipped",
      support_event_mutation: "skipped"
    });

    const detail = await app.inject({
      method: "GET",
      url: `/admin/reaction-dispatch/simulation-results/${response.json().simulation_result.simulation_result_id}`,
      headers: { authorization: adminAuth }
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().simulation_result).toEqual(response.json().simulation_result);
    expect(await repo.getSupportEventById(fixture.support.event_id)).toEqual(before.support);
    expect(await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id)).toEqual(before.outbox);
    expect(await repo.getReactionDispatchInternalOutboxLease(fixture.outbox.outbox_id)).toEqual(before.lease);
    expect(await repo.getReactionDispatchInternalOutboxAttemptPlan(fixture.outbox.outbox_id)).toEqual(before.plan);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.externalOutbox);
    expect(repo.auditLogs).toHaveLength(before.auditCount);
    expectPreviewSafe(response.json());
    expectPreviewSafe(detail.json());

    await app.close();
  }, 60_000);

  it("blocks local adapter simulation when approval is missing, stale, or lifecycle drifted", async () => {
    const unapprovedApp = buildServer(new InMemoryRepository());
    await unapprovedApp.ready();
    const unapproved = await createReadyAdapterExecutionPreview(unapprovedApp, "adapter_execution_sim_unapproved");
    const unapprovedResponse = await unapprovedApp.inject({
      method: "POST",
      url: simulationUrl(unapproved.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: { simulation_case: "success" }
    });
    expect(unapprovedResponse.statusCode).toBe(409);
    expect(unapprovedResponse.json().simulation_result.simulation_status).toBe("simulated_blocked");
    expect(unapprovedResponse.json().simulation_result.safe_reason_codes).toContain("approval_required");
    expectPreviewSafe(unapprovedResponse.json());
    await unapprovedApp.close();

    const cases: Array<{
      name: string;
      reason: string;
      mutate: (repo: InMemoryRepository, fixture: Awaited<ReturnType<typeof createApprovedAdapterExecutionBoundary>>) => Promise<void> | void;
    }> = [
      {
        name: "expired lease",
        reason: "approval_snapshot_stale",
        mutate: (repo, fixture) => {
          repo.reactionDispatchInternalOutboxLeases.set(fixture.outbox.outbox_id, {
            ...fixture.lease,
            lease_status: "leased_internal",
            lease_expires_at: "2000-01-01T00:00:00.000Z"
          });
        }
      },
      {
        name: "cancelled outbox",
        reason: "approval_snapshot_stale",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, outbox_status: "cancelled_internal" });
        }
      },
      {
        name: "dispatch attempt drift",
        reason: "approval_snapshot_stale",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, dispatch_attempt_count: 1 });
        }
      },
      {
        name: "unknown adapter",
        reason: "approval_snapshot_stale",
        mutate: (repo, fixture) => {
          repo.reactionDispatchInternalOutboxAttemptPlans.set(fixture.outbox.outbox_id, {
            ...fixture.plan,
            planned_adapter_type: "future_internal_adapter" as "iris_core_reaction_dispatch"
          });
        }
      }
    ];

    for (const testCase of cases) {
      const repo = new InMemoryRepository();
      const app = buildServer(repo);
      await app.ready();
      const fixture = await createApprovedAdapterExecutionBoundary(app, `adapter_execution_sim_${testCase.name.replaceAll(" ", "_")}`);
      const beforeAuditCount = repo.auditLogs.length;

      await testCase.mutate(repo, fixture);
      const response = await app.inject({
        method: "POST",
        url: simulationUrl(fixture.dryRun.dry_run_boundary_id),
        headers: { authorization: adminAuth },
        payload: { simulation_case: "success" }
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().simulation_result.simulation_status).toBe("simulated_blocked");
      expect(response.json().simulation_result.safe_reason_codes).toContain(testCase.reason);
      expect(response.json().simulation_result.safe_reason_codes).toContain("external_execution_forbidden");
      expect(repo.auditLogs).toHaveLength(beforeAuditCount);
      expectPreviewSafe(response.json());
      await app.close();
    }
  }, 120_000);

  it("committed local adapter simulator evidence preserves local-only boundaries", () => {
    const evidence = readCodexEvidence("p0-reaction-dispatch-local-adapter-simulator.json");

    expect(evidence.reactionDispatchLocalAdapterSimulatorStatus).toBe("implemented");
    expect(evidence.approvedBoundaryRequiredStatus).toBe("pass");
    expect(evidence.simulatedSuccessStatus).toBe("pass");
    expect(evidence.simulatedRetryableFailureStatus).toBe("pass");
    expect(evidence.simulatedTerminalFailureStatus).toBe("pass");
    expect(evidence.idempotencyStatus).toBe("pass");
    expect(evidence.simulationAttemptCountIsolationStatus).toBe("pass");
    expect(evidence.dispatchAttemptCountUnchangedStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.noReactionExecutionStatus).toBe("pass");
    expect(evidence.noOverlayExecutionStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
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

  it("lists and filters local adapter simulation results read-only", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const success = await createApprovedAdapterExecutionBoundary(app, "adapter_execution_review_success");
    const retryable = await createApprovedAdapterExecutionBoundary(app, "adapter_execution_review_retryable");
    const terminal = await createApprovedAdapterExecutionBoundary(app, "adapter_execution_review_terminal");

    const successResponse = await app.inject({
      method: "POST",
      url: simulationUrl(success.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: { simulation_case: "success" }
    });
    const retryableResponse = await app.inject({
      method: "POST",
      url: simulationUrl(retryable.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: { simulation_case: "retryable_failure" }
    });
    const terminalResponse = await app.inject({
      method: "POST",
      url: simulationUrl(terminal.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: { simulation_case: "terminal_failure" }
    });
    expect(successResponse.statusCode).toBe(200);
    expect(retryableResponse.statusCode).toBe(200);
    expect(terminalResponse.statusCode).toBe(200);
    const before = {
      successSupport: await repo.getSupportEventById(success.support.event_id),
      retryableOutbox: await repo.getReactionDispatchInternalOutbox(retryable.outbox.outbox_id),
      terminalLease: await repo.getReactionDispatchInternalOutboxLease(terminal.outbox.outbox_id),
      auditCount: repo.auditLogs.length
    };

    const list = await app.inject({
      method: "GET",
      url: "/admin/reaction-dispatch/simulation-results",
      headers: { authorization: adminAuth }
    });
    const retryableOnly = await app.inject({
      method: "GET",
      url: "/admin/reaction-dispatch/simulation-results?simulation_case=retryable_failure&simulation_status=simulated_retryable_failure",
      headers: { authorization: adminAuth }
    });
    const supportFilter = await app.inject({
      method: "GET",
      url: `/admin/reaction-dispatch/simulation-results?support_event_id=${terminal.support.event_id}`,
      headers: { authorization: adminAuth }
    });
    const previewFilter = await app.inject({
      method: "GET",
      url: `/admin/reaction-dispatch/simulation-results?preview_id=${success.preview.adapter_execution_boundary_preview_id}&limit=1&offset=0`,
      headers: { authorization: adminAuth }
    });

    expect(list.statusCode).toBe(200);
    expect(retryableOnly.statusCode).toBe(200);
    expect(supportFilter.statusCode).toBe(200);
    expect(previewFilter.statusCode).toBe(200);
    expect(list.json().simulation_results).toHaveLength(3);
    expect(list.json().review_summary).toEqual({
      simulated_success: 1,
      simulated_retryable_failure: 1,
      simulated_terminal_failure: 1,
      simulated_blocked: 0
    });
    expect(retryableOnly.json().simulation_results).toHaveLength(1);
    expect(retryableOnly.json().simulation_results[0].simulation_result_id).toBe(retryableResponse.json().simulation_result.simulation_result_id);
    expect(supportFilter.json().simulation_results).toHaveLength(1);
    expect(supportFilter.json().simulation_results[0].simulation_result_id).toBe(terminalResponse.json().simulation_result.simulation_result_id);
    expect(previewFilter.json().simulation_results).toHaveLength(1);
    expect(previewFilter.json().page).toEqual({ limit: 1, offset: 0, total: 1 });
    expect(previewFilter.json().simulation_results[0].simulation_result_id).toBe(successResponse.json().simulation_result.simulation_result_id);
    expectPreviewSafe(list.json());
    expect(await repo.getSupportEventById(success.support.event_id)).toEqual(before.successSupport);
    expect(await repo.getReactionDispatchInternalOutbox(retryable.outbox.outbox_id)).toEqual(before.retryableOutbox);
    expect(await repo.getReactionDispatchInternalOutboxLease(terminal.outbox.outbox_id)).toEqual(before.terminalLease);
    expect(repo.auditLogs).toHaveLength(before.auditCount);

    await app.close();
  }, 80_000);

  it("committed simulation review surface evidence preserves read-only boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-reaction-dispatch-simulation-review-surface.json");

    expect(evidence.adminReactionDispatchSimulationReviewSurfaceStatus).toBe("implemented");
    expect(evidence.listEndpointStatus).toBe("pass");
    expect(evidence.detailEndpointStatus).toBe("pass");
    expect(evidence.filterStatus).toBe("pass");
    expect(evidence.paginationStatus).toBe("pass");
    expect(evidence.reviewSummaryStatus).toBe("pass");
    expect(evidence.readOnlyStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.noReactionExecutionStatus).toBe("pass");
    expect(evidence.noOverlayExecutionStatus).toBe("pass");
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });

  it("creates simulation failure DLQ entries idempotently without retry or external execution", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const retryable = await createApprovedAdapterExecutionBoundary(app, "adapter_execution_dlq_retryable");
    const terminal = await createApprovedAdapterExecutionBoundary(app, "adapter_execution_dlq_terminal");
    const success = await createApprovedAdapterExecutionBoundary(app, "adapter_execution_dlq_success");
    const retryableSimulation = await app.inject({
      method: "POST",
      url: simulationUrl(retryable.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: { simulation_case: "retryable_failure" }
    });
    const terminalSimulation = await app.inject({
      method: "POST",
      url: simulationUrl(terminal.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: { simulation_case: "terminal_failure" }
    });
    const successSimulation = await app.inject({
      method: "POST",
      url: simulationUrl(success.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: { simulation_case: "success" }
    });
    const before = {
      retryableOutbox: await repo.getReactionDispatchInternalOutbox(retryable.outbox.outbox_id),
      terminalLease: await repo.getReactionDispatchInternalOutboxLease(terminal.outbox.outbox_id),
      successSupport: await repo.getSupportEventById(success.support.event_id),
      auditCount: repo.auditLogs.length,
      reactionCount: repo.reactionRequests.size,
      overlayCount: repo.overlayEvents.size
    };

    const retryableDlq = await app.inject({
      method: "POST",
      url: `/admin/reaction-dispatch/simulation-results/${retryableSimulation.json().simulation_result.simulation_result_id}/dlq`,
      headers: { authorization: adminAuth }
    });
    const retryableDuplicate = await app.inject({
      method: "POST",
      url: `/admin/reaction-dispatch/simulation-results/${retryableSimulation.json().simulation_result.simulation_result_id}/dlq`,
      headers: { authorization: adminAuth }
    });
    const terminalDlq = await app.inject({
      method: "POST",
      url: `/admin/reaction-dispatch/simulation-results/${terminalSimulation.json().simulation_result.simulation_result_id}/dlq`,
      headers: { authorization: adminAuth }
    });
    const successBlocked = await app.inject({
      method: "POST",
      url: `/admin/reaction-dispatch/simulation-results/${successSimulation.json().simulation_result.simulation_result_id}/dlq`,
      headers: { authorization: adminAuth }
    });

    expect(retryableDlq.statusCode).toBe(200);
    expect(retryableDuplicate.statusCode).toBe(200);
    expect(terminalDlq.statusCode).toBe(200);
    expect(successBlocked.statusCode).toBe(409);
    expect(retryableDuplicate.json().idempotent).toBe(true);
    expect(retryableDuplicate.json().dlq_entry).toEqual(retryableDlq.json().dlq_entry);
    expect(retryableDlq.json().dlq_entry).toMatchObject({
      simulation_result_id: retryableSimulation.json().simulation_result.simulation_result_id,
      preview_id: retryable.preview.adapter_execution_boundary_preview_id,
      support_event_id: retryable.support.event_id,
      adapter_kind: "iris_core_reaction",
      failure_class: "retryable_failure",
      retry_eligibility: "retry_candidate"
    });
    expect(terminalDlq.json().dlq_entry).toMatchObject({
      simulation_result_id: terminalSimulation.json().simulation_result.simulation_result_id,
      failure_class: "terminal_failure",
      retry_eligibility: "not_retryable"
    });
    expect(retryableDlq.json().dlq_entry.dlq_id).toMatch(/^rdsimdlq_[a-f0-9]{24}$/);
    expect(retryableDlq.json().dlq_entry.safe_failure_fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(successBlocked.json().dlq_status.safe_reason_codes).toContain("simulation_success");

    const list = await app.inject({ method: "GET", url: "/admin/reaction-dispatch/simulation-dlq", headers: { authorization: adminAuth } });
    const retryableOnly = await app.inject({ method: "GET", url: "/admin/reaction-dispatch/simulation-dlq?failure_class=retryable_failure", headers: { authorization: adminAuth } });
    const detail = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/simulation-dlq/${retryableDlq.json().dlq_entry.dlq_id}`, headers: { authorization: adminAuth } });
    expect(list.statusCode).toBe(200);
    expect(retryableOnly.statusCode).toBe(200);
    expect(detail.statusCode).toBe(200);
    expect(list.json().dlq_entries).toHaveLength(2);
    expect(list.json().dlq_summary).toEqual({ retry_candidate: 1, not_retryable: 1 });
    expect(retryableOnly.json().dlq_entries).toHaveLength(1);
    expect(detail.json().dlq_entry).toEqual(retryableDlq.json().dlq_entry);
    expect(await repo.getReactionDispatchInternalOutbox(retryable.outbox.outbox_id)).toEqual(before.retryableOutbox);
    expect(await repo.getReactionDispatchInternalOutboxLease(terminal.outbox.outbox_id)).toEqual(before.terminalLease);
    expect(await repo.getSupportEventById(success.support.event_id)).toEqual(before.successSupport);
    expect(repo.auditLogs).toHaveLength(before.auditCount);
    expect(repo.reactionRequests.size).toBe(before.reactionCount);
    expect(repo.overlayEvents.size).toBe(before.overlayCount);
    expectPreviewSafe(retryableDlq.json());
    expectPreviewSafe(list.json());

    await app.close();
  }, 80_000);

  it("committed simulation failure DLQ evidence preserves no-retry boundaries", () => {
    const evidence = readCodexEvidence("p0-reaction-dispatch-simulation-failure-dlq.json");

    expect(evidence.reactionDispatchSimulationFailureDlqStatus).toBe("implemented");
    expect(evidence.retryableFailureDlqStatus).toBe("pass");
    expect(evidence.terminalFailureDlqStatus).toBe("pass");
    expect(evidence.successSimulationBlockedStatus).toBe("pass");
    expect(evidence.idempotencyStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.noRetryExecutionStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.noReactionExecutionStatus).toBe("pass");
    expect(evidence.noOverlayExecutionStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });

  it("local E2E fixture covers internal reaction dispatch lifecycle without external execution", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const success = await createApprovedAdapterExecutionBoundary(app, "local_e2e_success");
    const retryable = await createApprovedAdapterExecutionBoundary(app, "local_e2e_retryable");
    const terminal = await createApprovedAdapterExecutionBoundary(app, "local_e2e_terminal");
    const blocked = await createApprovedDryRunBoundary(app, "local_e2e_blocked");
    const before = {
      successSupport: await repo.getSupportEventById(success.support.event_id),
      successOutbox: await repo.getReactionDispatchInternalOutbox(success.outbox.outbox_id),
      retryableOutbox: await repo.getReactionDispatchInternalOutbox(retryable.outbox.outbox_id),
      terminalLease: await repo.getReactionDispatchInternalOutboxLease(terminal.outbox.outbox_id),
      reactionCount: repo.reactionRequests.size,
      overlayCount: repo.overlayEvents.size,
      externalOutboxCount: repo.outboxEvents.size
    };

    const attemptPlanReview = await app.inject({
      method: "GET",
      url: `/admin/reaction-dispatch/attempt-plans/${success.plan.plan_id}`,
      headers: { authorization: adminAuth }
    });
    const dryRunReview = await app.inject({
      method: "GET",
      url: `/admin/reaction-dispatch/dry-run-boundaries/${success.dryRun.dry_run_boundary_id}`,
      headers: { authorization: adminAuth }
    });
    const adapterReview = await app.inject({
      method: "GET",
      url: `/admin/reaction-dispatch/adapter-execution-boundary-previews/${success.dryRun.dry_run_boundary_id}`,
      headers: { authorization: adminAuth }
    });
    const successSimulation = await app.inject({
      method: "POST",
      url: simulationUrl(success.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: { simulation_case: "success" }
    });
    const successDuplicate = await app.inject({
      method: "POST",
      url: simulationUrl(success.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: { simulation_case: "success" }
    });
    const retryableSimulation = await app.inject({
      method: "POST",
      url: simulationUrl(retryable.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: { simulation_case: "retryable_failure" }
    });
    const terminalSimulation = await app.inject({
      method: "POST",
      url: simulationUrl(terminal.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: { simulation_case: "terminal_failure" }
    });
    const simulationReview = await app.inject({
      method: "GET",
      url: "/admin/reaction-dispatch/simulation-results",
      headers: { authorization: adminAuth }
    });
    const retryableDlq = await app.inject({
      method: "POST",
      url: `/admin/reaction-dispatch/simulation-results/${retryableSimulation.json().simulation_result.simulation_result_id}/dlq`,
      headers: { authorization: adminAuth }
    });
    const terminalDlq = await app.inject({
      method: "POST",
      url: `/admin/reaction-dispatch/simulation-results/${terminalSimulation.json().simulation_result.simulation_result_id}/dlq`,
      headers: { authorization: adminAuth }
    });
    const dlqReview = await app.inject({
      method: "GET",
      url: "/admin/reaction-dispatch/simulation-dlq",
      headers: { authorization: adminAuth }
    });
    const blockedOutbox = await repo.getReactionDispatchInternalOutbox(blocked.outbox.outbox_id);
    if (blockedOutbox) await repo.updateReactionDispatchInternalOutbox({ ...blockedOutbox, dispatch_attempt_count: 1 });
    const driftedPreview = await app.inject({
      method: "POST",
      url: previewUrl(blocked.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth }
    });

    expect(attemptPlanReview.statusCode).toBe(200);
    expect(dryRunReview.statusCode).toBe(200);
    expect(adapterReview.statusCode).toBe(200);
    expect(successSimulation.statusCode).toBe(200);
    expect(successDuplicate.statusCode).toBe(200);
    expect(successDuplicate.json().idempotent).toBe(true);
    expect(retryableSimulation.statusCode).toBe(200);
    expect(terminalSimulation.statusCode).toBe(200);
    expect(simulationReview.statusCode).toBe(200);
    expect(retryableDlq.statusCode).toBe(200);
    expect(terminalDlq.statusCode).toBe(200);
    expect(dlqReview.statusCode).toBe(200);
    expect(driftedPreview.statusCode).toBe(409);
    expect(successSimulation.json().simulation_result.simulation_status).toBe("simulated_success");
    expect(retryableSimulation.json().simulation_result.simulation_status).toBe("simulated_retryable_failure");
    expect(terminalSimulation.json().simulation_result.simulation_status).toBe("simulated_terminal_failure");
    expect(retryableDlq.json().dlq_entry.retry_eligibility).toBe("retry_candidate");
    expect(terminalDlq.json().dlq_entry.retry_eligibility).toBe("not_retryable");
    expect(simulationReview.json().simulation_results.length).toBeGreaterThanOrEqual(3);
    expect(dlqReview.json().dlq_entries.length).toBeGreaterThanOrEqual(2);
    for (const outboxId of [success.outbox.outbox_id, retryable.outbox.outbox_id, terminal.outbox.outbox_id]) {
      const outbox = await repo.getReactionDispatchInternalOutbox(outboxId);
      expect(outbox?.dispatch_attempt_count).toBe(0);
      expect(outbox?.external_delivery_status).toBe("not_attempted");
      expect(outbox?.adapter_execution_status).toBe("not_executed");
    }
    expect(await repo.getSupportEventById(success.support.event_id)).toEqual(before.successSupport);
    expect(await repo.getReactionDispatchInternalOutbox(success.outbox.outbox_id)).toEqual(before.successOutbox);
    expect(await repo.getReactionDispatchInternalOutbox(retryable.outbox.outbox_id)).toEqual(before.retryableOutbox);
    expect(await repo.getReactionDispatchInternalOutboxLease(terminal.outbox.outbox_id)).toEqual(before.terminalLease);
    expect(repo.reactionRequests.size).toBe(before.reactionCount);
    expect(repo.overlayEvents.size).toBe(before.overlayCount);
    expect(repo.outboxEvents.size).toBe(before.externalOutboxCount);
    expectPreviewSafe(successSimulation.json());
    expectPreviewSafe(simulationReview.json());
    expectPreviewSafe(dlqReview.json());

    await app.close();
  }, 120_000);

  it("committed local E2E fixture evidence preserves internal-only lifecycle boundaries", () => {
    const evidence = readCodexEvidence("p0-reaction-dispatch-local-e2e-fixture.json");

    expect(evidence.reactionDispatchLocalE2eFixtureStatus).toBe("implemented");
    expect(evidence.internalLifecycleCoverageStatus).toBe("pass");
    expect(evidence.successPathStatus).toBe("pass");
    expect(evidence.retryableFailurePathStatus).toBe("pass");
    expect(evidence.terminalFailurePathStatus).toBe("pass");
    expect(evidence.blockedPathStatus).toBe("pass");
    expect(evidence.idempotentDuplicatePathStatus).toBe("pass");
    expect(evidence.stateDriftPathStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.dispatchAttemptCountZeroStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.runtimeReadinessClaimed).toBe(false);
    expect(evidence.productionReadinessClaimed).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });

  it("admin adapter boundary approval requires admin auth and returns 404 for unknown preview", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();
    const payload = {
      adapter_execution_boundary_preview_id: "rdexecprev_missing",
      request_envelope_hash: "a".repeat(64),
      safe_context_hash: "safe",
      constraints_hash: "constraints",
      request_preview_hash: "request"
    };
    const url = approvalUrl("rddry_missing");

    expect((await app.inject({ method: "POST", url, payload })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url, headers: { authorization: "Bearer wrong-token" }, payload })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url, headers: { authorization: adminAuth }, payload })).statusCode).toBe(404);

    await app.close();
  });

  it("admin adapter boundary approval approves current ready snapshot and is idempotent", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const fixture = await createReadyAdapterExecutionPreview(app);
    const before = {
      support: await repo.getSupportEventById(fixture.support.event_id),
      outbox: await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id),
      lease: await repo.getReactionDispatchInternalOutboxLease(fixture.outbox.outbox_id),
      plan: await repo.getReactionDispatchInternalOutboxAttemptPlan(fixture.outbox.outbox_id),
      auditCount: repo.auditLogs.length
    };

    const response = await app.inject({
      method: "POST",
      url: approvalUrl(fixture.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: approvalPayload(fixture.preview)
    });
    const duplicate = await app.inject({
      method: "POST",
      url: approvalUrl(fixture.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: approvalPayload(fixture.preview)
    });
    const getApproval = await app.inject({
      method: "GET",
      url: approvalUrl(fixture.dryRun.dry_run_boundary_id, "approval"),
      headers: { authorization: adminAuth }
    });

    expect(response.statusCode).toBe(200);
    expect(duplicate.statusCode).toBe(200);
    expect(getApproval.statusCode).toBe(200);
    expect(response.json().approval).toMatchObject({
      adapter_execution_boundary_preview_id: fixture.preview.adapter_execution_boundary_preview_id,
      dry_run_boundary_id: fixture.dryRun.dry_run_boundary_id,
      approval_status: "approved_for_local_simulation",
      adapter_kind: "iris_core_reaction"
    });
    expect(response.json().approval.approval_id).toMatch(/^rdexecapproval_[a-f0-9]{24}$/);
    expect(response.json().approval.approval_snapshot_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(duplicate.json().idempotent).toBe(true);
    expect(duplicate.json().approval.safe_reason_codes).toContain("already_approved");
    expect(getApproval.json().approval.approval_status).toBe("approved_for_local_simulation");
    expect(repo.auditLogs).toHaveLength(before.auditCount + 1);
    expectPreviewSafe(response.json());
    expectPreviewSafe(getApproval.json());
    expect(await repo.getSupportEventById(fixture.support.event_id)).toEqual(before.support);
    expect(await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id)).toEqual(before.outbox);
    expect(await repo.getReactionDispatchInternalOutboxLease(fixture.outbox.outbox_id)).toEqual(before.lease);
    expect(await repo.getReactionDispatchInternalOutboxAttemptPlan(fixture.outbox.outbox_id)).toEqual(before.plan);

    await app.close();
  }, 20_000);

  it.each([
    ["adapter_execution_boundary_preview_id", "rdexecprev_ffffffffffffffffffffffff"],
    ["request_envelope_hash", "b".repeat(64)],
    ["safe_context_hash", "mismatched_safe_context"],
    ["constraints_hash", "mismatched_constraints"],
    ["request_preview_hash", "mismatched_request_preview"]
  ] as const)("admin adapter boundary approval blocks %s mismatch", async (field, value) => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();
    const fixture = await createReadyAdapterExecutionPreview(app, `adapter_execution_approval_${field}`);
    const payload = { ...approvalPayload(fixture.preview), [field]: value };

    const response = await app.inject({
      method: "POST",
      url: approvalUrl(fixture.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().approval.approval_status).toBe("approval_blocked");
    expect(response.json().approval.safe_reason_codes).toContain("preview_snapshot_mismatch");
    expectPreviewSafe(response.json());
    await app.close();
  }, 20_000);

  it("admin adapter boundary approval rejects and blocks reversal from approved", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();
    const rejected = await createReadyAdapterExecutionPreview(app, "adapter_execution_reject");
    const reject = await app.inject({
      method: "POST",
      url: approvalUrl(rejected.dryRun.dry_run_boundary_id, "reject"),
      headers: { authorization: adminAuth }
    });
    const rejectDuplicate = await app.inject({
      method: "POST",
      url: approvalUrl(rejected.dryRun.dry_run_boundary_id, "reject"),
      headers: { authorization: adminAuth }
    });
    const approveRejected = await app.inject({
      method: "POST",
      url: approvalUrl(rejected.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: approvalPayload(rejected.preview)
    });

    expect(reject.statusCode).toBe(200);
    expect(reject.json().approval.approval_status).toBe("rejected_by_admin");
    expect(rejectDuplicate.json().idempotent).toBe(true);
    expect(approveRejected.statusCode).toBe(409);

    const approved = await createReadyAdapterExecutionPreview(app, "adapter_execution_approved_reversal");
    const approve = await app.inject({
      method: "POST",
      url: approvalUrl(approved.dryRun.dry_run_boundary_id),
      headers: { authorization: adminAuth },
      payload: approvalPayload(approved.preview)
    });
    const rejectApproved = await app.inject({
      method: "POST",
      url: approvalUrl(approved.dryRun.dry_run_boundary_id, "reject"),
      headers: { authorization: adminAuth }
    });
    expect(approve.statusCode).toBe(200);
    expect(rejectApproved.statusCode).toBe(409);
    expectPreviewSafe(rejectApproved.json());

    await app.close();
  }, 30_000);

  it("admin adapter boundary approval blocks lifecycle drift before local simulation approval", async () => {
    const cases: Array<{
      name: string;
      reason: string;
      mutate: (repo: InMemoryRepository, fixture: Awaited<ReturnType<typeof createReadyAdapterExecutionPreview>>) => Promise<void> | void;
    }> = [
      {
        name: "expired lease",
        reason: "lease_expired",
        mutate: (repo, fixture) => {
          repo.reactionDispatchInternalOutboxLeases.set(fixture.outbox.outbox_id, {
            ...fixture.lease,
            lease_status: "leased_internal",
            lease_expires_at: "2000-01-01T00:00:00.000Z"
          });
        }
      },
      {
        name: "released lease",
        reason: "lease_released",
        mutate: (repo, fixture) => {
          repo.reactionDispatchInternalOutboxLeases.set(fixture.outbox.outbox_id, {
            ...fixture.lease,
            lease_status: "lease_released"
          });
        }
      },
      {
        name: "cancelled outbox",
        reason: "outbox_not_queued",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, outbox_status: "cancelled_internal" });
        }
      },
      {
        name: "nonqueued outbox",
        reason: "outbox_not_queued",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, outbox_status: "pending_internal_dispatch" });
        }
      },
      {
        name: "external delivery drift",
        reason: "external_delivery_already_attempted",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, external_delivery_status: "attempted" as "not_attempted" });
        }
      },
      {
        name: "adapter execution drift",
        reason: "adapter_already_executed",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, adapter_execution_status: "executed" as "not_executed" });
        }
      },
      {
        name: "nonzero dispatch attempts",
        reason: "dispatch_attempt_count_nonzero",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, dispatch_attempt_count: 1 });
        }
      },
      {
        name: "candidate drift",
        reason: "candidate_not_approved",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, candidate_status: "candidate_blocked" });
        }
      },
      {
        name: "boundary drift",
        reason: "outbox_not_queued",
        mutate: async (repo, fixture) => {
          const outbox = await repo.getReactionDispatchInternalOutbox(fixture.outbox.outbox_id);
          if (outbox) await repo.updateReactionDispatchInternalOutbox({ ...outbox, outbox_status: "superseded_internal" });
        }
      },
      {
        name: "future internal adapter",
        reason: "adapter_kind_not_supported_for_simulation",
        mutate: (repo, fixture) => {
          repo.reactionDispatchInternalOutboxAttemptPlans.set(fixture.outbox.outbox_id, {
            ...fixture.plan,
            planned_adapter_type: "future_internal_adapter" as "iris_core_reaction_dispatch"
          });
        }
      }
    ];

    for (const testCase of cases) {
      const repo = new InMemoryRepository();
      const app = buildServer(repo);
      await app.ready();
      const fixture = await createReadyAdapterExecutionPreview(app, `adapter_execution_approval_${testCase.name.replaceAll(" ", "_")}`);
      const beforeAuditCount = repo.auditLogs.length;

      await testCase.mutate(repo, fixture);
      const response = await app.inject({
        method: "POST",
        url: approvalUrl(fixture.dryRun.dry_run_boundary_id),
        headers: { authorization: adminAuth },
        payload: approvalPayload(fixture.preview)
      });

      expect(response.statusCode).toBe(409);
      expect(response.json().approval.safe_reason_codes).toContain(testCase.reason);
      expect(repo.auditLogs).toHaveLength(beforeAuditCount);
      expectPreviewSafe(response.json());
      await app.close();
    }
  }, 120_000);
});
