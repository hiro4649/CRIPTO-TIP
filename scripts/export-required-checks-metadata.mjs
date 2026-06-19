#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { valueAfter, hasFlag, readJson, writeJson, buildRequiredChecksMetadata } from "./ci-safe-lib.mjs";

const args = process.argv.slice(2);
const fixture = valueAfter(args, "--fixture");
const output = valueAfter(args, "--output") || "reports/ci-required-checks-metadata.json";
const noExit = hasFlag(args, "--no-exit");
const waitMs = Math.min(Number(valueAfter(args, "--wait-ms") || 300000), 300000);
const pollMs = Math.max(Number(valueAfter(args, "--poll-ms") || 5000), 5000);
const targetHeadArg = valueAfter(args, "--target-head");

function ghJson(ghArgs) {
  const result = spawnSync("gh", ghArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error("github metadata unavailable");
  return result.stdout ? JSON.parse(result.stdout) : {};
}

function workflowRunIdFromDetailsUrl(value) {
  const match = String(value || "").match(/\/actions\/runs\/(\d+)(?:\/job\/(\d+))?/);
  return match?.[1] || "";
}

function normalizeApiCheckRun(checkRun, workflowRun) {
  const workflowRunId = workflowRunIdFromDetailsUrl(checkRun.details_url);
  return {
    check_name: checkRun.name || "",
    workflow_name: workflowRun?.name || checkRun.name || "",
    status: checkRun.status || "unknown",
    conclusion: checkRun.conclusion || "unknown",
    head_sha: checkRun.head_sha || workflowRun?.head_sha || "",
    check_run_id: String(checkRun.id || ""),
    workflow_run_id: String(workflowRunId || workflowRun?.id || ""),
    run_attempt: Number(workflowRun?.run_attempt || 0),
    workflow_run_created_at: workflowRun?.created_at || "",
    started_at: checkRun.started_at || "",
    completed_at: checkRun.completed_at || ""
  };
}

function buildFixtureInput(path) {
  let input = readJson(path);
  if (!input.target_head_sha && Array.isArray(input.checks) && input.checks[0]?.head_sha) {
    input = { ...input, target_head_sha: input.checks[0].head_sha };
  }
  return {
    ...input,
    head_provenance: input.head_provenance || "fixture_exact_head",
    artifact_generation_phase: input.artifact_generation_phase || "post_required_checks"
  };
}

function resolveTargetHead(pr, repo) {
  if (targetHeadArg) return targetHeadArg;
  const view = ghJson(["pr", "view", pr, "--repo", repo, "--json", "headRefOid"]);
  return view.headRefOid || process.env.CODEX_PR_HEAD_SHA || process.env.GITHUB_SHA || "";
}

function fetchCommitCheckRuns(repo, targetHead) {
  const response = ghJson(["api", `repos/${repo}/commits/${targetHead}/check-runs`]);
  const checkRuns = Array.isArray(response.check_runs) ? response.check_runs : [];
  const workflowRunCache = new Map();
  return checkRuns.map((checkRun) => {
    const workflowRunId = workflowRunIdFromDetailsUrl(checkRun.details_url);
    let workflowRun = {};
    if (workflowRunId) {
      if (!workflowRunCache.has(workflowRunId)) {
        try {
          workflowRunCache.set(workflowRunId, ghJson(["api", `repos/${repo}/actions/runs/${workflowRunId}`]));
        } catch {
          workflowRunCache.set(workflowRunId, {});
        }
      }
      workflowRun = workflowRunCache.get(workflowRunId);
    }
    return normalizeApiCheckRun(checkRun, workflowRun);
  });
}

function buildRemoteInput() {
  const pr = valueAfter(args, "--pr");
  const repo = valueAfter(args, "--repo") || process.env.GITHUB_REPOSITORY;
  if (!pr || !repo) throw new Error("--pr and --repo are required without --fixture");
  const targetHead = resolveTargetHead(pr, repo);
  return {
    target_head_sha: targetHead,
    head_provenance: "commit_check_runs_api",
    artifact_generation_phase: "post_required_checks",
    checks: fetchCommitCheckRuns(repo, targetHead)
  };
}

let metadata;
if (fixture) {
  metadata = buildRequiredChecksMetadata(buildFixtureInput(fixture));
} else {
  const started = Date.now();
  do {
    metadata = buildRequiredChecksMetadata(buildRemoteInput());
    if (metadata.same_head_required_checks_passed || metadata.safe_reason_code !== "required_checks_pending") break;
    if (Date.now() - started >= waitMs) {
      metadata = { ...metadata, safe_reason_code: "required_checks_timeout" };
      break;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, pollMs);
  } while (true);
}

writeJson(output, metadata);
console.log(`Required checks metadata: ${metadata.same_head_required_checks_passed ? "pass" : metadata.safe_reason_code}`);
if (!metadata.same_head_required_checks_passed && !noExit) process.exit(1);
