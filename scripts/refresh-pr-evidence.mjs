#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}
function hasFlag(flag) {
  return args.includes(flag);
}
function run(command, commandArgs) {
  execFileSync(command, commandArgs, { stdio: "inherit" });
}

const pr = valueAfter("--pr");
const repo = valueAfter("--repo") || process.env.GITHUB_REPOSITORY;
const bodyFile = valueAfter("--body-file") || "docs/pr-github-run-artifact-auto-injection.md";
if (!pr) {
  console.error("--pr is required");
  process.exit(1);
}
if (!repo) {
  console.error("--repo or GITHUB_REPOSITORY is required");
  process.exit(1);
}

const fetchArgs = ["scripts/fetch-github-run-evidence.mjs", "--pr", pr, "--repo", repo];
if (hasFlag("--offline-readonly")) fetchArgs.push("--offline-readonly");
run("node", fetchArgs);
if (hasFlag("--offline-readonly")) process.exit(0);
run("node", ["scripts/render-pr-evidence.mjs", "--input", ".codex/evidence-pack.json", "--output", bodyFile]);
run("node", ["scripts/check-evidence-placeholders.mjs"]);
if (!hasFlag("--no-edit")) run("gh", ["pr", "edit", pr, "--repo", repo, "--body-file", bodyFile]);
