#!/usr/bin/env node
import fs from "node:fs";
import { valueAfter, hasFlag, writeJson, makeSafeArtifact, runCommandNoRawOutput } from "./ci-safe-lib.mjs";

const args = process.argv.slice(2);
const output = valueAfter(args, "--output") || "reports/pnpm-test-safe-summary.json";
const simulated = valueAfter(args, "--simulate-exit");
const summaryPath = valueAfter(args, "--summary");
const notRunDueToTypecheck = hasFlag(args, "--not-run-due-to-typecheck");
const exitCode = notRunDueToTypecheck ? 0 : simulated === undefined ? Number(runCommandNoRawOutput("pnpm", ["test"], {
  env: {
    RUN_LIVE_POSTGRES_TESTS: process.env.RUN_LIVE_POSTGRES_TESTS,
    DATABASE_URL: process.env.DATABASE_URL
  }
}).status || 0) : Number(simulated);

let counts = { testFiles: null, passed: null, failed: null, skipped: null };
if (summaryPath && fs.existsSync(summaryPath)) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  counts = {
    testFiles: summary.testFiles ?? null,
    passed: summary.passed ?? null,
    failed: summary.failed ?? null,
    skipped: summary.skipped ?? null
  };
}

const typecheckResult = valueAfter(args, "--typecheck-result") || "unknown";
const safeReason = notRunDueToTypecheck
  ? "metadata_limited_external_blocked"
  : exitCode === 0
  ? "metadata_limited_external_blocked"
  : typecheckResult === "success"
    ? "pnpm_typecheck_passed_but_test_failed"
    : "pnpm_test_failed_safe_summary";
const artifact = makeSafeArtifact({
  check_name: "typescript",
  job_name: process.env.GITHUB_JOB || "typescript",
  command_class: "pnpm_test",
  phase: notRunDueToTypecheck ? "pnpm_test_not_run" : "pnpm_test",
  package_scope: "workspace",
  working_directory: process.cwd(),
  exit_code: exitCode,
  result: notRunDueToTypecheck ? "not_run" : exitCode === 0 ? "success" : "failure",
  safe_reason_code: safeReason,
  raw_log_required: !notRunDueToTypecheck && exitCode !== 0 && counts.failed === null,
  product_code_failure: !notRunDueToTypecheck && exitCode !== 0,
  metadata_limited: notRunDueToTypecheck || (exitCode !== 0 && counts.failed === null),
  next_safe_action: notRunDueToTypecheck ? "pnpm test was not run because pnpm typecheck failed; use the typecheck safe summary." : exitCode === 0 ? "Required test check passed." : "Use safe test counts if present; do not inspect raw CI logs."
});
writeJson(output, { ...artifact, pnpm_test_result: notRunDueToTypecheck ? "not_run_due_to_typecheck_failure" : exitCode === 0 ? "success" : "failure", pnpm_typecheck_result: typecheckResult, test_counts: counts });
console.log(`pnpm test safe summary: ${notRunDueToTypecheck ? "not_run_due_to_typecheck_failure" : exitCode === 0 ? "success" : "failure"}`);
if (!hasFlag(args, "--no-exit")) process.exit(exitCode);
