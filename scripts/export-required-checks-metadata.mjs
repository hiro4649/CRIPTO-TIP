#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
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
  const checksJson = checksResult.stdout || "[]";
  const headJson = execFileSync("gh", ["pr", "view", pr, "--repo", repo, "--json", "headRefOid"], { encoding: "utf8" });
  const head = JSON.parse(headJson).headRefOid;
  input = JSON.parse(checksJson).map((check) => ({
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
