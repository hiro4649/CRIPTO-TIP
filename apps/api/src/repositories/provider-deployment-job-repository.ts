import {
  createProviderDeploymentJobAuditRecord,
  createProviderDeploymentJobStateRecord,
  transitionProviderDeploymentJob,
  type ProviderDeploymentJobStateRecord,
  type ProviderDeploymentJobTransitionContext
} from "../provider-deployment-job-state.js";
import {
  createProviderDeploymentAuditRecord,
  type ProviderDeploymentAuditRecord,
  type ProviderDeploymentJobStatus
} from "../provider-deployment-audit.js";

export interface ProviderDeploymentJobRepository {
  createJob(job: ProviderDeploymentJobStateRecord): ProviderDeploymentJobStateRecord;
  getJob(jobId: string): ProviderDeploymentJobStateRecord | undefined;
  transitionJob(jobId: string, nextStatus: ProviderDeploymentJobStatus, context: ProviderDeploymentJobTransitionContext): ProviderDeploymentJobStateRecord;
  appendAudit(record: ProviderDeploymentAuditRecord): ProviderDeploymentAuditRecord;
  listJobs(): ProviderDeploymentJobStateRecord[];
  listAudits(): ProviderDeploymentAuditRecord[];
}

export class InMemoryProviderDeploymentJobRepository implements ProviderDeploymentJobRepository {
  private readonly jobs = new Map<string, ProviderDeploymentJobStateRecord>();
  private readonly audits: ProviderDeploymentAuditRecord[] = [];

  createJob(job: ProviderDeploymentJobStateRecord) {
    if (this.jobs.has(job.id)) throw new Error("provider deployment job id already exists");
    const safeJob = createProviderDeploymentJobStateRecord(job);
    this.jobs.set(safeJob.id, safeJob);
    this.appendAudit(createProviderDeploymentJobAuditRecord({
      id: `${safeJob.id}-planned`,
      job: safeJob,
      createdAt: safeJob.created_at
    }));
    return safeJob;
  }

  getJob(jobId: string) {
    return this.jobs.get(jobId);
  }

  transitionJob(jobId: string, nextStatus: ProviderDeploymentJobStatus, context: ProviderDeploymentJobTransitionContext) {
    const current = this.jobs.get(jobId);
    if (!current) throw new Error("provider deployment job was not found");
    const next = transitionProviderDeploymentJob(current, nextStatus, context);
    this.jobs.set(jobId, next);
    this.appendAudit(createProviderDeploymentJobAuditRecord({
      id: `${jobId}-${nextStatus}-${this.audits.length + 1}`,
      job: next,
      createdAt: context.updatedAt,
      safeSummary: {
        status: nextStatus,
        compensationRequired: next.compensation_required,
        externalProviderApplyStarted: next.external_provider_apply_started
      }
    }));
    if (next.compensation_required) {
      this.appendAudit(createProviderDeploymentJobAuditRecord({
        id: `${jobId}-compensation-required-${this.audits.length + 1}`,
        job: next,
        action: "provider_deployment.compensation.required",
        createdAt: context.updatedAt,
        safeSummary: {
          status: "compensation_required",
          manualGateMarkUsedAttempted: next.manual_gate_mark_used_attempted,
          manualGateMarkUsedSucceeded: next.manual_gate_mark_used_succeeded
        }
      }));
    }
    return next;
  }

  appendAudit(record: ProviderDeploymentAuditRecord) {
    if (this.audits.some((stored) => stored.id === record.id)) {
      throw new Error("provider deployment job audit id already exists");
    }
    const safeRecord = createProviderDeploymentAuditRecord(record);
    this.audits.push(safeRecord);
    return safeRecord;
  }

  listJobs() {
    return [...this.jobs.values()];
  }

  listAudits() {
    return [...this.audits];
  }
}
