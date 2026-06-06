#!/usr/bin/env node
import { valueAfter, hasFlag, writeJson, makeSafeArtifact, runCommandNoRawOutput } from "./ci-safe-lib.mjs";

const args = process.argv.slice(2);
const output = valueAfter(args, "--output") || "reports/pnpm-typecheck-safe-summary.json";
const simulated = valueAfter(args, "--simulate-exit");
const exitCode = simulated === undefined ? Number(runCommandNoRawOutput("pnpm", ["typecheck"]).status || 0) : Number(simulated);
const artifact = makeSafeArtifact({
  check_name: "typescript",
  job_name: process.env.GITHUB_JOB || "typescript",
  command_class: "pnpm_typecheck",
  phase: "pnpm_typecheck",
  package_scope: "workspace",
  working_directory: process.cwd(),
  exit_code: exitCode,
  result: exitCode === 0 ? "success" : "failure",
  safe_reason_code: exitCode === 0 ? "metadata_limited_external_blocked" : "pnpm_typecheck_failed_safe_summary",
  raw_log_required: exitCode !== 0,
  product_code_failure: exitCode !== 0,
  metadata_limited: exitCode !== 0,
  next_safe_action: exitCode === 0 ? "Proceed to pnpm test safe summary." : "Inspect product code locally; raw CI logs remain forbidden for diagnosis."
});
writeJson(output, { ...artifact, pnpm_typecheck_result: exitCode === 0 ? "success" : "failure" });
console.log(`pnpm typecheck safe summary: ${exitCode === 0 ? "success" : "failure"}`);
if (!hasFlag(args, "--no-exit")) process.exit(exitCode);
