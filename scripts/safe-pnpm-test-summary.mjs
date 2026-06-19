#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { valueAfter, hasFlag, writeJson, makeSafeArtifact, runCommandNoRawOutput } from "./ci-safe-lib.mjs";

const args = process.argv.slice(2);
const output = valueAfter(args, "--output") || "reports/pnpm-test-safe-summary.json";
const simulated = valueAfter(args, "--simulate-exit");
const summaryPath = valueAfter(args, "--summary");
const notRunDueToTypecheck = hasFlag(args, "--not-run-due-to-typecheck");
const generatedSummaryPath = summaryPath || path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "cripto-tip-vitest-safe-")),
  "vitest-test-safe-results.json"
);
const vitestArgs = [
  "exec",
  "vitest",
  "run",
  "packages/shared",
  "apps/api",
  "apps/overlay",
  "apps/web",
  "--reporter=json",
  `--outputFile=${generatedSummaryPath}`
];
const exitCode = notRunDueToTypecheck ? 0 : simulated === undefined ? Number(runCommandNoRawOutput("pnpm", vitestArgs, {
  env: {
    RUN_LIVE_POSTGRES_TESTS: process.env.RUN_LIVE_POSTGRES_TESTS,
    DATABASE_URL: process.env.DATABASE_URL
  }
}).status || 0) : Number(simulated);

function safeRelativeTestFile(name) {
  if (!name) return "metadata_limited";
  return path.relative(process.cwd(), name).replace(/\\/g, "/") || path.basename(name);
}

function summarizeVitest(summary) {
  const results = Array.isArray(summary.testResults) ? summary.testResults : [];
  const failedFiles = results
    .filter((result) => result.status === "failed" || result.assertionResults?.some((assertion) => assertion.status === "failed"))
    .map((result) => safeRelativeTestFile(result.name))
    .filter(Boolean)
    .slice(0, 20);
  const failedNames = results
    .flatMap((result) => Array.isArray(result.assertionResults) ? result.assertionResults : [])
    .filter((assertion) => assertion.status === "failed")
    .map((assertion) => String(assertion.fullName || assertion.title || "metadata_limited").slice(0, 200))
    .slice(0, 20);
  const skipped = Number(summary.numPendingTests ?? 0) + Number(summary.numTodoTests ?? 0);
  return {
    counts: {
      testFiles: Number.isFinite(Number(summary.numTotalTestSuites)) ? Number(summary.numTotalTestSuites) : null,
      passed: Number.isFinite(Number(summary.numPassedTests)) ? Number(summary.numPassedTests) : null,
      failed: Number.isFinite(Number(summary.numFailedTests)) ? Number(summary.numFailedTests) : null,
      skipped
    },
    failedFiles,
    failedNames
  };
}

let counts = { testFiles: null, passed: null, failed: null, skipped: null };
let failedTestFiles = [];
let failedTestNames = [];
if (fs.existsSync(generatedSummaryPath)) {
  const summary = JSON.parse(fs.readFileSync(generatedSummaryPath, "utf8"));
  const summarized = summarizeVitest(summary);
  counts = summarized.counts;
  failedTestFiles = summarized.failedFiles;
  failedTestNames = summarized.failedNames;
} else if (summaryPath && fs.existsSync(summaryPath)) {
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  counts = {
    testFiles: summary.testFiles ?? null,
    passed: summary.passed ?? null,
    failed: summary.failed ?? null,
    skipped: summary.skipped ?? null
  };
  failedTestFiles = Array.isArray(summary.failedTestFiles) ? summary.failedTestFiles.slice(0, 20) : [];
  failedTestNames = Array.isArray(summary.failedTestNames) ? summary.failedTestNames.slice(0, 20) : [];
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
  raw_log_required: false,
  product_code_failure: !notRunDueToTypecheck && exitCode !== 0,
  metadata_limited: notRunDueToTypecheck || counts.failed === null,
  next_safe_action: notRunDueToTypecheck ? "pnpm test was not run because pnpm typecheck failed; use the typecheck safe summary." : exitCode === 0 ? "Required test check passed." : "Use safe test counts and failed test file names only; do not inspect raw CI logs."
});
writeJson(output, { ...artifact, pnpm_test_result: notRunDueToTypecheck ? "not_run_due_to_typecheck_failure" : exitCode === 0 ? "success" : "failure", pnpm_typecheck_result: typecheckResult, test_counts: counts, failed_test_files: failedTestFiles, failed_test_names: failedTestNames });
console.log(`pnpm test safe summary: ${notRunDueToTypecheck ? "not_run_due_to_typecheck_failure" : exitCode === 0 ? "success" : "failure"}`);
if (!hasFlag(args, "--no-exit")) process.exit(exitCode);
