import {
  assertProductionManualGateAndRegistry,
  markManualGateUsedAfterApply,
  type ManualGateApproval,
  type ManualGateRegistry,
  type ManualGateType
} from "./manual-gates.js";

export type ProviderDeploymentCredentialSource = "secret_manager" | "provider_specific";

export type ProviderDeploymentApplyPlan = {
  operation: ManualGateType;
  target: string;
  dryRun: boolean;
  credentialSource: ProviderDeploymentCredentialSource;
  credentialRef: string;
  rollbackPlanRef: string;
  operatorRunbookRef: string;
  safeSummary: Record<string, string | number | boolean>;
};

export type ProviderDeploymentApplyResult = {
  status: "planned" | "applied";
  dryRun: boolean;
  operation: ManualGateType;
  target: string;
  rollbackPlanRef: string;
  operatorRunbookRef: string;
  safeSummary: Record<string, string | number | boolean>;
};

export interface ProviderDeploymentApply {
  apply(plan: ProviderDeploymentApplyPlan, options: { dryRun: boolean; manualApproval: boolean }): Promise<ProviderDeploymentApplyResult>;
}

export class MockProviderDeploymentApply implements ProviderDeploymentApply {
  readonly applications: ProviderDeploymentApplyPlan[] = [];

  async apply(plan: ProviderDeploymentApplyPlan, options: { dryRun: boolean; manualApproval: boolean }) {
    if (!options.dryRun && !options.manualApproval) throw new Error("approved manual gate is required for provider deployment apply");
    this.applications.push(plan);
    return sanitizeProviderDeploymentResult({
      status: options.dryRun ? "planned" : "applied",
      dryRun: options.dryRun,
      operation: plan.operation,
      target: plan.target,
      rollbackPlanRef: plan.rollbackPlanRef,
      operatorRunbookRef: plan.operatorRunbookRef,
      safeSummary: plan.safeSummary
    });
  }
}

export class ProviderSpecificDeploymentApply implements ProviderDeploymentApply {
  constructor(private readonly provider: ProviderDeploymentApply, private readonly providerName: string) {}

  async apply(plan: ProviderDeploymentApplyPlan, options: { dryRun: boolean; manualApproval: boolean }) {
    if (!this.providerName) throw new Error("provider name is required");
    return this.provider.apply(plan, options);
  }
}

export async function executeProviderDeploymentApply(args: {
  provider: ProviderDeploymentApply;
  plan: ProviderDeploymentApplyPlan;
  productionLike?: boolean | undefined;
  manualApproval?: boolean | undefined;
  manualGate?: ManualGateApproval | undefined;
  manualGateRegistry?: ManualGateRegistry | undefined;
  targetCommitSha?: string | undefined;
  targetEnvironment?: string | undefined;
  now?: Date | undefined;
}) {
  assertProviderDeploymentPlanSafety(args.plan);
  let productionGate: ManualGateApproval | undefined;
  if (!args.plan.dryRun && args.productionLike) {
    productionGate = assertProductionManualGateAndRegistry({
      registry: args.manualGateRegistry,
      gate: args.manualGate,
      gateType: args.plan.operation,
      targetCommitSha: args.targetCommitSha ?? "",
      targetEnvironment: args.targetEnvironment,
      now: args.now
    });
  }

  const result = await args.provider.apply(args.plan, {
    dryRun: args.plan.dryRun,
    manualApproval: args.manualApproval === true || Boolean(productionGate) || (!args.productionLike && Boolean(args.manualGate))
  });

  const safeResult = sanitizeProviderDeploymentResult(result);
  if (!args.plan.dryRun && args.productionLike) {
    markManualGateUsedAfterApply({ registry: args.manualGateRegistry, gate: productionGate });
  }
  return safeResult;
}

export function assertProviderDeploymentPlanSafety(plan: ProviderDeploymentApplyPlan) {
  if (!plan.rollbackPlanRef) throw new Error("provider deployment rollback evidence is required");
  if (!plan.operatorRunbookRef) throw new Error("provider deployment operator runbook reference is required");
  assertSafeReference(plan.credentialRef, "provider credential reference");
  assertSafeSummary(plan.safeSummary);
  return plan;
}

export function sanitizeProviderDeploymentResult(result: ProviderDeploymentApplyResult): ProviderDeploymentApplyResult {
  return {
    status: result.status,
    dryRun: result.dryRun,
    operation: result.operation,
    target: sanitizeSafeText(result.target),
    rollbackPlanRef: sanitizeSafeText(result.rollbackPlanRef),
    operatorRunbookRef: sanitizeSafeText(result.operatorRunbookRef),
    safeSummary: Object.fromEntries(
      Object.entries(result.safeSummary).map(([key, value]) => [sanitizeSafeText(key).slice(0, 64), sanitizeSafeText(value)])
    )
  };
}

function assertSafeReference(value: string, label: string) {
  if (!value) throw new Error(`${label} is required`);
  if (/=|Bearer\s+|https?:\/\/|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}|webhook/i.test(value)) {
    throw new Error(`${label} must be a reference, not a secret value`);
  }
  if (/\b(secret|token|oauth|api[_-]?key|private)\b/i.test(value) && !/ref|name|projects\/[^/]+\/secrets\/[^/]+/.test(value)) {
    throw new Error(`${label} must use a safe reference name`);
  }
}

function assertSafeSummary(summary: Record<string, string | number | boolean>) {
  const serialized = JSON.stringify(summary);
  if (unsafeValuePattern().test(serialized)) throw new Error("provider deployment summary contains unsafe value");
}

function sanitizeSafeText(value: unknown) {
  return String(value)
    .replace(/[\r\n]/g, " ")
    .replace(unsafeValuePattern(), "[redacted]")
    .slice(0, 160);
}

function unsafeValuePattern() {
  return /Bearer\s+|https?:\/\/|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}|webhook|api[_-]?key|oauth|secret|token|private|raw[_-]?message|display[_-]?name/i;
}
