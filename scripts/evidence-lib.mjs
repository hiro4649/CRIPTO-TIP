import fs from "node:fs";

export const forbiddenEvidencePlaceholders = [
  "HEAD_SHA_PLACEHOLDER",
  "pending until GitHub Actions run",
  "pending_after_head_update",
  "artifact pending",
  "CI runs: pending",
  "Quality-gate: pending",
  "Product CI: pending",
  "current PR body",
  "recorded in GitHub PR body after push",
  "local evidence collected before push"
];

export function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

export function writeText(path, text) {
  fs.writeFileSync(path, text.endsWith("\n") ? text : `${text}\n`);
}

export function assertNoPlaceholders(text, source = "text") {
  const found = forbiddenEvidencePlaceholders.filter((placeholder) => text.includes(placeholder));
  if (found.length) throw new Error(`${source} contains forbidden evidence placeholder: ${found.join(", ")}`);
}

export function renderRiskRegister(riskRegister) {
  const rows = riskRegister.risks.map((risk) => `| ${risk.severity} | ${risk.risk} | ${risk.owner} | ${risk.nextPr} | ${risk.mitigation} |`);
  return [
    "## Machine-Readable Risk Register",
    "",
    "| Severity | Risk | Owner | Next PR | Mitigation |",
    "| --- | --- | --- | --- | --- |",
    ...rows
  ].join("\n");
}

export function renderManualGates(manualGates) {
  return [
    "## Machine-Readable Manual Gate Registry",
    "",
    `Gate types: ${manualGates.gateTypes.join(", ")}`,
    "",
    `Required fields: ${manualGates.requiredFields.join(", ")}`,
    "",
    "Production-like rules:",
    ...manualGates.productionLikeRules.map((rule) => `- ${rule}`)
  ].join("\n");
}

export function renderPrEvidence(pack) {
  const testSummary = pack.testSummary || {};
  return [
    "# Summary",
    "",
    pack.goal,
    "",
    `PR profile: ${pack.prProfile}`,
    `Task mode: ${pack.taskMode}`,
    "",
    "## Task Contract",
    "",
    `Goal: ${pack.goal}`,
    "",
    `Allowed scope: ${pack.allowedScope.join(", ")}.`,
    "",
    `Forbidden scope: ${pack.forbiddenScope.join(", ")}.`,
    "",
    `Runtime readiness claim: ${pack.runtimeReadinessClaim}.`,
    "",
    `Product code changed: ${pack.productCodeChanged ? "yes" : "no"}.`,
    "",
    `Done criteria: ${pack.doneCriteria.join("; ")}.`,
    "",
    "## Evidence Integrity",
    "",
    `Head SHA: ${pack.headSha}`,
    "",
    `Base SHA: ${pack.baseSha}`,
    "",
    `Product CI: ${pack.productCiStatus}`,
    "",
    `Quality-gate: ${pack.qualityGateStatus}`,
    "",
    `CI run: ${pack.ciRunId}`,
    "",
    `Quality-gate run: ${pack.qualityGateRunId}`,
    "",
    `Quality-gate artifact: ${pack.qualityGateArtifactId}`,
    "",
    `Tests: ${testSummary.testFiles} test files, ${testSummary.passed} passed, ${testSummary.skipped} skipped`,
    "",
    "## Testing and review",
    "",
    "- `corepack pnpm install`",
    "- `corepack pnpm lint`",
    "- `corepack pnpm typecheck`",
    "- `corepack pnpm test`",
    "- `npm test`",
    "- `node scripts/write-test-summary.mjs`",
    "- `node scripts/render-pr-evidence.mjs --input .codex/evidence-pack.json --output docs/pr-evidence-single-source-of-truth.md`",
    "- `node scripts/check-evidence-placeholders.mjs`",
    "",
    "## Test Coverage Evidence",
    "",
    `Current recorded test summary: ${testSummary.testFiles} files, ${testSummary.passed} passed, ${testSummary.skipped} skipped.`,
    "",
    "## Security Boundaries",
    "",
    ...pack.securityBoundaries.map((boundary) => `- ${boundary}`),
    "",
    "## Residual risks",
    "",
    ...pack.residualRisks.map((risk) => `- ${risk}`),
    "",
    "## Human Confirmation",
    "",
    ...pack.humanConfirmation.map((field) => `- ${field}`)
  ].join("\n");
}
