import fs from "node:fs";
import { spawnSync } from "node:child_process";

export const safeReasonCodes = new Set([
  "typescript_external_runner_failure",
  "pnpm_test_failed_safe_summary",
  "pnpm_typecheck_passed_but_test_failed",
  "pnpm_typecheck_failed_safe_summary",
  "safe_artifact_missing_for_failed_ci",
  "workflow_metadata_mismatch",
  "required_check_name_mismatch",
  "wrong_working_directory",
  "product_code_failure",
  "external_runner_failure",
  "raw_log_required_but_forbidden",
  "same_head_required_checks_not_all_pass",
  "quality_gate_pass_but_required_check_failed",
  "metadata_limited_external_blocked"
]);

export const requiredChecks = ["quality-gate", "typescript", "contracts"];

export function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

export function hasFlag(args, flag) {
  return args.includes(flag);
}

export function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

export function writeJson(path, value) {
  fs.mkdirSync(dirname(path), { recursive: true });
  fs.writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function dirname(path) {
  return path.includes("/") || path.includes("\\") ? path.replace(/[\\/][^\\/]*$/, "") : ".";
}

export function nowIso() {
  return process.env.CI_SAFE_CREATED_AT || new Date().toISOString();
}

export function currentGithubContext() {
  return {
    repository: process.env.GITHUB_REPOSITORY || "hiro4649/CRIPTO-TIP",
    workflow_name: process.env.GITHUB_WORKFLOW || "ci",
    head_sha: process.env.CODEX_PR_HEAD_SHA || process.env.GITHUB_SHA || "metadata_limited",
    base_sha: process.env.CODEX_PR_BASE_SHA || process.env.GITHUB_BASE_SHA || "metadata_limited",
    run_id: process.env.GITHUB_RUN_ID || "metadata_limited",
    job_id: process.env.GITHUB_JOB || "metadata_limited",
    event_name: process.env.GITHUB_EVENT_NAME || "metadata_limited",
    branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "metadata_limited"
  };
}

export function makeSafeArtifact(input = {}) {
  const context = currentGithubContext();
  const artifact = {
    schema_version: "1.0.0",
    repository: input.repository || context.repository,
    workflow_name: input.workflow_name || context.workflow_name,
    check_name: input.check_name || "typescript",
    job_name: input.job_name || context.job_id,
    head_sha: input.head_sha || context.head_sha,
    base_sha: input.base_sha || context.base_sha,
    run_id: String(input.run_id || context.run_id),
    job_id: String(input.job_id || context.job_id),
    event_name: input.event_name || context.event_name,
    branch: input.branch || context.branch,
    command_class: input.command_class || "metadata",
    package_scope: input.package_scope || "workspace",
    working_directory: input.working_directory || process.cwd(),
    phase: input.phase || "metadata",
    exit_code: Number.isFinite(Number(input.exit_code)) ? Number(input.exit_code) : 0,
    result: input.result || (Number(input.exit_code || 0) === 0 ? "success" : "failure"),
    safe_reason_code: input.safe_reason_code || "metadata_limited_external_blocked",
    raw_log_required: Boolean(input.raw_log_required),
    raw_log_allowed: false,
    product_code_failure: Boolean(input.product_code_failure),
    external_runner_failure: Boolean(input.external_runner_failure),
    metadata_limited: Boolean(input.metadata_limited),
    same_head_required_checks_passed: Boolean(input.same_head_required_checks_passed),
    next_safe_action: input.next_safe_action || "Use safe artifact reason code and same-head required checks metadata; do not inspect raw logs.",
    created_at: input.created_at || nowIso()
  };
  validateSafeArtifact(artifact);
  return artifact;
}

export function validateSafeArtifact(artifact) {
  const forbiddenFields = ["raw_log", "raw_logs", "stdout", "stderr", "stack", "stack_trace", "file_contents", "dependency_tree"];
  for (const field of forbiddenFields) {
    if (Object.prototype.hasOwnProperty.call(artifact, field)) throw new Error(`safe artifact rejects raw field: ${field}`);
  }
  if (artifact.raw_log_allowed !== false) throw new Error("raw_log_allowed must be false");
  if (!safeReasonCodes.has(artifact.safe_reason_code)) throw new Error(`unknown safe_reason_code: ${artifact.safe_reason_code}`);
  const serialized = JSON.stringify(artifact);
  if (/Bearer\s+|ghp_|sk-|xoxb-|AKIA|https?:\/\/|0x[0-9a-fA-F]{40}/.test(serialized)) {
    throw new Error("safe artifact contains unsafe value");
  }
  return artifact;
}

export function classifySummary(input = {}) {
  const phase = input.phase || input.command_class || "metadata";
  const exitCode = Number(input.exit_code || 0);
  if (input.safe_artifact_missing) return "safe_artifact_missing_for_failed_ci";
  if (input.workflow_metadata_mismatch) return "workflow_metadata_mismatch";
  if (input.required_check_name_mismatch) return "required_check_name_mismatch";
  if (input.wrong_working_directory) return "wrong_working_directory";
  if (input.quality_gate_passed && input.required_checks_passed === false) return "quality_gate_pass_but_required_check_failed";
  if (input.metadata_limited) return "metadata_limited_external_blocked";
  if (input.external_runner_failure) return phase === "pnpm_typecheck" ? "typescript_external_runner_failure" : "external_runner_failure";
  if (phase === "pnpm_typecheck" && exitCode !== 0) return "pnpm_typecheck_failed_safe_summary";
  if (phase === "pnpm_test" && input.pnpm_typecheck_result === "success" && exitCode !== 0) return "pnpm_typecheck_passed_but_test_failed";
  if (phase === "pnpm_test" && exitCode !== 0) return "pnpm_test_failed_safe_summary";
  if (input.raw_log_required && input.raw_log_allowed !== true) return "raw_log_required_but_forbidden";
  if (input.product_code_failure) return "product_code_failure";
  return "metadata_limited_external_blocked";
}

export function runCommandNoRawOutput(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || process.cwd(),
    env: { ...process.env, ...(options.env || {}) },
    stdio: "ignore",
    shell: process.platform === "win32"
  });
}

export function normalizeChecks(input) {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.checks)) return input.checks;
  if (Array.isArray(input?.statusCheckRollup)) return input.statusCheckRollup;
  return [];
}

export function buildRequiredChecksMetadata(input) {
  const checks = normalizeChecks(input).map((check) => ({
    check_name: check.check_name || check.name,
    workflow_name: check.workflow_name || check.workflowName || check.workflow || check.name,
    status: check.status || "completed",
    conclusion: check.conclusion || check.state || "unknown",
    head_sha: check.head_sha || check.headSha,
    run_id: String(check.run_id || check.runId || check.databaseId || "")
  }));
  const headSet = new Set(checks.map((check) => check.head_sha).filter(Boolean));
  const missing = requiredChecks.filter((name) => !checks.some((check) => check.check_name === name));
  const unexpected = checks.filter((check) => requiredChecks.includes(check.check_name) === false);
  const allRequired = requiredChecks.map((name) => checks.find((check) => check.check_name === name));
  const sameHeadRequiredChecksPassed = missing.length === 0 && headSet.size === 1 && allRequired.every((check) => check?.conclusion === "success");
  let safeReasonCode = sameHeadRequiredChecksPassed ? "product_code_failure" : "same_head_required_checks_not_all_pass";
  if (unexpected.length) safeReasonCode = "required_check_name_mismatch";
  if (checks.some((check) => check.check_name === "quality-gate" && check.conclusion === "success") && allRequired.some((check) => check && check.conclusion !== "success")) {
    safeReasonCode = "quality_gate_pass_but_required_check_failed";
  }
  return {
    schema_version: "1.0.0",
    required_checks: requiredChecks,
    checks,
    missing_checks: missing,
    unexpected_checks: unexpected.map((check) => check.check_name),
    same_head_required_checks_passed: sameHeadRequiredChecksPassed,
    safe_reason_code: safeReasonCode,
    raw_log_allowed: false,
    created_at: nowIso()
  };
}
