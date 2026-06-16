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

async function createReviewedAttemptPlan(app: ReturnType<typeof buildServer>, requestId = "attempt_plan_review") {
  const supportResponse = await app.inject({
    method: "POST",
    url: "/admin/support-events/manual",
    headers: { authorization: adminAuth },
    payload: {
      request_id: requestId,
      stream_id: `str_${requestId}`,
      character_id: "char_mio",
      display_name: "attempt plan review viewer",
      tier: "medium",
      message: "attempt plan review raw message 0x1111111111111111111111111111111111111111 https://private.example/hook adapter_url webhook_url Bearer secret",
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
  return { support, candidate, boundary, outbox, lease, plan: planResponse.json().attempt_plan };
}

function expectAttemptPlanReviewSafe(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("attempt plan review raw message");
  expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  expect(serialized).not.toContain("private.example");
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
  expect(serialized).not.toContain("adapter_url");
  expect(serialized).not.toContain("webhook_url");
  expect(serialized).not.toContain("full_prompt");
  expect(serialized).not.toContain("llm_output");
  expect(serialized).not.toContain("tts_text");
  expect(serialized).not.toContain("audio_url");
  expect(serialized).not.toContain("renderer_url");
}

describe("P0 admin reaction dispatch attempt plan review surface", () => {
  it("requires admin auth and returns 404 for unknown plan detail", async () => {
    const app = buildServer(new InMemoryRepository());
    await app.ready();

    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/attempt-plans" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/attempt-plans/rdplan_missing" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/attempt-plans", headers: { authorization: "Bearer wrong-token" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/admin/reaction-dispatch/attempt-plans/rdplan_missing", headers: { authorization: adminAuth } })).statusCode).toBe(404);

    await app.close();
  });

  it("lists and details safe attempt plan metadata without side effects", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const { support, candidate, boundary, outbox, lease, plan } = await createReviewedAttemptPlan(app);
    const before = {
      support: await repo.getSupportEventById(support.event_id),
      outbox: await repo.getReactionDispatchInternalOutbox(outbox.outbox_id),
      lease: await repo.getReactionDispatchInternalOutboxLease(outbox.outbox_id),
      plan: await repo.getReactionDispatchInternalOutboxAttemptPlan(outbox.outbox_id),
      reaction: repo.reactionRequests.size,
      overlay: repo.overlayEvents.size,
      outboxEvents: repo.outboxEvents.size,
      audit: repo.auditLogs.length
    };

    const list = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/attempt-plans?support_event_id=${support.event_id}&outbox_id=${outbox.outbox_id}&lease_id=${lease.lease_id}&character_id=${support.character_id}&stream_id=${support.stream_id}&plan_status=planned_internal&adapter_kind=iris_core_reaction&limit=1`, headers: { authorization: adminAuth } });
    const detail = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/attempt-plans/${plan.plan_id}`, headers: { authorization: adminAuth } });

    expect(list.statusCode).toBe(200);
    expect(detail.statusCode).toBe(200);
    expect(list.json().attempt_plans).toEqual([detail.json().attempt_plan]);
    expect(list.json().page).toEqual({ limit: 1, offset: 0, total: 1 });
    expect(list.json().review_summary).toMatchObject({ planned_internal: 1, plan_blocked: 0, plan_superseded: 0, plan_expired: 0 });
    expect(detail.json().attempt_plan).toMatchObject({
      plan_id: plan.plan_id,
      outbox_id: outbox.outbox_id,
      lease_id: lease.lease_id,
      candidate_id: candidate.candidate_id,
      boundary_id: boundary.boundary_id,
      support_event_id: support.event_id,
      stream_id: support.stream_id,
      character_id: support.character_id,
      source: "admin_manual_support",
      adapter_kind: "iris_core_reaction",
      plan_status: "planned_internal",
      outbox_status: "queued_internal",
      lease_status: "leased_internal",
      external_delivery_status: "not_attempted",
      adapter_execution_status: "not_executed",
      dispatch_attempt_count: 0,
      contract_version: "2.0",
      validation_status: "candidate_ready",
      safe_reason_codes: ["attempt_plan_created", "external_delivery_not_attempted", "adapter_not_executed", "external_execution_forbidden"],
      safe_context_summary_presence: { safe_context_hash_present: true, constraints_hash_present: true },
      reaction_constraints_summary: {
        external_delivery_status: "not_attempted",
        adapter_execution_status: "not_executed",
        dispatch_attempt_count: 0
      },
      operator_state_summary: {
        review_surface: "read_only",
        next_step: "dry_run_adapter_boundary",
        runtime_execution: "not_performed"
      }
    });
    expect(detail.json().attempt_plan.safe_context_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(detail.json().attempt_plan.constraints_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await repo.getSupportEventById(support.event_id)).toEqual(before.support);
    expect(await repo.getReactionDispatchInternalOutbox(outbox.outbox_id)).toEqual(before.outbox);
    expect(await repo.getReactionDispatchInternalOutboxLease(outbox.outbox_id)).toEqual(before.lease);
    expect(await repo.getReactionDispatchInternalOutboxAttemptPlan(outbox.outbox_id)).toEqual(before.plan);
    expect(repo.reactionRequests.size).toBe(before.reaction);
    expect(repo.overlayEvents.size).toBe(before.overlay);
    expect(repo.outboxEvents.size).toBe(before.outboxEvents);
    expect(repo.auditLogs.length).toBe(before.audit);
    expectAttemptPlanReviewSafe(list.json());
    expectAttemptPlanReviewSafe(detail.json());

    await app.close();
  }, 20_000);

  it("filters by outbox and lease states with safe pagination", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();
    const first = await createReviewedAttemptPlan(app, "attempt_plan_review_filter_a");
    await createReviewedAttemptPlan(app, "attempt_plan_review_filter_b");

    const matched = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/attempt-plans?outbox_status=queued_internal&lease_status=leased_internal&created_after=2000-01-01T00:00:00.000Z&created_before=2999-01-01T00:00:00.000Z&offset=0&limit=1`, headers: { authorization: adminAuth } });
    const none = await app.inject({ method: "GET", url: "/admin/reaction-dispatch/attempt-plans?adapter_kind=voxweave_voice", headers: { authorization: adminAuth } });

    expect(matched.statusCode).toBe(200);
    expect(matched.json().attempt_plans).toHaveLength(1);
    expect(matched.json().page.total).toBe(2);
    expect(none.statusCode).toBe(200);
    expect(none.json().attempt_plans).toEqual([]);
    expect(none.json().page.total).toBe(0);
    expect(await repo.getReactionDispatchInternalOutboxAttemptPlan(first.outbox.outbox_id)).toEqual(first.plan);
    expectAttemptPlanReviewSafe(matched.json());
    expectAttemptPlanReviewSafe(none.json());

    await app.close();
  }, 20_000);

  it("committed attempt plan review evidence preserves safe read-only boundaries", () => {
    const evidence = readCodexEvidence("p0-admin-reaction-dispatch-attempt-plan-review-surface.json");

    expect(evidence.adminReactionDispatchAttemptPlanReviewSurfaceStatus).toBe("implemented");
    expect(evidence.attemptPlanReviewStatus).toBe("pass");
    expect(evidence.attemptPlanFilterStatus).toBe("pass");
    expect(evidence.attemptPlanSafeDetailStatus).toBe("pass");
    expect(evidence.adapterKindAllowlistStatus).toBe("pass");
    expect(evidence.adminAuthStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.readOnlySupportEventStatus).toBe("pass");
    expect(evidence.readOnlyOutboxStatus).toBe("pass");
    expect(evidence.readOnlyLeaseStatus).toBe("pass");
    expect(evidence.noReactionExecutionStatus).toBe("pass");
    expect(evidence.noOverlayExecutionStatus).toBe("pass");
    expect(evidence.noExternalOutboxDispatchStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawMessageExcluded).toBe(true);
    expect(evidence.walletAddressExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.privateUrlExcluded).toBe(true);
    expect(evidence.adapterUrlExcluded).toBe(true);
    expect(evidence.webhookUrlExcluded).toBe(true);
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
