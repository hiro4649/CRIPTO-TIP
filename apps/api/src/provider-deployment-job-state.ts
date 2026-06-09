import {
  createProviderDeploymentAuditRecord,
  createProviderDeploymentJob,
  type ProviderDeploymentAuditAction,
  type ProviderDeploymentAuditRecord,
  type ProviderDeploymentJob,
  type ProviderDeploymentJobStatus
} from "./provider-deployment-audit.js";

export type ProviderDeploymentJobStateRecord = ProviderDeploymentJob & {
  external_provider_apply_started: boolean;
  manual_gate_mark_used_attempted: boolean;
  manual_gate_mark_used_succeeded: boolean;
  compensation_required: boolean;
};

export type ProviderDeploymentJobTransitionContext = {
  externalProviderApplyStarted?: boolean | undefined;
  manualGateMarkUsedAttempted?: boolean | undefined;
  manualGateMarkUsedSucceeded?: boolean | undefined;
  compensationRequired?: boolean | undefined;
  updatedAt: string;
  safeSummary?: ProviderDeploymentJob["safe_summary"] | undefined;
};

const allowedTransitions: Record<ProviderDeploymentJobStatus, ProviderDeploymentJobStatus[]> = {
  planned: ["running", "cancelled"],
  running: ["applied", "failed", "cancelled"],
  applied: [],
  failed: ["rollback_planned"],
  rollback_planned: ["rolled_back"],
  rolled_back: [],
  cancelled: []
};

const auditActionByStatus: Record<ProviderDeploymentJobStatus, ProviderDeploymentAuditAction> = {
  planned: "provider_deployment.job.planned",
  running: "provider_deployment.job.running",
  applied: "provider_deployment.job.applied",
  failed: "provider_deployment.job.failed",
  rollback_planned: "provider_deployment.job.rollback_planned",
  rolled_back: "provider_deployment.job.rolled_back",
  cancelled: "provider_deployment.job.cancelled"
};

export function createProviderDeploymentJobStateRecord(job: ProviderDeploymentJobStateRecord): ProviderDeploymentJobStateRecord {
  assertProviderDeploymentJobStateRecord(job);
  return {
    ...createProviderDeploymentJob(job),
    external_provider_apply_started: Boolean(job.external_provider_apply_started),
    manual_gate_mark_used_attempted: Boolean(job.manual_gate_mark_used_attempted),
    manual_gate_mark_used_succeeded: Boolean(job.manual_gate_mark_used_succeeded),
    compensation_required: Boolean(job.compensation_required)
  };
}

export function assertProviderDeploymentJobTransition(current: ProviderDeploymentJobStateRecord, nextStatus: ProviderDeploymentJobStatus) {
  const allowed = allowedTransitions[current.status] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error(`provider deployment job transition ${current.status} -> ${nextStatus} is not allowed`);
  }
  if (current.status === "running" && nextStatus === "cancelled" && current.external_provider_apply_started) {
    throw new Error("provider deployment job cannot be cancelled after external provider apply started");
  }
}

export function transitionProviderDeploymentJob(
  current: ProviderDeploymentJobStateRecord,
  nextStatus: ProviderDeploymentJobStatus,
  context: ProviderDeploymentJobTransitionContext
): ProviderDeploymentJobStateRecord {
  assertProviderDeploymentJobTransition(current, nextStatus);
  const next = createProviderDeploymentJobStateRecord({
    ...current,
    status: nextStatus,
    external_provider_apply_started: context.externalProviderApplyStarted ?? current.external_provider_apply_started,
    manual_gate_mark_used_attempted: context.manualGateMarkUsedAttempted ?? current.manual_gate_mark_used_attempted,
    manual_gate_mark_used_succeeded: context.manualGateMarkUsedSucceeded ?? current.manual_gate_mark_used_succeeded,
    compensation_required: context.compensationRequired ?? current.compensation_required,
    safe_summary: context.safeSummary ?? current.safe_summary,
    updated_at: context.updatedAt
  });
  assertProviderDeploymentJobAppliedConsistency(next);
  return next;
}

export function assertProviderDeploymentJobAppliedConsistency(job: ProviderDeploymentJobStateRecord) {
  if (job.status !== "applied") return;
  if (!job.external_provider_apply_started) {
    throw new Error("provider deployment applied job requires external provider apply to have started");
  }
  if (!job.manual_gate_mark_used_attempted) {
    throw new Error("provider deployment applied job requires manual gate mark-used attempt");
  }
  if (!job.manual_gate_mark_used_succeeded) {
    throw new Error("provider deployment applied job requires manual gate mark-used success");
  }
  if (job.compensation_required) {
    throw new Error("provider deployment applied job cannot require compensation");
  }
}

export function deriveProviderDeploymentCompensationState(args: {
  externalProviderApplySucceeded: boolean;
  manualGateMarkUsedAttempted: boolean;
  manualGateMarkUsedSucceeded: boolean;
}) {
  return args.externalProviderApplySucceeded && args.manualGateMarkUsedAttempted && !args.manualGateMarkUsedSucceeded;
}

export function createProviderDeploymentJobAuditRecord(args: {
  id: string;
  job: ProviderDeploymentJobStateRecord;
  action?: ProviderDeploymentAuditAction | undefined;
  actorType?: ProviderDeploymentAuditRecord["actor_type"] | undefined;
  createdAt: string;
  safeSummary?: ProviderDeploymentAuditRecord["safe_summary"] | undefined;
}): ProviderDeploymentAuditRecord {
  return createProviderDeploymentAuditRecord({
    id: args.id,
    job_id: args.job.id,
    operation: args.job.operation,
    action: args.action ?? auditActionByStatus[args.job.status],
    target: args.job.target,
    actor_type: args.actorType ?? "system",
    target_environment: args.job.target_environment,
    target_commit_sha: args.job.target_commit_sha,
    safe_summary: args.safeSummary ?? args.job.safe_summary,
    created_at: args.createdAt
  });
}

function assertProviderDeploymentJobStateRecord(job: ProviderDeploymentJobStateRecord) {
  createProviderDeploymentJob(job);
  if (job.compensation_required) {
    if (job.status !== "failed") {
      throw new Error("provider deployment compensation requires failed status");
    }
    if (!job.external_provider_apply_started) {
      throw new Error("provider deployment compensation requires external provider apply to have started");
    }
    if (!job.manual_gate_mark_used_attempted) {
      throw new Error("provider deployment compensation requires manual gate mark-used attempt");
    }
    if (job.manual_gate_mark_used_succeeded) {
      throw new Error("provider deployment compensation requires manual gate mark-used failure");
    }
  }
  if (job.manual_gate_mark_used_succeeded && !job.manual_gate_mark_used_attempted) {
    throw new Error("provider deployment manual gate mark-used success requires an attempted mark");
  }
  assertProviderDeploymentJobAppliedConsistency(job);
}
