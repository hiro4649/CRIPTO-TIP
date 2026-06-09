import {
  assertManualGateApproval,
  validateManualGateApproval,
  type ManualGateApproval
} from "../manual-gates.js";
import {
  createManualGateAuditRecord,
  type ManualGateAuditRecord,
  type SafeAuditSummary
} from "../manual-gate-audit.js";
import {
  createProviderDeploymentAuditRecord,
  type ProviderDeploymentAuditAction,
  type ProviderDeploymentAuditRecord
} from "../provider-deployment-audit.js";
import {
  createProviderDeploymentJobStateRecord,
  transitionProviderDeploymentJob,
  type ProviderDeploymentJobStateRecord
} from "../provider-deployment-job-state.js";
import {
  createProviderApplyTransactionDraft,
  createProviderApplyTransactionFailure,
  providerApplyJobFromDraft,
  type ProviderApplyTransactionDraft,
  type ProviderApplyTransactionFailure,
  type ProviderApplyTransactionResult
} from "../provider-apply-transaction.js";

export type ProviderApplyTransactionCommitInput = {
  transactionId: string;
  providerApplyStarted: boolean;
  providerApplySucceeded: boolean;
  committedAt: string;
  safeSummary?: SafeAuditSummary | undefined;
};

export interface TransactionalProviderDeploymentRepository {
  createManualGate(gate: ManualGateApproval): ManualGateApproval;
  beginApplyTransaction(draft: ProviderApplyTransactionDraft): ProviderApplyTransactionDraft;
  commitApplyTransaction(input: ProviderApplyTransactionCommitInput): ProviderApplyTransactionResult | ProviderApplyTransactionFailure;
  rollbackApplyTransaction(transactionId: string, rolledBackAt: string, safeSummary: SafeAuditSummary): ProviderApplyTransactionFailure;
  getJob(jobId: string): ProviderDeploymentJobStateRecord | undefined;
  getManualGate(gateId: string): ManualGateApproval | undefined;
  listProviderAudits(): ProviderDeploymentAuditRecord[];
  listManualGateAudits(): ManualGateAuditRecord[];
}

export class InMemoryTransactionalProviderDeploymentRepository implements TransactionalProviderDeploymentRepository {
  private readonly transactions = new Map<string, ProviderApplyTransactionDraft>();
  private readonly jobs = new Map<string, ProviderDeploymentJobStateRecord>();
  private readonly gates = new Map<string, ManualGateApproval>();
  private readonly providerAudits: ProviderDeploymentAuditRecord[] = [];
  private readonly manualGateAudits: ManualGateAuditRecord[] = [];

  constructor(private readonly options: {
    failMarkUsedAfterProviderSuccess?: boolean | undefined;
    failAuditAppend?: boolean | undefined;
  } = {}) {}

  createManualGate(gate: ManualGateApproval) {
    if (this.gates.has(gate.gate_id)) throw new Error("manual gate id already exists");
    const safeGate = validateManualGateApproval(gate);
    this.gates.set(safeGate.gate_id, safeGate);
    return safeGate;
  }

  beginApplyTransaction(draft: ProviderApplyTransactionDraft) {
    const safeDraft = createProviderApplyTransactionDraft(draft);
    if (this.transactions.has(safeDraft.transaction_id)) throw new Error("duplicate_transaction_id");
    if (this.jobs.has(safeDraft.job_id)) throw new Error("provider deployment job id already exists");
    this.transactions.set(safeDraft.transaction_id, safeDraft);
    const job = createProviderDeploymentJobStateRecord({
      ...providerApplyJobFromDraft(safeDraft),
      external_provider_apply_started: false,
      manual_gate_mark_used_attempted: false,
      manual_gate_mark_used_succeeded: false,
      compensation_required: false
    });
    this.jobs.set(job.id, job);
    this.appendProviderAudit(safeDraft, "provider_apply_transaction.draft_created", "draft_created", safeDraft.created_at);
    return safeDraft;
  }

  commitApplyTransaction(input: ProviderApplyTransactionCommitInput) {
    const draft = this.requireTransaction(input.transactionId);
    const snapshots = this.snapshot();
    try {
      const gate = this.requireApprovedGate(draft, new Date(input.committedAt));
      let job = this.requireJob(draft.job_id);
      if (input.providerApplySucceeded && !input.providerApplyStarted) {
        throw new Error("provider_job_transition_invalid");
      }
      job = this.transitionJob(job, "running", {
        externalProviderApplyStarted: input.providerApplyStarted,
        manualGateMarkUsedAttempted: false,
        manualGateMarkUsedSucceeded: false,
        compensationRequired: false,
        updatedAt: input.committedAt,
        safeSummary: input.safeSummary ?? { phase: "provider_apply_started" }
      });
      this.appendProviderAudit(draft, "provider_apply_transaction.provider_apply_started", "provider_apply_started", input.committedAt);

      if (!input.providerApplySucceeded) {
        job = this.transitionJob(job, "failed", {
          externalProviderApplyStarted: input.providerApplyStarted,
          manualGateMarkUsedAttempted: false,
          manualGateMarkUsedSucceeded: false,
          compensationRequired: false,
          updatedAt: input.committedAt,
          safeSummary: input.safeSummary ?? { phase: "provider_apply_failed" }
        });
        this.appendProviderAudit(draft, "provider_apply_transaction.provider_apply_failed", "provider_apply_failed", input.committedAt);
        return this.failure(draft, "metadata_limited_external_blocked", false, "Inspect safe provider status evidence before retry.", input.committedAt, {
          phase: "provider_apply_failed",
          jobStatus: job.status
        });
      }

      this.appendProviderAudit(draft, "provider_apply_transaction.provider_apply_succeeded", "provider_apply_succeeded", input.committedAt);
      this.appendProviderAudit(draft, "provider_apply_transaction.mark_gate_used_attempted", "mark_gate_used_attempted", input.committedAt);
      try {
        this.markGateUsed(gate, input.committedAt);
      } catch {
        job = this.transitionJob(job, "failed", {
          externalProviderApplyStarted: true,
          manualGateMarkUsedAttempted: true,
          manualGateMarkUsedSucceeded: false,
          compensationRequired: true,
          updatedAt: input.committedAt,
          safeSummary: { phase: "compensation_required", reason: "mark_used_failed_after_provider_apply" }
        });
        this.appendProviderAudit(draft, "provider_apply_transaction.mark_gate_used_failed", "mark_gate_used_failed", input.committedAt);
        this.appendProviderAudit(draft, "provider_apply_transaction.compensation_required", "compensation_required", input.committedAt);
        return this.failure(draft, "mark_used_failed_after_provider_apply", true, "Follow provider apply compensation handoff and verify provider-side state manually.", input.committedAt, {
          phase: "compensation_required",
          jobStatus: job.status
        });
      }

      this.appendProviderAudit(draft, "provider_apply_transaction.mark_gate_used_succeeded", "mark_gate_used_succeeded", input.committedAt);
      job = this.transitionJob(job, "applied", {
        externalProviderApplyStarted: true,
        manualGateMarkUsedAttempted: true,
        manualGateMarkUsedSucceeded: true,
        compensationRequired: false,
        updatedAt: input.committedAt,
        safeSummary: input.safeSummary ?? { phase: "transaction_committed" }
      });
      this.appendProviderAudit(draft, "provider_apply_transaction.audit_append_succeeded", "audit_append_succeeded", input.committedAt);
      this.appendProviderAudit(draft, "provider_apply_transaction.committed", "transaction_committed", input.committedAt);
      const manualGateStatus: ProviderApplyTransactionResult["manual_gate_status"] = this.requireGate(draft.manual_gate_id).status === "used" ? "used" : "approved";
      return {
        transaction_id: draft.transaction_id,
        job_id: draft.job_id,
        manual_gate_id: draft.manual_gate_id,
        job_status: job.status,
        manual_gate_status: manualGateStatus,
        audit_record_ids: [
          ...this.providerAudits.filter((audit) => audit.job_id === draft.job_id).map((audit) => audit.id),
          ...this.manualGateAudits.filter((audit) => audit.gate_id === draft.manual_gate_id).map((audit) => audit.id)
        ],
        compensation_required: false,
        safe_summary: input.safeSummary ?? { phase: "transaction_committed" },
        committed_at: input.committedAt
      };
    } catch (error) {
      this.restore(snapshots);
      if (error instanceof Error && error.message === "audit_append_failed") {
        if (input.providerApplySucceeded) {
          return this.failure(
            draft,
            "audit_append_failed",
            true,
            "Follow provider apply compensation handoff; provider may have applied while durable state and audit append failed.",
            input.committedAt,
            {
              phase: "audit_append_failed_after_provider_success",
              providerApplySucceeded: true,
              durableStateRolledBack: true
            }
          );
        }
        return this.failure(draft, "audit_append_failed", false, "Retry state recording after audit append storage is healthy.", input.committedAt, { phase: "audit_append_failed" });
      }
      throw error;
    }
  }

  rollbackApplyTransaction(transactionId: string, rolledBackAt: string, safeSummary: SafeAuditSummary) {
    const draft = this.requireTransaction(transactionId);
    createProviderApplyTransactionDraft({ ...draft, safe_summary: safeSummary });
    this.appendProviderAudit(draft, "provider_apply_transaction.rolled_back", "transaction_rolled_back", rolledBackAt, safeSummary);
    return this.failure(draft, "metadata_limited_external_blocked", false, "Rollback is an operator handoff only; no provider rollback was executed.", rolledBackAt, safeSummary);
  }

  getJob(jobId: string) {
    return this.jobs.get(jobId);
  }

  getManualGate(gateId: string) {
    return this.gates.get(gateId);
  }

  listProviderAudits() {
    return [...this.providerAudits];
  }

  listManualGateAudits() {
    return [...this.manualGateAudits];
  }

  private requireApprovedGate(draft: ProviderApplyTransactionDraft, now: Date) {
    const gate = this.requireGate(draft.manual_gate_id);
    try {
      return assertManualGateApproval(gate, {
        gateType: draft.operation,
        targetCommitSha: draft.target_commit_sha,
        targetEnvironment: draft.target_environment,
        now
      });
    } catch (error) {
      if (error instanceof Error && /target|type/.test(error.message)) throw new Error("manual_gate_mismatch");
      throw new Error("manual_gate_not_approved");
    }
  }

  private markGateUsed(gate: ManualGateApproval, usedAt: string) {
    if (this.options.failMarkUsedAfterProviderSuccess) throw new Error("manual gate mark used failed");
    if (gate.status !== "approved") throw new Error("manual gate must be approved before use");
    const used = validateManualGateApproval({ ...gate, status: "used" });
    this.gates.set(gate.gate_id, used);
    this.appendManualGateAudit(used, usedAt);
    return used;
  }

  private transitionJob(
    job: ProviderDeploymentJobStateRecord,
    nextStatus: ProviderDeploymentJobStateRecord["status"],
    context: {
      externalProviderApplyStarted: boolean;
      manualGateMarkUsedAttempted: boolean;
      manualGateMarkUsedSucceeded: boolean;
      compensationRequired: boolean;
      updatedAt: string;
      safeSummary: SafeAuditSummary;
    }
  ) {
    try {
      const next = transitionProviderDeploymentJob(job, nextStatus, context);
      this.jobs.set(next.id, next);
      return next;
    } catch {
      throw new Error("provider_job_transition_invalid");
    }
  }

  private appendProviderAudit(draft: ProviderApplyTransactionDraft, action: ProviderDeploymentAuditAction, phase: string, createdAt: string, safeSummary: SafeAuditSummary = { phase }) {
    if (this.options.failAuditAppend && action !== "provider_apply_transaction.draft_created") throw new Error("audit_append_failed");
    const id = `${draft.transaction_id}-${phase}-${createdAt}`.replace(/[^a-zA-Z0-9_.:-]+/g, "-").slice(0, 160);
    if (this.providerAudits.some((audit) => audit.id === id)) throw new Error("provider deployment audit id already exists");
    const record = createProviderDeploymentAuditRecord({
      id,
      job_id: draft.job_id,
      operation: draft.operation,
      action,
      target: draft.target,
      actor_type: "system",
      target_environment: draft.target_environment,
      target_commit_sha: draft.target_commit_sha,
      safe_summary: safeSummary,
      created_at: createdAt
    });
    this.providerAudits.push(record);
    return record;
  }

  private appendManualGateAudit(gate: ManualGateApproval, createdAt: string) {
    const id = `${gate.gate_id}-used-${createdAt}`.replace(/[^a-zA-Z0-9_.:-]+/g, "-").slice(0, 160);
    if (this.manualGateAudits.some((audit) => audit.id === id)) throw new Error("manual gate audit id already exists");
    const record = createManualGateAuditRecord({
      id,
      gate_id: gate.gate_id,
      gate_type: gate.gate_type,
      action: "manual_gate.used",
      actor_type: "system",
      target_environment: gate.target_environment,
      target_commit_sha: gate.target_commit_sha,
      safe_summary: { status: "used", source: "provider_apply_transaction" },
      created_at: createdAt
    });
    this.manualGateAudits.push(record);
    return record;
  }

  private failure(draft: ProviderApplyTransactionDraft, failedPhase: ProviderApplyTransactionFailure["failed_phase"], compensationRequired: boolean, nextOperatorAction: string, failedAt: string, safeSummary: SafeAuditSummary) {
    return createProviderApplyTransactionFailure({
      transaction_id: draft.transaction_id,
      job_id: draft.job_id,
      manual_gate_id: draft.manual_gate_id,
      failed_phase: failedPhase,
      compensation_required: compensationRequired,
      next_operator_action: nextOperatorAction,
      safe_summary: safeSummary,
      failed_at: failedAt
    });
  }

  private requireTransaction(transactionId: string) {
    const draft = this.transactions.get(transactionId);
    if (!draft) throw new Error("provider apply transaction was not found");
    return draft;
  }

  private requireJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error("provider deployment job was not found");
    return job;
  }

  private requireGate(gateId: string) {
    const gate = this.gates.get(gateId);
    if (!gate) throw new Error("manual gate not found");
    return gate;
  }

  private snapshot() {
    return {
      jobs: new Map(this.jobs),
      gates: new Map(this.gates),
      providerAudits: [...this.providerAudits],
      manualGateAudits: [...this.manualGateAudits]
    };
  }

  private restore(snapshot: ReturnType<InMemoryTransactionalProviderDeploymentRepository["snapshot"]>) {
    this.jobs.clear();
    for (const [key, value] of snapshot.jobs) this.jobs.set(key, value);
    this.gates.clear();
    for (const [key, value] of snapshot.gates) this.gates.set(key, value);
    this.providerAudits.length = 0;
    this.providerAudits.push(...snapshot.providerAudits);
    this.manualGateAudits.length = 0;
    this.manualGateAudits.push(...snapshot.manualGateAudits);
  }
}
