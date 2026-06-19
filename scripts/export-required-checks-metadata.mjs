#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { valueAfter, readJson, writeJson, buildRequiredChecksMetadata } from "./ci-safe-lib.mjs";

const args = process.argv.slice(2);
const fixture = valueAfter(args, "--fixture");
const output = valueAfter(args, "--output") || "reports/ci-required-checks-metadata.json";
let input;
if (fixture) {
  input = readJson(fixture);
  if (!input.target_head_sha && Array.isArray(input.checks) && input.checks[0]?.head_sha) {
    input = { ...input, target_head_sha: input.checks[0].head_sha };
  }
} else {
  const pr = valueAfter(args, "--pr");
  const repo = valueAfter(args, "--repo") || process.env.GITHUB_REPOSITORY;
  if (!pr || !repo) throw new Error("--pr and --repo are required without --fixture");
  const viewResult = spawnSync("gh", ["pr", "view", pr, "--repo", repo, "--json", "headRefOid,statusCheckRollup"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (viewResult.status !== 0) throw new Error("required check metadata unavailable");
  let view;
  try {
    view = viewResult.stdout ? JSON.parse(viewResult.stdout) : {};
  } catch {
    view = {};
  }
  input = {
    target_head_sha: view.headRefOid || process.env.CODEX_PR_HEAD_SHA || process.env.GITHUB_SHA || "",
    statusCheckRollup: Array.isArray(view.statusCheckRollup) ? view.statusCheckRollup : []
  };
}
const metadata = buildRequiredChecksMetadata(input);
writeJson(output, metadata);
console.log(`Required checks metadata: ${metadata.same_head_required_checks_passed ? "pass" : metadata.safe_reason_code}`);
