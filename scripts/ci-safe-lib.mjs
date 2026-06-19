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
  "required_checks_pending",
  "required_checks_timeout",
  "required_check_latest_run_failed",
  "required_check_head_mismatch",
  "required_check_duplicate_ambiguous",
  "required_check_metadata_incomplete",
  "wrong_working_directory",
  "product_code_failure",
  "external_runner_failure",
  "raw_log_required_but_forbidden",
  "same_head_required_checks_all_pass",
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
  if (Array.isArray(input?.check_runs)) return input.check_runs;
  if (Array.isArray(input?.checks)) return input.checks;
  if (Array.isArray(input?.statusCheckRollup)) return input.statusCheckRollup;
  return [];
}

function normalizeCheckStatus(value) {
  const normalized = String(value || "unknown").toLowerCase();
  if (normalized === "in_progress") return "in_progress";
  if (normalized === "queued") return "queued";
  if (normalized === "completed") return "completed";
  return normalized;
}

function normalizeCheckConclusion(value) {
  const normalized = String(value || "unknown").toLowerCase();
  if (normalized === "success") return "success";
  if (normalized === "failure") return "failure";
  if (normalized === "cancelled") return "cancelled";
  if (normalized === "timed_out") return "timed_out";
  if (normalized === "action_required") return "action_required";
  if (normalized === "skipped") return "skipped";
  if (normalized === "neutral") return "neutral";
  return normalized;
}

function workflowRunIdFromDetailsUrl(value) {
  const match = String(value || "").match(/\/actions\/runs\/(\d+)(?:\/job\/(\d+))?/);
  return {
    workflowRunId: match?.[1] || "",
    checkRunId: match?.[2] || ""
  };
}

function timestamp(check, snake, camel) {
  const value = check[snake] || check[camel] || "";
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function runAttempt(check) {
  const value = Number(check.run_attempt || check.runAttempt || 0);
  return Number.isFinite(value) ? value : 0;
}

function latestRank(check) {
  return [
    timestamp(check, "workflow_run_created_at", "workflowRunCreatedAt"),
    runAttempt(check),
    timestamp(check, "started_at", "startedAt"),
    timestamp(check, "completed_at", "completedAt")
  ];
}

function compareRankDesc(a, b) {
  const left = latestRank(a);
  const right = latestRank(b);
  for (let index = 0; index < left.length; index += 1) {
    const delta = right[index] - left[index];
    if (delta !== 0) return delta;
  }
  return 0;
}

function normalizeCheckProjection(check, targetHeadSha = "") {
  const parsed = workflowRunIdFromDetailsUrl(check.detailsUrl || check.details_url);
  const workflowRunId = String(check.workflow_run_id || check.workflowRunId || check.run_id || check.runId || parsed.workflowRunId || "");
  const checkRunId = String(check.check_run_id || check.checkRunId || check.databaseId || parsed.checkRunId || "");
  return {
    check_name: check.check_name || check.name,
    workflow_name: check.workflow_name || check.workflowName || check.workflow || check.name,
    status: normalizeCheckStatus(check.status || check.state),
    conclusion: normalizeCheckConclusion(check.conclusion),
    head_sha: check.head_sha || check.headSha || targetHeadSha,
    check_run_id: checkRunId,
    workflow_run_id: workflowRunId,
    run_attempt: Number(check.run_attempt ?? check.runAttempt ?? 1),
    workflow_run_created_at: check.workflow_run_created_at || check.workflowRunCreatedAt || "",
    started_at: check.started_at || check.startedAt || "",
    completed_at: check.completed_at || check.completedAt || ""
  };
}

function validHeadSha(value) {
  return /^[0-9a-f]{40}$/i.test(String(value || ""));
}

function selectRequiredCheck(checks, name, targetHeadSha) {
  const candidates = checks.filter((check) => check.check_name === name);
  if (!candidates.length) return { selected: undefined, reason: "missing" };
  const sameHead = candidates.filter((check) => targetHeadSha ? check.head_sha === targetHeadSha : Boolean(check.head_sha));
  if (!sameHead.length) return { selected: candidates.sort(compareRankDesc)[0], reason: "head_mismatch" };
  const sorted = sameHead.sort(compareRankDesc);
  if (sorted.length > 1 && compareRankDesc(sorted[0], sorted[1]) === 0) return { selected: sorted[0], reason: "duplicate_ambiguous" };
  if (sorted[0].status !== "completed") return { selected: sorted[0], reason: "pending" };
  if (sorted[0].conclusion !== "success") return { selected: sorted[0], reason: "failed" };
  return { selected: sorted[0], reason: "selected" };
}

export function buildRequiredChecksMetadata(input) {
  const targetHeadSha = input?.target_head_sha || input?.head_sha || input?.headRefOid || process.env.CODEX_PR_HEAD_SHA || process.env.GITHUB_SHA || "";
  const headProvenance = input?.head_provenance || "metadata_limited";
  const artifactGenerationPhase = input?.artifact_generation_phase || "metadata_limited";
  const checks = normalizeChecks(input).map((check) => normalizeCheckProjection(check, targetHeadSha));
  const selectedByName = new Map();
  const selectionReasons = {};
  for (const name of requiredChecks) {
    const selection = selectRequiredCheck(checks, name, targetHeadSha);
    if (selection.selected) selectedByName.set(name, selection.selected);
    selectionReasons[name] = selection.reason;
  }
  const selectedRequired = requiredChecks.map((name) => selectedByName.get(name)).filter(Boolean);
  const headSet = new Set(selectedRequired.map((check) => check.head_sha).filter(Boolean));
  const missing = requiredChecks.filter((name) => !selectedByName.has(name));
  const ambiguousRequired = requiredChecks.filter((name) => selectionReasons[name] === "duplicate_ambiguous");
  const pendingRequired = requiredChecks.filter((name) => selectionReasons[name] === "pending");
  const failedRequired = requiredChecks.filter((name) => selectionReasons[name] === "failed");
  const headMismatchRequired = requiredChecks.filter((name) => selectionReasons[name] === "head_mismatch");
  const selectedRunIdsPresent = selectedRequired.every((check) => check.workflow_run_id && check.check_run_id);
  const allRequiredCompleted = selectedRequired.length === requiredChecks.length && selectedRequired.every((check) => check.status === "completed");
  const allRequiredSuccess = selectedRequired.length === requiredChecks.length && selectedRequired.every((check) => check.conclusion === "success");
  const metadataComplete = validHeadSha(targetHeadSha) &&
    headProvenance !== "metadata_limited" &&
    artifactGenerationPhase === "post_required_checks" &&
    selectedRunIdsPresent &&
    selectedRequired.every((check) => Number.isFinite(Number(check.run_attempt)) && Number(check.run_attempt) > 0);
  const sameHeadRequiredChecksPassed = metadataComplete &&
    missing.length === 0 &&
    headSet.size === 1 &&
    headSet.has(targetHeadSha) &&
    allRequiredCompleted &&
    allRequiredSuccess &&
    ambiguousRequired.length === 0;
  let safeReasonCode = sameHeadRequiredChecksPassed ? "same_head_required_checks_all_pass" : "same_head_required_checks_not_all_pass";
  if (!validHeadSha(targetHeadSha) || !metadataComplete) safeReasonCode = "required_check_metadata_incomplete";
  if (headMismatchRequired.length || (headSet.size > 1 || (headSet.size === 1 && !headSet.has(targetHeadSha)))) safeReasonCode = "required_check_head_mismatch";
  if (ambiguousRequired.length) safeReasonCode = "required_check_duplicate_ambiguous";
  if (pendingRequired.length) safeReasonCode = "required_checks_pending";
  if (failedRequired.length) safeReasonCode = "required_check_latest_run_failed";
  if (selectedRequired.some((check) => check.check_name === "quality-gate" && check.conclusion === "success") && selectedRequired.some((check) => check.status === "completed" && check.conclusion !== "success")) {
    safeReasonCode = "quality_gate_pass_but_required_check_failed";
  }
  return {
    schema_version: "1.0.0",
    artifact_generation_phase: artifactGenerationPhase,
    head_provenance: headProvenance,
    required_checks: requiredChecks,
    checks: selectedRequired,
    all_checks_observed: checks,
    missing_checks: missing,
    auxiliary_checks_observed: checks.filter((check) => requiredChecks.includes(check.check_name) === false).map((check) => check.check_name),
    unexpected_checks: [],
    ambiguous_required_checks: ambiguousRequired,
    selection_reasons: selectionReasons,
    target_head_sha: targetHeadSha,
    same_head_required_checks_passed: sameHeadRequiredChecksPassed,
    safe_reason_code: safeReasonCode,
    raw_log_allowed: false,
    created_at: nowIso()
  };
}
