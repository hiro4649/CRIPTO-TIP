#!/usr/bin/env node
import { readJson, resolvedEvidencePack } from "./evidence-lib.mjs";

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
const pack = resolvedEvidencePack(readJson(valueAfter("--input") || ".codex/evidence-pack.json"), {
  head: valueAfter("--actual-head") || expectedHead,
  base: valueAfter("--base")
});

if (expectedHead && pack.headSha !== expectedHead) throw new Error("evidence head SHA is stale");
if (expectedTests && Number(pack.testSummary?.passed) !== Number(expectedTests)) throw new Error("evidence test count is stale");
if (expectedCiRun && pack.ciRunId !== expectedCiRun) throw new Error("evidence CI run ID is stale");
if (expectedQualityGateRun && pack.qualityGateRunId !== expectedQualityGateRun) throw new Error("evidence quality-gate run ID is stale");
if (expectedQualityGateArtifact && pack.qualityGateArtifactId !== expectedQualityGateArtifact) throw new Error("evidence quality-gate artifact ID is stale");
console.log("Evidence freshness validation passed.");
