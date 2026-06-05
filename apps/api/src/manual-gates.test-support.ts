import type { ManualGateApproval, ManualGateType } from "./manual-gates.js";

export const targetCommitSha = "1234567890abcdef1234567890abcdef12345678";

export function makeManualGate(gate_type: ManualGateType, overrides: Partial<ManualGateApproval> = {}): ManualGateApproval {
  return {
    gate_id: `${gate_type}-gate-1`,
    gate_type,
    status: "approved",
    required_before: "production_apply",
    target_environment: "production",
    target_commit_sha: targetCommitSha,
    requested_by: "codex",
    approved_by_role: "project-owner",
    approval_timestamp: "2026-06-05T00:00:00.000Z",
    required_evidence: ["ci_pass", "quality_gate_pass", "rollback_plan"],
    rollback_plan_ref: "docs/RUNBOOK.md#rollback",
    operator_runbook_ref: "docs/RUNBOOK.md#manual-gates",
    secret_source_ref: "projects/example/secrets/provider-ref",
    expires_at: "2099-01-01T00:00:00.000Z",
    notes: "safe summary only",
    ...overrides
  };
}
