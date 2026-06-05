#!/usr/bin/env node
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { readJson, writeText } from "./evidence-lib.mjs";

const args = process.argv.slice(2);
function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}
function hasFlag(flag) {
  return args.includes(flag);
}

function readJsonArg(flag) {
  const file = valueAfter(flag);
  return file ? readJson(file) : undefined;
}

function normalizeRuns(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.workflow_runs)) return value.workflow_runs;
  if (Array.isArray(value?.runs)) return value.runs;
  return [];
}

function normalizeArtifacts(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.artifacts)) return value.artifacts;
  return [];
}

export function selectLatestSuccessfulRun(runs, workflowName, headSha) {
  const candidates = normalizeRuns(runs)
    .filter((run) => String(run.workflowName || run.name || run.workflow_id || "").toLowerCase() === workflowName.toLowerCase())
    .filter((run) => String(run.conclusion || "").toLowerCase() === "success")
    .filter((run) => !headSha || String(run.headSha || run.head_sha || "") === headSha)
    .sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime());
  if (!candidates.length) throw new Error(`No successful ${workflowName} run for current head`);
  return candidates[0];
}

function artifactRunIdOf(artifact) {
  return artifact.workflow_run?.id || artifact.workflowRunId || artifact.runId || artifact.run_id || "";
}

function artifactHeadShaOf(artifact) {
  return artifact.workflow_run?.head_sha || artifact.workflowRunHeadSha || artifact.headSha || artifact.head_sha || "";
}

function isConcreteSha(value) {
  return /^[0-9a-f]{40}$/i.test(String(value || ""));
}

export function selectQualityGateArtifact(artifacts, qualityRun) {
  const qualityRunId = runIdOf(qualityRun);
  const qualityHeadSha = qualityRun.headSha || qualityRun.head_sha || "";
  const artifact = normalizeArtifacts(artifacts).find((item) => {
    if (item.name !== "codex-quality-gate-safe-artifacts") return false;
    const artifactRunId = artifactRunIdOf(item);
    const artifactHeadSha = artifactHeadShaOf(item);
    if (artifactRunId && qualityRunId && String(artifactRunId) !== String(qualityRunId)) return false;
    if (artifactHeadSha && qualityHeadSha && String(artifactHeadSha) !== String(qualityHeadSha)) return false;
    return true;
  });
  if (!artifact?.id) throw new Error("Missing codex-quality-gate-safe-artifacts artifact");
  return artifact;
}

function ghJson(command) {
  return JSON.parse(execFileSync("gh", command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }));
}

function fetchPr(repo, prNumber) {
  if (!repo || !prNumber) throw new Error("--repo and --pr are required when fixture JSON is not provided");
  return ghJson(["pr", "view", String(prNumber), "--repo", repo, "--json", "headRefName,headRefOid,baseRefOid"]);
}

function fetchRuns(repo, branch) {
  if (!repo || !branch) throw new Error("repo and branch are required to fetch workflow runs");
  return ghJson(["run", "list", "--repo", repo, "--branch", branch, "--limit", "50", "--json", "databaseId,workflowName,conclusion,headSha,createdAt"]);
}

function fetchArtifacts(repo, runId) {
  if (!repo || !runId) throw new Error("repo and runId are required to fetch artifacts");
  return ghJson(["api", `repos/${repo}/actions/runs/${runId}/artifacts`]);
}

function runIdOf(run) {
  return String(run.databaseId || run.id || run.run_number || "");
}

export function buildGithubEvidence({ pack, pr, runs, artifacts }) {
  const headSha = pr.headRefOid || pr.head_sha || pr.headSha;
  const baseSha = pr.baseRefOid || pr.base_sha || pr.baseSha || pack.baseSha;
  if (!headSha) throw new Error("PR head SHA missing");
  if (isConcreteSha(pack.headSha) && pack.headSha !== headSha) {
    throw new Error("Evidence pack head SHA does not match PR head");
  }
  const ciRun = selectLatestSuccessfulRun(runs, "ci", headSha);
  const qualityRun = selectLatestSuccessfulRun(runs, "quality-gate", headSha);
  const artifact = selectQualityGateArtifact(artifacts, qualityRun);
  return {
    ...pack,
    headSha,
    baseSha,
    productCiStatus: "success",
    qualityGateStatus: "success",
    ciRunId: runIdOf(ciRun),
    qualityGateRunId: runIdOf(qualityRun),
    qualityGateArtifactId: String(artifact.id),
    remoteRuns: [
      { name: "ci", runId: runIdOf(ciRun), result: "success" },
      { name: "quality-gate", runId: runIdOf(qualityRun), result: "success", artifactId: String(artifact.id) }
    ]
  };
}

async function main() {
  const offlineReadonly = hasFlag("--offline-readonly");
  const input = valueAfter("--input") || ".codex/evidence-pack.json";
  const output = valueAfter("--output") || input;
  const pack = readJson(input);
  const fixturePr = readJsonArg("--pr-json");
  const fixtureRuns = readJsonArg("--runs-json");
  const fixtureArtifacts = readJsonArg("--artifacts-json");

  if (offlineReadonly && (!fixturePr || !fixtureRuns || !fixtureArtifacts)) {
    console.log("GitHub evidence offline-readonly check completed without mutation.");
    return;
  }

  let pr = fixturePr;
  let runs = fixtureRuns;
  let artifacts = fixtureArtifacts;
  const repo = valueAfter("--repo") || process.env.GITHUB_REPOSITORY;
  const prNumber = valueAfter("--pr");
  if (!pr) pr = fetchPr(repo, prNumber);
  if (!runs) runs = fetchRuns(repo, pr.headRefName);
  const qualityRun = selectLatestSuccessfulRun(runs, "quality-gate", pr.headRefOid || pr.headSha);
  if (!artifacts) artifacts = fetchArtifacts(repo, runIdOf(qualityRun));

  const next = buildGithubEvidence({ pack, pr, runs, artifacts });
  if (!hasFlag("--dry-run")) writeText(output, JSON.stringify(next, null, 2));
  console.log(`GitHub evidence updated: head ${next.headSha}, ci ${next.ciRunId}, quality-gate ${next.qualityGateRunId}, artifact ${next.qualityGateArtifactId}`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
