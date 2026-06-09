import {
  assertSafeAuditRecord,
  sanitizeAuditText,
  sanitizeSafeAuditSummary,
  unsafeAuditPattern,
  type SafeAuditPrimitive,
  type SafeAuditRecord,
  type SafeAuditSummary
} from "./manual-gate-audit.js";
import type { ManualGateType } from "./manual-gates.js";

export const providerDeploymentAuditActions = [
  "provider_deployment.apply.planned",
  "provider_deployment.apply.executed",
  "provider_deployment.apply.failed",
  "provider_deployment.rollback.planned",
  "provider_deployment.rollback.executed",
  "provider_deployment.job.planned",
  "provider_deployment.job.running",
  "provider_deployment.job.applied",
  "provider_deployment.job.failed",
  "provider_deployment.job.rollback_planned",
  "provider_deployment.job.rolled_back",
  "provider_deployment.job.cancelled",
  "provider_deployment.compensation.required",
  "provider_deployment.compensation.resolved",
  "provider_apply_transaction.draft_created",
  "provider_apply_transaction.provider_apply_started",
  "provider_apply_transaction.provider_apply_succeeded",
  "provider_apply_transaction.provider_apply_failed",
  "provider_apply_transaction.mark_gate_used_attempted",
  "provider_apply_transaction.mark_gate_used_succeeded",
  "provider_apply_transaction.mark_gate_used_failed",
  "provider_apply_transaction.audit_append_succeeded",
  "provider_apply_transaction.committed",
  "provider_apply_transaction.rolled_back",
  "provider_apply_transaction.compensation_required"
] as const;

export type ProviderDeploymentAuditAction = typeof providerDeploymentAuditActions[number];

export const providerDeploymentJobStatuses = ["planned", "running", "applied", "failed", "rollback_planned", "rolled_back", "cancelled"] as const;

export type ProviderDeploymentJobStatus = typeof providerDeploymentJobStatuses[number];

export type ProviderDeploymentJob = {
  id: string;
  operation: ManualGateType;
  status: ProviderDeploymentJobStatus;
  target: string;
  target_environment: string;
  target_commit_sha: string;
  manual_gate_id?: string | undefined;
  rollback_plan_ref: string;
  operator_runbook_ref: string;
  safe_summary: SafeAuditSummary;
  created_at: string;
  updated_at: string;
};

export type ProviderDeploymentAuditRecord = SafeAuditRecord & {
  job_id: string;
  operation: ManualGateType;
  action: ProviderDeploymentAuditAction;
  target: string;
};

export function createProviderDeploymentJob(job: ProviderDeploymentJob): ProviderDeploymentJob {
  assertProviderDeploymentJob(job);
  return {
    id: job.id,
    operation: job.operation,
    status: job.status,
    target: sanitizeAuditText(job.target),
    target_environment: sanitizeAuditText(job.target_environment),
    target_commit_sha: job.target_commit_sha,
    ...(job.manual_gate_id ? { manual_gate_id: sanitizeAuditText(job.manual_gate_id) } : {}),
    rollback_plan_ref: sanitizeAuditText(job.rollback_plan_ref),
    operator_runbook_ref: sanitizeAuditText(job.operator_runbook_ref),
    safe_summary: sanitizeProviderDeploymentSummary(job.safe_summary),
    created_at: job.created_at,
    updated_at: job.updated_at
  };
}

export function createProviderDeploymentAuditRecord(record: ProviderDeploymentAuditRecord): ProviderDeploymentAuditRecord {
  assertProviderDeploymentAuditRecord(record);
  return {
    id: record.id,
    job_id: record.job_id,
    operation: record.operation,
    action: record.action,
    target: sanitizeAuditText(record.target),
    actor_type: record.actor_type,
    ...(record.actor_id ? { actor_id: sanitizeAuditText(record.actor_id) } : {}),
    target_environment: sanitizeAuditText(record.target_environment),
    target_commit_sha: record.target_commit_sha,
    safe_summary: sanitizeSafeAuditSummary(record.safe_summary),
    created_at: record.created_at
  };
}

export function assertProviderDeploymentJob(job: ProviderDeploymentJob) {
  if (!job.id) throw new Error("provider deployment job id is required");
  if (!providerDeploymentJobStatuses.includes(job.status)) throw new Error("provider deployment job status is invalid");
  assertSafeProviderDeploymentField("target", job.target);
  assertSafeProviderDeploymentField("target_environment", job.target_environment);
  if (job.manual_gate_id) assertSafeProviderDeploymentField("manual_gate_id", job.manual_gate_id);
  if (!job.rollback_plan_ref) throw new Error("provider deployment rollback plan reference is required");
  assertSafeProviderDeploymentField("rollback_plan_ref", job.rollback_plan_ref);
  if (!job.operator_runbook_ref) throw new Error("provider deployment operator runbook reference is required");
  assertSafeProviderDeploymentField("operator_runbook_ref", job.operator_runbook_ref);
  if (!/^[0-9a-f]{40}$/i.test(job.target_commit_sha)) throw new Error("provider deployment target_commit_sha is required");
  assertSafeAuditRecord({
    id: job.id,
    action: `provider_deployment.job.${job.status}`,
    target_environment: job.target_environment,
    target_commit_sha: job.target_commit_sha,
    safe_summary: sanitizeProviderDeploymentSummary(job.safe_summary),
    created_at: job.created_at,
    actor_type: "system"
  });
}

export function assertProviderDeploymentAuditRecord(record: ProviderDeploymentAuditRecord) {
  if (!providerDeploymentAuditActions.includes(record.action)) throw new Error("provider deployment audit action is invalid");
  if (!record.job_id) throw new Error("provider deployment audit job_id is required");
  assertSafeProviderDeploymentField("target", record.target);
  if (!/^[0-9a-f]{40}$/i.test(record.target_commit_sha)) throw new Error("provider deployment audit target_commit_sha is required");
  assertSafeAuditRecord(record);
}

export function sanitizeProviderDeploymentSummary(summary: SafeAuditSummary): SafeAuditSummary {
  const sanitized = sanitizeSafeAuditSummary(summary);
  return Object.fromEntries(
    Object.entries(sanitized).filter(([, value]) => isSafeAuditPrimitive(value))
  );
}

function isSafeAuditPrimitive(value: unknown): value is SafeAuditPrimitive {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function assertSafeProviderDeploymentField(fieldName: string, value: string) {
  if (!value) throw new Error(`provider deployment ${fieldName} is required`);
  if (unsafeAuditPattern().test(value)) throw new Error(`provider deployment ${fieldName} contains unsafe value`);
}
