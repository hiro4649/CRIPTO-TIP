#!/usr/bin/env node
import { readJson, renderManualGates, renderPrEvidence, renderRiskRegister, writeText, assertNoPlaceholders } from "./evidence-lib.mjs";

const args = process.argv.slice(2);
const input = args[args.indexOf("--input") + 1] || ".codex/evidence-pack.json";
const output = args[args.indexOf("--output") + 1] || "docs/pr-evidence-single-source-of-truth.md";
const pack = readJson(input);
const rendered = renderPrEvidence(pack);
assertNoPlaceholders(rendered, output);
writeText(output, rendered);

if (args.includes("--render-risk")) {
  const riskOutput = args[args.indexOf("--risk-output") + 1] || "docs/RISK_REGISTER.md";
  writeText(riskOutput, `${renderRiskRegister(readJson(".codex/risk-register.json"))}\n`);
}
if (args.includes("--render-manual-gates")) {
  const manualGateOutput = args[args.indexOf("--manual-gates-output") + 1] || "docs/MANUAL_GATES.md";
  writeText(manualGateOutput, `${renderManualGates(readJson(".codex/manual-gates/manual-gates.json"))}\n`);
}
