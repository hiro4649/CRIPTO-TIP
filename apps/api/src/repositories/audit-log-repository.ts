import {
  createManualGateAuditRecord,
  type ManualGateAuditRecord
} from "../manual-gate-audit.js";
import {
  createProviderDeploymentAuditRecord,
  createProviderDeploymentJob,
  type ProviderDeploymentAuditRecord,
  type ProviderDeploymentJob
} from "../provider-deployment-audit.js";

export interface AuditLogRepository {
  appendManualGateAudit(record: ManualGateAuditRecord): ManualGateAuditRecord;
  appendProviderDeploymentAudit(record: ProviderDeploymentAuditRecord): ProviderDeploymentAuditRecord;
  recordProviderDeploymentJob(job: ProviderDeploymentJob): ProviderDeploymentJob;
  listManualGateAudits(): ManualGateAuditRecord[];
  listProviderDeploymentAudits(): ProviderDeploymentAuditRecord[];
  listProviderDeploymentJobs(): ProviderDeploymentJob[];
}

export class InMemoryAuditLogRepository implements AuditLogRepository {
  private readonly manualGateAudits: ManualGateAuditRecord[] = [];
  private readonly providerDeploymentAudits: ProviderDeploymentAuditRecord[] = [];
  private readonly providerDeploymentJobs: ProviderDeploymentJob[] = [];

  appendManualGateAudit(record: ManualGateAuditRecord) {
    if (this.manualGateAudits.some((stored) => stored.id === record.id)) {
      throw new Error("manual gate audit id already exists");
    }
    const safeRecord = createManualGateAuditRecord(record);
    this.manualGateAudits.push(safeRecord);
    return safeRecord;
  }

  appendProviderDeploymentAudit(record: ProviderDeploymentAuditRecord) {
    if (this.providerDeploymentAudits.some((stored) => stored.id === record.id)) {
      throw new Error("provider deployment audit id already exists");
    }
    const safeRecord = createProviderDeploymentAuditRecord(record);
    this.providerDeploymentAudits.push(safeRecord);
    return safeRecord;
  }

  recordProviderDeploymentJob(job: ProviderDeploymentJob) {
    if (this.providerDeploymentJobs.some((stored) => stored.id === job.id)) {
      throw new Error("provider deployment job id already exists");
    }
    const safeJob = createProviderDeploymentJob(job);
    this.providerDeploymentJobs.push(safeJob);
    return safeJob;
  }

  listManualGateAudits() {
    return [...this.manualGateAudits];
  }

  listProviderDeploymentAudits() {
    return [...this.providerDeploymentAudits];
  }

  listProviderDeploymentJobs() {
    return [...this.providerDeploymentJobs];
  }
}
