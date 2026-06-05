export const manualGateTypes = [
  "youtube_live_soak",
  "dashboard_apply",
  "external_alert_apply",
  "provider_secret_rotation",
  "provider_specific_deployment_apply",
  "production_rpc_enable",
  "iris_core_delivery_enable",
  "overlay_token_rotation_apply"
] as const;

export type ManualGateType = typeof manualGateTypes[number];

export const manualGateStatuses = ["not_requested", "requested", "approved", "rejected", "expired", "used"] as const;

export type ManualGateStatus = typeof manualGateStatuses[number];

export type ManualGateApproval = {
  gate_id: string;
  gate_type: ManualGateType;
  status: ManualGateStatus;
  required_before: string;
  target_environment: string;
  target_commit_sha: string;
  requested_by: string;
  approved_by_role: string;
  approval_timestamp: string;
  required_evidence: string[];
  rollback_plan_ref: string;
  operator_runbook_ref: string;
  secret_source_ref: string;
  expires_at: string;
  notes?: string;
};

export interface ManualGateRegistry {
  createRequestedGate(gate: ManualGateApproval): ManualGateApproval;
  approveGate(gateId: string, approvedByRole: string, approvalTimestamp: string): ManualGateApproval;
  getGate(gateId: string): ManualGateApproval | undefined;
  markUsed(gateId: string): ManualGateApproval;
}

export class InMemoryManualGateRegistry implements ManualGateRegistry {
  private readonly gates = new Map<string, ManualGateApproval>();

  createRequestedGate(gate: ManualGateApproval) {
    const normalized = validateManualGateApproval({ ...gate, status: "requested" });
    this.gates.set(normalized.gate_id, normalized);
    return normalized;
  }

  approveGate(gateId: string, approvedByRole: string, approvalTimestamp: string) {
    const gate = this.requireGate(gateId);
    const approved = validateManualGateApproval({
      ...gate,
      status: "approved",
      approved_by_role: approvedByRole,
      approval_timestamp: approvalTimestamp
    });
    this.gates.set(gateId, approved);
    return approved;
  }

  getGate(gateId: string) {
    return this.gates.get(gateId);
  }

  markUsed(gateId: string) {
    const gate = this.requireGate(gateId);
    if (gate.status === "used") throw new Error("manual gate has already been used");
    const used = { ...gate, status: "used" as const };
    this.gates.set(gateId, used);
    return used;
  }

  private requireGate(gateId: string) {
    const gate = this.gates.get(gateId);
    if (!gate) throw new Error("manual gate not found");
    return gate;
  }
}

export function validateManualGateApproval(gate: ManualGateApproval) {
  if (!manualGateTypes.includes(gate.gate_type)) throw new Error("manual gate type is invalid");
  if (!manualGateStatuses.includes(gate.status)) throw new Error("manual gate status is invalid");
  if (!/^[0-9a-f]{40}$/i.test(gate.target_commit_sha)) throw new Error("manual gate target_commit_sha is required");
  if (!gate.required_before) throw new Error("manual gate required_before is required");
  if (!gate.target_environment) throw new Error("manual gate target_environment is required");
  if (!gate.requested_by) throw new Error("manual gate requested_by is required");
  if (gate.status === "approved" && gate.approved_by_role !== "project-owner") throw new Error("manual gate requires project-owner approval");
  if (!gate.rollback_plan_ref) throw new Error("manual gate rollback_plan_ref is required");
  if (!gate.operator_runbook_ref) throw new Error("manual gate operator_runbook_ref is required");
  assertSafeSecretSourceRef(gate.secret_source_ref);
  assertNoUnsafeManualGateEvidence(JSON.stringify(gate));
  return gate;
}

export function assertManualGateApproval(gate: ManualGateApproval | undefined, expected: {
  gateType: ManualGateType;
  targetCommitSha: string;
  targetEnvironment?: string;
  now?: Date;
}) {
  if (!gate) throw new Error("approved manual gate is required");
  validateManualGateApproval(gate);
  if (gate.gate_type !== expected.gateType) throw new Error("manual gate type does not authorize this operation");
  if (gate.status !== "approved") throw new Error("manual gate is not approved");
  if (gate.target_commit_sha !== expected.targetCommitSha) throw new Error("manual gate target commit does not match");
  if (expected.targetEnvironment && gate.target_environment !== expected.targetEnvironment) throw new Error("manual gate target environment does not match");
  if (new Date(gate.expires_at).getTime() <= (expected.now ?? new Date()).getTime()) throw new Error("manual gate is expired");
  return gate;
}

export function manualGateExpectation(expected: {
  gateType: ManualGateType;
  targetCommitSha: string;
  targetEnvironment?: string | undefined;
  now?: Date | undefined;
}) {
  return {
    gateType: expected.gateType,
    targetCommitSha: expected.targetCommitSha,
    ...(expected.targetEnvironment ? { targetEnvironment: expected.targetEnvironment } : {}),
    ...(expected.now ? { now: expected.now } : {})
  };
}

export function markManualGateUsed(registry: ManualGateRegistry | undefined, gate: ManualGateApproval | undefined) {
  if (!registry || !gate) return;
  registry.markUsed(gate.gate_id);
}

function assertSafeSecretSourceRef(secretSourceRef: string) {
  if (!secretSourceRef) throw new Error("manual gate secret_source_ref is required");
  if (/=|Bearer\s+|https?:\/\/|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}/.test(secretSourceRef)) {
    throw new Error("manual gate secret_source_ref must be a secret reference, not a secret value");
  }
  if (/\b(secret|token|oauth|api[_-]?key|webhook|private)\b/i.test(secretSourceRef) && !/ref|name|projects\/[^/]+\/secrets\/[^/]+/.test(secretSourceRef)) {
    throw new Error("manual gate secret_source_ref must use a safe reference name");
  }
}

function assertNoUnsafeManualGateEvidence(value: string) {
  if (/Bearer\s+|https?:\/\/|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}/.test(value)) {
    throw new Error("manual gate evidence contains unsafe secret or private data");
  }
}
