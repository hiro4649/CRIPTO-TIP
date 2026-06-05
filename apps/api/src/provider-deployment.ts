import {
  assertProductionManualGateAndRegistry,
  markManualGateUsedAfterApply,
  type ManualGateApproval,
  type ManualGateRegistry,
  type ManualGateType
} from "./manual-gates.js";

export type ProviderDeploymentOperation = {
  gateType: Extract<ManualGateType, "dashboard_apply" | "external_alert_apply" | "provider_specific_deployment_apply">;
  dryRun: boolean;
  targetCommitSha: string;
  targetEnvironment: string;
  rollbackPlanRef: string;
  operatorRunbookRef: string;
  safeSummary: Record<string, string | number | boolean>;
};

export type ProviderDeploymentAuditEvidence = {
  status: "planned" | "applied";
  dryRun: boolean;
  gateType: ProviderDeploymentOperation["gateType"];
  targetEnvironment: string;
  targetCommitSha: string;
  rollbackPlanRef: string;
  operatorRunbookRef: string;
  safeSummary: Record<string, string | number | boolean>;
};

export async function executeProviderDeploymentApply<TResult>(args: {
  operation: ProviderDeploymentOperation;
  productionLike?: boolean | undefined;
  manualApproval?: boolean | undefined;
  manualGate?: ManualGateApproval | undefined;
  manualGateRegistry?: ManualGateRegistry | undefined;
  apply: (options: { dryRun: boolean; manualApproval: boolean }) => Promise<TResult>;
}) {
  assertProviderDeploymentOperation(args.operation);
  let productionGate: ManualGateApproval | undefined;
  if (!args.operation.dryRun && args.productionLike) {
    productionGate = assertProductionManualGateAndRegistry({
      registry: args.manualGateRegistry,
      gate: args.manualGate,
      gateType: args.operation.gateType,
      targetCommitSha: args.operation.targetCommitSha,
      targetEnvironment: args.operation.targetEnvironment
    });
  }

  const result = await args.apply({
    dryRun: args.operation.dryRun,
    manualApproval: args.manualApproval === true || Boolean(productionGate) || (!args.productionLike && Boolean(args.manualGate))
  });

  assertSafeProviderDeploymentResult(result);
  if (!args.operation.dryRun && args.productionLike) {
    markManualGateUsedAfterApply({ registry: args.manualGateRegistry, gate: productionGate });
  }

  return {
    result,
    auditEvidence: buildProviderDeploymentAuditEvidence(args.operation)
  };
}

export function buildProviderDeploymentAuditEvidence(operation: ProviderDeploymentOperation): ProviderDeploymentAuditEvidence {
  assertProviderDeploymentOperation(operation);
  return {
    status: operation.dryRun ? "planned" : "applied",
    dryRun: operation.dryRun,
    gateType: operation.gateType,
    targetEnvironment: operation.targetEnvironment,
    targetCommitSha: operation.targetCommitSha,
    rollbackPlanRef: operation.rollbackPlanRef,
    operatorRunbookRef: operation.operatorRunbookRef,
    safeSummary: operation.safeSummary
  };
}

export function assertProviderDeploymentOperation(operation: ProviderDeploymentOperation) {
  if (!operation.targetCommitSha || !/^[0-9a-f]{40}$/i.test(operation.targetCommitSha)) throw new Error("provider deployment target commit SHA is required");
  if (!operation.targetEnvironment) throw new Error("provider deployment target environment is required");
  if (!operation.rollbackPlanRef) throw new Error("provider deployment rollback plan reference is required");
  if (!operation.operatorRunbookRef) throw new Error("provider deployment operator runbook reference is required");
  assertSafeProviderDeploymentResult(operation.safeSummary);
}

export function assertSafeProviderDeploymentResult(value: unknown) {
  const serialized = JSON.stringify(value);
  if (/Bearer\s+|https?:\/\/|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}/i.test(serialized)) {
    throw new Error("provider deployment result contains unsafe secret or private data");
  }
  if (/\b(wallet_address|raw_message|raw_display_name|oauth_token|api_key|webhook_url|private_url)\b/i.test(serialized)) {
    throw new Error("provider deployment result contains unsafe field name");
  }
}
