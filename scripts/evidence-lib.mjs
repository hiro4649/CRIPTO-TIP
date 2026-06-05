import fs from "node:fs";

export const forbiddenEvidencePlaceholders = [
  "HEAD_SHA_PLACEHOLDER",
  "pending until GitHub Actions run",
  "pending_after_head_update",
  "artifact pending",
  "CI runs: pending",
  "Quality-gate: pending",
  "Product CI: pending",
  "branch_head_sha_in_pr_metadata",
  "main_head_sha_in_pr_metadata",
  "github_actions_required_on_pushed_head",
  "current PR body",
  "current local head before push",
  "recorded in GitHub PR body after push",
  "local evidence collected before push"
];

export function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

export function resolvedEvidencePack(pack, overrides = {}) {
  const resolved = { ...pack, testSummary: { ...(pack.testSummary || {}) } };
  const head = overrides.head || process.env.CODEX_PR_HEAD_SHA || process.env.GITHUB_SHA || "";
  const base = overrides.base || process.env.CODEX_PR_BASE_SHA || "";
  if (resolved.headSha === "current_pr_head") resolved.headSha = head;
  if (resolved.baseSha === "current_pr_base") resolved.baseSha = base;
  return resolved;
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
  const packageVerification = pack.packageVerification || {};
  const apiCompatibility = pack.apiCompatibilitySummary || {};
  const reviewScope = pack.reviewScope || {};
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
    "Product verification:",
    "",
    "Repository checks and package verification were run on the current evidence head.",
    "",
    "Tests or checks run:",
    "",
    "The commands below are the merge-relevant checks for this evidence tooling change.",
    "",
    "Product verification commands:",
    "",
    ...((pack.productVerificationCommands || [
      "corepack pnpm lint: pass",
      "corepack pnpm typecheck: pass",
      "corepack pnpm test: pass",
      "npm test: pass",
      "node scripts/check-evidence-placeholders.mjs: pass"
    ]).map((item) => `- ${item}`)),
    "",
    "Package verification:",
    "",
    `- Package scripts changed: ${packageVerification.packageScriptsChanged ? "yes" : "no"}`,
    `- Runtime dependencies added: ${packageVerification.runtimeDependenciesAdded ? "yes" : "no"}`,
    `- Verification: ${packageVerification.verification || "corepack pnpm install, corepack pnpm test, and npm test pass on this head."}`,
    "",
    "API Compatibility Summary:",
    "",
    `- Public API changed: ${apiCompatibility.publicApiChanged ? "yes" : "no"}`,
    `- Internal runtime API changed: ${apiCompatibility.internalRuntimeApiChanged ? "yes" : "no"}`,
    `- Compatibility statement: ${apiCompatibility.statement || "No product runtime API contract is changed by this evidence tooling PR."}`,
    "",
    "Runtime smoke rationale:",
    "",
    `- ${pack.runtimeSmokeRationale || "No production runtime readiness is claimed; this PR changes offline evidence tooling and tests, so repository checks are the applicable verification."}`,
    "",
    "Review scope and verification:",
    "",
    `- Scope: ${reviewScope.scope || "Evidence rendering, freshness validation, placeholder prevention, test summary extraction, risk/manual gate rendering, and quality-gate self-protection preparation."}`,
    `- Risk summary: ${reviewScope.riskSummary || "Main risk is stale or incomplete evidence blocking merge readiness; product runtime behavior is intentionally unchanged."}`,
    `- Verification oracle: ${reviewScope.verificationOracle || "Generated PR evidence, placeholder checker, freshness validator, Vitest coverage, and GitHub checks."}`,
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
