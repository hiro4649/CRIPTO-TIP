#!/usr/bin/env node
import { readJson, renderManualGates, renderPrEvidence, renderRiskRegister, resolvedEvidencePack, writeText, assertNoPlaceholders } from "./evidence-lib.mjs";

const args = process.argv.slice(2);
function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const input = valueAfter("--input") || ".codex/evidence-pack.json";
const output = valueAfter("--output") || "docs/pr-evidence-single-source-of-truth.md";
const pack = resolvedEvidencePack(readJson(input), {
  head: valueAfter("--head"),
  base: valueAfter("--base")
});
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
