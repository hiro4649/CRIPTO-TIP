#!/usr/bin/env node
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function currentHeadSha() {
  if (process.env.CODEX_PR_HEAD_SHA) return process.env.CODEX_PR_HEAD_SHA;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "metadata_limited";
  }
}

function baseSummary(sourceType, counts) {
  return {
    schemaVersion: "1.0.0",
    command: "corepack pnpm test",
    headSha: currentHeadSha(),
    testFiles: Number(counts.testFiles),
    passed: Number(counts.passed),
    failed: Number(counts.failed ?? 0),
    skipped: Number(counts.skipped ?? 0),
    sourceType,
    createdAt: new Date().toISOString(),
    currentRunEvidence: true
  };
}

function assertFiniteSummary(summary) {
  for (const field of ["testFiles", "passed", "failed", "skipped"]) {
    if (!Number.isFinite(Number(summary[field]))) throw new Error(`test_summary_invalid_${field}`);
  }
  if (summary.failed !== 0) throw new Error("test_summary_current_run_not_passing");
  return summary;
}

function parseTextSummary(file) {
  const text = fs.readFileSync(file, "utf8");
  const files = text.match(/Test Files\s+(\d+) passed/);
  const tests = text.match(/Tests\s+(\d+) passed(?:\s+\|\s+(\d+) skipped)?/);
  if (!files || !tests) throw new Error("unable to parse test summary");
  return baseSummary("vitest_text_summary", {
    testFiles: files[1],
    passed: tests[1],
    failed: 0,
    skipped: tests[2] || 0
  });
}

function parseVitestJson(file) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const testFiles = Array.isArray(json.testResults) ? json.testResults.length : json.numTotalTestSuites;
  return baseSummary("vitest_json_summary", {
    testFiles,
    passed: json.numPassedTests,
    failed: json.numFailedTests,
    skipped: Number(json.numPendingTests ?? 0) + Number(json.numTodoTests ?? 0)
  });
}

function parseSafeSummary(file) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const counts = json.test_counts || {};
  return baseSummary("safe_pnpm_test_summary", {
    testFiles: counts.testFiles,
    passed: counts.passed,
    failed: counts.failed,
    skipped: counts.skipped
  });
}

const fromText = valueAfter("--from");
const fromJson = valueAfter("--from-json");
const safeSummary = valueAfter("--safe-summary");
const output = valueAfter("--output") || ".codex/test-summary.json";

let summary;
if (fromText && fs.existsSync(fromText)) summary = parseTextSummary(fromText);
else if (fromJson && fs.existsSync(fromJson)) summary = parseVitestJson(fromJson);
else if (safeSummary && fs.existsSync(safeSummary)) summary = parseSafeSummary(safeSummary);
else throw new Error("test_summary_current_run_input_required");

summary = assertFiniteSummary(summary);
fs.writeFileSync(output, JSON.stringify(summary, null, 2) + "\n");
console.log(`Test summary: ${summary.testFiles} files, ${summary.passed} passed, ${summary.skipped} skipped from ${summary.sourceType}.`);
