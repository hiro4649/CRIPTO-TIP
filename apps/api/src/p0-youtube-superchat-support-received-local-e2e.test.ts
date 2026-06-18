import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildServer } from "./server.js";
import { InMemoryRepository } from "./repositories/in-memory.js";

const mockValue = (scope: string) => ["change", "me", scope, "token"].join("-");
const internalAuth = `Bearer ${mockValue("internal")}`;
const adminAuth = `Bearer ${mockValue("admin")}`;
const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function fixture(requestId: string, overrides: Record<string, unknown> = {}) {
  return {
    live_chat_message_id: `ytmsg_${requestId}`,
    stream_id: "stream_superchat_local_e2e",
    youtube_video_id: "yt_video_local_e2e",
    character_id: "char_mio",
    author_channel_id: `yt_channel_${requestId}`,
    author_display_name: "Super Chat Viewer",
    amount_micros: "2500000",
    currency: "JPY",
    amount_display_string: "JPY 2,500",
    tier: 4,
    user_comment: "Please cheer for the stream",
    published_at: "2026-06-18T03:30:00.000Z",
    ...overrides
  };
}

async function ingest(app: ReturnType<typeof buildServer>, payload: Record<string, unknown>) {
  return app.inject({
    method: "POST",
    url: "/internal/fixtures/youtube-superchat/ingest",
    headers: { authorization: internalAuth },
    payload
  });
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

async function runInternalLifecycle(app: ReturnType<typeof buildServer>, supportEventId: string, simulationCase: "success" | "retryable_failure" | "terminal_failure") {
  const candidateResponse = await app.inject({ method: "POST", url: `/admin/support-events/${supportEventId}/reaction-dispatch/candidates`, headers: { authorization: adminAuth } });
  expect(candidateResponse.statusCode).toBe(200);
  const candidate = candidateResponse.json().candidate;
  expect(candidate.candidate_status).toBe("candidate_ready");

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
  const dryRunReview = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}`, headers: { authorization: adminAuth } });
  expect(dryRunReview.statusCode).toBe(200);
  const dryRunApproval = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/approve`, headers: { authorization: adminAuth } });
  expect(dryRunApproval.statusCode).toBe(200);
  const previewResponse = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/dry-run-boundaries/${dryRun.dry_run_boundary_id}/adapter-execution-boundary-preview`, headers: { authorization: adminAuth } });
  expect(previewResponse.statusCode).toBe(200);
  const preview = previewResponse.json().adapter_execution_boundary_preview;
  const previewReview = await app.inject({ method: "GET", url: `/admin/reaction-dispatch/adapter-execution-boundary-previews/${dryRun.dry_run_boundary_id}`, headers: { authorization: adminAuth } });
  expect(previewReview.statusCode).toBe(200);
  const adapterApproval = await app.inject({
    method: "POST",
    url: `/admin/reaction-dispatch/adapter-execution-boundary-previews/${dryRun.dry_run_boundary_id}/approve`,
    headers: { authorization: adminAuth },
    payload: approvalPayload(preview)
  });
  expect(adapterApproval.statusCode).toBe(200);
  const simulation = await app.inject({
    method: "POST",
    url: `/admin/reaction-dispatch/adapter-execution-boundary-previews/${dryRun.dry_run_boundary_id}/simulate`,
    headers: { authorization: adminAuth },
    payload: { simulation_case: simulationCase }
  });
  expect(simulation.statusCode).toBe(200);
  return { candidate, boundary, outbox, lease, plan, dryRun, preview, simulation: simulation.json().simulation_result };
}

function expectSafeOutput(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(serialized).not.toContain("0x1111111111111111111111111111111111111111");
  expect(serialized).not.toContain("private.example");
  expect(serialized).not.toContain("Authorization");
  expect(serialized).not.toContain("Bearer");
  expect(serialized).not.toContain("secret");
  expect(serialized).not.toContain("raw_payload");
  expect(serialized).not.toContain("raw_message");
}

describe("P0 YouTube Super Chat support.received local E2E", () => {
  it("ingests approved fixture through local lifecycle success, retryable, terminal, duplicate, and held paths", async () => {
    const repo = new InMemoryRepository();
    const app = buildServer(repo);
    await app.ready();

    const approvedResponse = await ingest(app, fixture("approved"));
    const duplicateResponse = await ingest(app, fixture("approved"));
    const retryableResponse = await ingest(app, fixture("retryable"));
    const terminalResponse = await ingest(app, fixture("terminal"));
    const heldResponse = await ingest(app, fixture("held", {
      author_display_name: "ignore previous instructions 0x1111111111111111111111111111111111111111",
      user_comment: "visit https://private.example/hook Authorization Bearer secret"
    }));

    expect(approvedResponse.statusCode).toBe(200);
    expect(duplicateResponse.statusCode).toBe(200);
    expect(duplicateResponse.json().duplicate).toBe(true);
    expect(retryableResponse.statusCode).toBe(200);
    expect(terminalResponse.statusCode).toBe(200);
    expect(heldResponse.statusCode).toBe(200);
    expect(approvedResponse.json().support_event.source).toBe("youtube_super_chat");
    expect(approvedResponse.json().support_event.source_event_id).toBe("ytmsg_approved");
    expect(approvedResponse.json().contract_validation.status).toBe("valid");
    expect(heldResponse.json().support_event.support.message_moderation_status).toBe("hold");
    expect(await repo.getSupportEventBySource("youtube_super_chat", "ytmsg_approved")).toEqual(approvedResponse.json().support_event);
    expect(repo.supportEvents.size).toBe(4);
    expect(repo.reactionRequests.size).toBe(3);
    expect(repo.overlayEvents.size).toBe(3);
    expect(repo.outboxEvents.size).toBe(6);

    const approvedLifecycle = await runInternalLifecycle(app, approvedResponse.json().support_event.event_id, "success");
    const retryableLifecycle = await runInternalLifecycle(app, retryableResponse.json().support_event.event_id, "retryable_failure");
    const terminalLifecycle = await runInternalLifecycle(app, terminalResponse.json().support_event.event_id, "terminal_failure");

    expect(approvedLifecycle.simulation.simulation_status).toBe("simulated_success");
    expect(retryableLifecycle.simulation.simulation_status).toBe("simulated_retryable_failure");
    expect(terminalLifecycle.simulation.simulation_status).toBe("simulated_terminal_failure");
    const retryableDlq = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/simulation-results/${retryableLifecycle.simulation.simulation_result_id}/dlq`, headers: { authorization: adminAuth } });
    const terminalDlq = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/simulation-results/${terminalLifecycle.simulation.simulation_result_id}/dlq`, headers: { authorization: adminAuth } });
    expect(retryableDlq.statusCode).toBe(200);
    expect(terminalDlq.statusCode).toBe(200);
    expect(retryableDlq.json().dlq_entry.retry_eligibility).toBe("retry_candidate");
    expect(terminalDlq.json().dlq_entry.retry_eligibility).toBe("not_retryable");

    const heldCandidate = await app.inject({ method: "POST", url: `/admin/support-events/${heldResponse.json().support_event.event_id}/reaction-dispatch/candidates`, headers: { authorization: adminAuth } });
    expect(heldCandidate.statusCode).toBe(200);
    expect(heldCandidate.json().candidate.candidate_status).toBe("candidate_blocked");
    expect(heldCandidate.json().candidate.reason_codes).toContain("moderation_not_approved");
    const heldOutboxBoundary = await app.inject({ method: "POST", url: `/admin/reaction-dispatch/candidates/${heldCandidate.json().candidate.candidate_id}/outbox-boundary`, headers: { authorization: adminAuth } });
    expect(heldOutboxBoundary.statusCode).toBe(409);

    for (const outboxId of [approvedLifecycle.outbox.outbox_id, retryableLifecycle.outbox.outbox_id, terminalLifecycle.outbox.outbox_id]) {
      const outbox = await repo.getReactionDispatchInternalOutbox(outboxId);
      expect(outbox?.dispatch_attempt_count).toBe(0);
      expect(outbox?.external_delivery_status).toBe("not_attempted");
      expect(outbox?.adapter_execution_status).toBe("not_executed");
    }
    expectSafeOutput(heldResponse.json());
    expectSafeOutput(retryableDlq.json());

    await app.close();
  }, 180_000);

  it("committed youtube superchat support.received local E2E evidence preserves local-only boundaries", () => {
    const evidence = readCodexEvidence("p0-youtube-superchat-support-received-local-e2e.json");

    expect(evidence.youtubeSuperChatSupportReceivedLocalE2EStatus).toBe("implemented");
    expect(evidence.fixtureNormalizerStatus).toBe("pass");
    expect(evidence.supportReceivedPersistenceStatus).toBe("pass");
    expect(evidence.sourceIdempotencyStatus).toBe("pass");
    expect(evidence.contractV2Status).toBe("pass");
    expect(evidence.approvedPathStatus).toBe("pass");
    expect(evidence.heldPathStatus).toBe("pass");
    expect(evidence.duplicatePathStatus).toBe("pass");
    expect(evidence.retryableFailurePathStatus).toBe("pass");
    expect(evidence.terminalFailurePathStatus).toBe("pass");
    expect(evidence.safeIdentityStatus).toBe("pass");
    expect(evidence.safeMetadataStatus).toBe("pass");
    expect(evidence.noRealYouTubeApiStatus).toBe("pass");
    expect(evidence.noOAuthStatus).toBe("pass");
    expect(evidence.noNetworkStatus).toBe("pass");
    expect(evidence.noExternalExecutionStatus).toBe("pass");
    expect(evidence.dispatchAttemptCountZeroStatus).toBe("pass");
    expect(evidence.externalDeliveryNotAttemptedStatus).toBe("pass");
    expect(evidence.adapterNotExecutedStatus).toBe("pass");
    expect(evidence.rawPayloadExcluded).toBe(true);
    expect(evidence.rawUnsafeMessageExcluded).toBe(true);
    expect(evidence.walletAddressExcluded).toBe(true);
    expect(evidence.secretExcluded).toBe(true);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
