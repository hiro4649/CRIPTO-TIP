import { buildYouTubeDashboardContract, youtubeAlertConfigs } from "./deployment-observability.js";
import { executeProviderDeploymentApply, type ProviderDeploymentApplyResult } from "../provider-deployment.js";
import { type ManualGateApproval, type ManualGateRegistry } from "../manual-gates.js";
import type { YouTubeMetricName } from "./operations.js";

export type DashboardCredentialSource = "secret_manager" | "provider_specific";

export type DashboardCredentialReference = {
  source: DashboardCredentialSource;
  secretName?: string;
  providerName?: string;
};

export type DashboardDeploymentPlan = {
  title: string;
  panels: { title: string; metrics: YouTubeMetricName[] }[];
  alerts: { id: string; metric: YouTubeMetricName; operatorAction: string }[];
  credentialSource: DashboardCredentialSource;
  credentialRef: string;
  dryRun: boolean;
};

export type DashboardDeploymentResult = {
  status: "planned" | "applied";
  dryRun: boolean;
  panelCount: number;
  alertCount: number;
};

export interface DashboardProvider {
  deploy(plan: DashboardDeploymentPlan, options: { dryRun: boolean; manualApproval: boolean }): Promise<DashboardDeploymentResult>;
}

export class MockDashboardProvider implements DashboardProvider {
  readonly deployments: DashboardDeploymentPlan[] = [];

  async deploy(plan: DashboardDeploymentPlan, options: { dryRun: boolean; manualApproval: boolean }) {
    if (!options.dryRun && !options.manualApproval) throw new Error("manual approval is required for dashboard deployment apply");
    this.deployments.push(plan);
    return {
      status: options.dryRun ? "planned" as const : "applied" as const,
      dryRun: options.dryRun,
      panelCount: plan.panels.length,
      alertCount: plan.alerts.length
    };
  }
}

export class ProviderSpecificDashboardProvider implements DashboardProvider {
  constructor(private readonly provider: DashboardProvider, private readonly providerName: string) {}

  async deploy(plan: DashboardDeploymentPlan, options: { dryRun: boolean; manualApproval: boolean }) {
    if (!this.providerName) throw new Error("provider name is required");
    return this.provider.deploy(plan, options);
  }
}

export function assertDashboardCredentialBoundary(credentials: DashboardCredentialReference, productionLike = false) {
  if (productionLike && credentials.source !== "secret_manager" && credentials.source !== "provider_specific") {
    throw new Error("production dashboard credentials must use secret_manager or provider_specific source");
  }
  if (!credentials.secretName) throw new Error("dashboard provider credential secret name is required");
  return credentials;
}

export function buildDashboardDeploymentPlan(args: {
  credentials: DashboardCredentialReference;
  dryRun?: boolean;
  productionLike?: boolean;
}): DashboardDeploymentPlan {
  const credentials = assertDashboardCredentialBoundary(args.credentials, args.productionLike);
  const credentialRef = credentials.secretName;
  if (!credentialRef) throw new Error("dashboard provider credential secret name is required");
  const contract = buildYouTubeDashboardContract();
  return {
    title: contract.title,
    panels: contract.panels.map((panel) => ({ title: panel.title, metrics: panel.metrics as YouTubeMetricName[] })),
    alerts: youtubeAlertConfigs.map((alert) => ({
      id: alert.id,
      metric: alert.metric,
      operatorAction: alert.operatorAction
    })),
    credentialSource: credentials.source,
    credentialRef,
    dryRun: args.dryRun ?? true
  };
}

export async function deployDashboard(args: {
  provider: DashboardProvider;
  plan: DashboardDeploymentPlan;
  manualApproval?: boolean;
  manualGate?: ManualGateApproval;
  manualGateRegistry?: ManualGateRegistry;
  productionLike?: boolean;
  targetCommitSha?: string;
  targetEnvironment?: string;
}) {
  let result: DashboardDeploymentResult | undefined;
  await executeProviderDeploymentApply({
    provider: {
      apply: async (_plan, options): Promise<ProviderDeploymentApplyResult> => {
        result = await args.provider.deploy(args.plan, options);
        return {
          status: result.status,
          dryRun: result.dryRun,
          operation: "dashboard_apply",
          target: args.plan.title,
          rollbackPlanRef: "docs/DASHBOARD_DEPLOYMENT.md#rollback",
          operatorRunbookRef: "docs/RUNBOOK.md#dashboard-deployment",
          safeSummary: {
            panelCount: result.panelCount,
            alertCount: result.alertCount
          }
        };
      }
    },
    plan: {
      operation: "dashboard_apply",
      target: args.plan.title,
      dryRun: args.plan.dryRun,
      credentialSource: args.plan.credentialSource,
      credentialRef: args.plan.credentialRef,
      rollbackPlanRef: "docs/DASHBOARD_DEPLOYMENT.md#rollback",
      operatorRunbookRef: "docs/RUNBOOK.md#dashboard-deployment",
      safeSummary: {
        panelCount: args.plan.panels.length,
        alertCount: args.plan.alerts.length
      }
    },
    productionLike: args.productionLike,
    manualApproval: args.manualApproval,
    manualGate: args.manualGate,
    manualGateRegistry: args.manualGateRegistry,
    targetCommitSha: args.targetCommitSha,
    targetEnvironment: args.targetEnvironment
  });
  if (!result) throw new Error("dashboard provider did not return a result");
  return result;
}

export function buildDashboardRollbackPlan(plan: DashboardDeploymentPlan) {
  return {
    status: "ready" as const,
    steps: [
      "restore_previous_dashboard_revision",
      "verify_dashboard_metric_parity",
      "confirm_alert_routes_disabled_or_restored",
      "record_operator_review"
    ],
    title: plan.title
  };
}

export interface AlertRoutingProvider {
  planRoutes(alerts: DashboardDeploymentPlan["alerts"]): { status: "planned"; routeCount: number };
}

export class StubAlertRoutingProvider implements AlertRoutingProvider {
  planRoutes(alerts: DashboardDeploymentPlan["alerts"]) {
    return { status: "planned" as const, routeCount: alerts.length };
  }
}

export function mapDashboardProviderErrorToOperatorAction(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/credential|secret|auth/i.test(message)) return "verify_dashboard_provider_credentials";
  if (/manual approval/i.test(message)) return "obtain_manual_deployment_approval";
  return "inspect_dashboard_provider_error";
}
