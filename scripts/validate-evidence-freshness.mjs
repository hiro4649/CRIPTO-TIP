#!/usr/bin/env node
import { readJson } from "./evidence-lib.mjs";

const args = process.argv.slice(2);
function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const pack = readJson(valueAfter("--input") || ".codex/evidence-pack.json");
const expectedHead = valueAfter("--head");
const expectedTests = valueAfter("--tests");
const expectedQualityGateRun = valueAfter("--quality-gate-run");

if (expectedHead && pack.headSha !== expectedHead) throw new Error("evidence head SHA is stale");
if (expectedTests && Number(pack.testSummary?.passed) !== Number(expectedTests)) throw new Error("evidence test count is stale");
if (expectedQualityGateRun && pack.qualityGateRunId !== expectedQualityGateRun) throw new Error("evidence quality-gate run ID is stale");
console.log("Evidence freshness validation passed.");
