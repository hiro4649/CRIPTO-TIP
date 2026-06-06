#!/usr/bin/env node
import { valueAfter, readJson, writeJson, makeSafeArtifact, classifySummary } from "./ci-safe-lib.mjs";

const args = process.argv.slice(2);
const fixture = valueAfter(args, "--fixture");
const output = valueAfter(args, "--output") || "reports/ci-safe-failure-artifact.json";
const input = fixture ? readJson(fixture) : {
  command_class: valueAfter(args, "--command-class") || "metadata",
  phase: valueAfter(args, "--phase") || valueAfter(args, "--command-class") || "metadata",
  exit_code: Number(valueAfter(args, "--exit-code") || 0),
  check_name: valueAfter(args, "--check-name") || "typescript",
  job_name: valueAfter(args, "--job-name") || process.env.GITHUB_JOB || "typescript",
  package_scope: valueAfter(args, "--package-scope") || "workspace",
  working_directory: valueAfter(args, "--working-directory") || process.cwd(),
  metadata_limited: true
};

const safe_reason_code = input.safe_reason_code || classifySummary(input);
const artifact = makeSafeArtifact({ ...input, safe_reason_code });
writeJson(output, artifact);
console.log(`CI safe artifact written: ${artifact.safe_reason_code}`);
