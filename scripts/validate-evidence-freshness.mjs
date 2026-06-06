#!/usr/bin/env node
import { readJson, resolvedEvidencePack } from "./evidence-lib.mjs";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const expectedHead = valueAfter("--head");
const expectedTests = valueAfter("--tests");
const expectedCiRun = valueAfter("--ci-run");
const expectedQualityGateRun = valueAfter("--quality-gate-run");
const expectedQualityGateArtifact = valueAfter("--quality-gate-artifact");
const ciMode = process.argv.includes("--ci");
const requireCurrentHead = process.argv.includes("--require-current-head");
function localGitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}
const inferredHead = process.env.CODEX_PR_HEAD_SHA || (ciMode ? localGitHead() : "");
const pack = resolvedEvidencePack(readJson(valueAfter("--input") || ".codex/evidence-pack.json"), {
  head: valueAfter("--actual-head") || expectedHead || inferredHead,
  base: valueAfter("--base")
});

if (expectedHead && pack.headSha !== expectedHead) throw new Error("evidence head SHA is stale");
if (ciMode && requireCurrentHead && inferredHead && pack.headSha !== inferredHead) throw new Error("evidence head SHA is stale");
if (ciMode && /^(current_pr_head|branch_head_sha_in_pr_metadata|HEAD_SHA_PLACEHOLDER)$/i.test(String(pack.headSha || ""))) throw new Error("evidence head SHA is unresolved");
if (expectedTests && Number(pack.testSummary?.passed) !== Number(expectedTests)) throw new Error("evidence test count is stale");
if (expectedCiRun && pack.ciRunId !== expectedCiRun) throw new Error("evidence CI run ID is stale");
if (expectedQualityGateRun && pack.qualityGateRunId !== expectedQualityGateRun) throw new Error("evidence quality-gate run ID is stale");
if (expectedQualityGateArtifact && pack.qualityGateArtifactId !== expectedQualityGateArtifact) throw new Error("evidence quality-gate artifact ID is stale");
console.log("Evidence freshness validation passed.");
