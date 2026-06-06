#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { valueAfter, readJson, writeJson, buildRequiredChecksMetadata } from "./ci-safe-lib.mjs";

const args = process.argv.slice(2);
const fixture = valueAfter(args, "--fixture");
const output = valueAfter(args, "--output") || "reports/ci-required-checks-metadata.json";
let input;
if (fixture) {
  input = readJson(fixture);
} else {
  const pr = valueAfter(args, "--pr");
  const repo = valueAfter(args, "--repo") || process.env.GITHUB_REPOSITORY;
  if (!pr || !repo) throw new Error("--pr and --repo are required without --fixture");
  const checksResult = spawnSync("gh", ["pr", "checks", pr, "--repo", repo, "--json", "name,workflow,state,link,bucket"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const headResult = spawnSync("gh", ["pr", "view", pr, "--repo", repo, "--json", "headRefOid"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const head = headResult.stdout ? JSON.parse(headResult.stdout).headRefOid : (process.env.CODEX_PR_HEAD_SHA || process.env.GITHUB_SHA || "");
  let checks = [];
  try {
    checks = checksResult.stdout ? JSON.parse(checksResult.stdout) : [];
  } catch {
    checks = [];
  }
  input = checks.map((check) => ({
    check_name: check.name,
    workflow_name: check.workflow || check.name,
    status: check.state === "SUCCESS" ? "completed" : "completed",
    conclusion: check.state === "SUCCESS" ? "success" : "failure",
    head_sha: head,
    run_id: ""
  }));
}
const metadata = buildRequiredChecksMetadata(input);
writeJson(output, metadata);
console.log(`Required checks metadata: ${metadata.same_head_required_checks_passed ? "pass" : metadata.safe_reason_code}`);
