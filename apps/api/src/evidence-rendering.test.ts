import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../../..");

function runScript(script: string, args: string[] = []) {
  return execFileSync("node", [path.join(root, "scripts", script), ...args], {
    cwd: root,
    encoding: "utf8"
  });
}

function runScriptResult(script: string, args: string[] = []) {
  return spawnSync("node", [path.join(root, "scripts", script), ...args], {
    cwd: root,
    encoding: "utf8"
  });
}

function writeJsonFixture(name: string, value: unknown) {
  const file = path.join(os.tmpdir(), `cripto-tip-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
  return file;
}

describe("evidence single source of truth scripts", () => {
  const evidencePack = JSON.parse(fs.readFileSync(path.join(root, ".codex", "evidence-pack.json"), "utf8"));

  it("renders PR evidence from evidence-pack with required quality-gate headings", () => {
    const output = path.join(os.tmpdir(), `cripto-tip-pr-evidence-${Date.now()}.md`);
    runScript("render-pr-evidence.mjs", ["--input", ".codex/evidence-pack.json", "--output", output]);
    const rendered = fs.readFileSync(output, "utf8");
    expect(rendered).toContain("## Task Contract");
    expect(rendered).toContain("## Evidence Integrity");
    expect(rendered).toContain("## Testing and review");
    expect(rendered).toContain("Product verification:");
    expect(rendered).toContain("Tests or checks run:");
    expect(rendered).toContain("## Test Coverage Evidence");
    expect(rendered).toContain("## Security Boundaries");
    expect(rendered).toContain("## Residual risks");
    expect(rendered).toContain("## Human Confirmation");
    expect(rendered).toContain("token sale");
    expect(rendered).not.toMatch(/HEAD_SHA_PLACEHOLDER|pending until GitHub Actions run|current PR body/);
  });

  it("rejects stale evidence freshness values", () => {
    expect(runScriptResult("validate-evidence-freshness.mjs", [
      "--head", "0000000000000000000000000000000000000000",
      "--actual-head", "1234567890abcdef1234567890abcdef12345678"
    ]).stderr).toMatch(/stale/);
    expect(runScriptResult("validate-evidence-freshness.mjs", ["--tests", "1"]).stderr).toMatch(/stale/);
    expect(runScriptResult("validate-evidence-freshness.mjs", ["--ci-run", "1"]).stderr).toMatch(/stale/);
    expect(runScriptResult("validate-evidence-freshness.mjs", ["--quality-gate-run", "1"]).stderr).toMatch(/stale/);
    expect(runScriptResult("validate-evidence-freshness.mjs", ["--quality-gate-artifact", "1"]).stderr).toMatch(/stale/);
    const unresolvedPack = writeJsonFixture("pack", { ...evidencePack, headSha: "branch_head_sha_in_pr_metadata" });
    expect(runScriptResult("validate-evidence-freshness.mjs", ["--input", unresolvedPack, "--ci"]).stderr).toMatch(/unresolved/);
  }, 20000);

  it("accepts current recorded evidence freshness values", () => {
    const expectedHead = /^[0-9a-f]{40}$/i.test(evidencePack.headSha) ? evidencePack.headSha : "1234567890abcdef1234567890abcdef12345678";
    expect(runScript("validate-evidence-freshness.mjs", [
      "--head", expectedHead,
      "--actual-head", expectedHead,
      "--tests", String(evidencePack.testSummary.passed),
      "--ci-run", evidencePack.ciRunId,
      "--quality-gate-run", evidencePack.qualityGateRunId,
      "--quality-gate-artifact", evidencePack.qualityGateArtifactId
    ])).toContain("passed");
  });

  it("resolves current_pr_head when validating freshness", () => {
    const packInput = writeJsonFixture("pack", { ...evidencePack, headSha: "current_pr_head" });
    expect(runScript("validate-evidence-freshness.mjs", [
      "--input", packInput,
      "--head", "1234567890abcdef1234567890abcdef12345678",
      "--tests", String(evidencePack.testSummary.passed),
      "--quality-gate-run", evidencePack.qualityGateRunId
    ])).toContain("passed");
  });

  it("resolves current_pr_head in the strict evidence pack validator", () => {
    const result = execFileSync("node", [path.join(root, "scripts", "codex-evidence-pack-validate.mjs"), "--json"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        CODEX_EVENT_NAME: "pull_request",
        CODEX_PR_NUMBER: "20",
        CODEX_PR_HEAD_SHA: evidencePack.headSha,
        CODEX_PR_BASE_SHA: evidencePack.baseSha,
        CODEX_HARNESS_SOURCE_REPO: "1"
      }
    });
    expect(JSON.parse(result).evidencePackStatus.status).toBe("pass");
    expect(JSON.parse(result).normalizedEvidencePack.headSha).toBe(evidencePack.headSha);
  });

  it("rejects forbidden evidence placeholders", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cripto-tip-placeholder-"));
    const file = path.join(dir, "bad.md");
    fs.writeFileSync(file, "HEAD_SHA_PLACEHOLDER");
    expect(runScriptResult("check-evidence-placeholders.mjs", [dir]).stderr).toMatch(/placeholder/);
  });

  it("writes test summary from Vitest output", () => {
    const file = path.join(os.tmpdir(), `cripto-tip-vitest-${Date.now()}.txt`);
    fs.writeFileSync(file, "Test Files  20 passed (20)\nTests  178 passed | 6 skipped (184)\n");
    expect(runScript("write-test-summary.mjs", ["--from", file])).toContain("178 passed");
  });

  it("renders risk register and manual gate sections", () => {
    const output = path.join(os.tmpdir(), `cripto-tip-pr-evidence-render-${Date.now()}.md`);
    const riskOutput = path.join(os.tmpdir(), `cripto-tip-risk-${Date.now()}.md`);
    const manualGateOutput = path.join(os.tmpdir(), `cripto-tip-manual-gates-${Date.now()}.md`);
    runScript("render-pr-evidence.mjs", [
      "--input", ".codex/evidence-pack.json",
      "--output", output,
      "--render-risk",
      "--risk-output", riskOutput,
      "--render-manual-gates",
      "--manual-gates-output", manualGateOutput
    ]);
    expect(fs.readFileSync(riskOutput, "utf8")).toContain("Machine-Readable Risk Register");
    expect(fs.readFileSync(manualGateOutput, "utf8")).toContain("Machine-Readable Manual Gate Registry");
  });

  it("keeps quality-gate self-protection preparation explicit", () => {
    expect(runScript("check-quality-gate-self-protection.mjs")).toContain("passed");
  });

  it("fetches GitHub run evidence from fixture JSON and injects run and artifact IDs", () => {
    const head = "1234567890abcdef1234567890abcdef12345678";
    const prJson = writeJsonFixture("pr", { headRefName: "feature", headRefOid: head, baseRefOid: "abcdef1234567890abcdef1234567890abcdef12" });
    const runsJson = writeJsonFixture("runs", [
      { databaseId: 1, workflowName: "ci", conclusion: "success", headSha: "stale", createdAt: "2026-01-01T00:00:00Z" },
      { databaseId: 2, workflowName: "ci", conclusion: "success", headSha: head, createdAt: "2026-01-02T00:00:00Z" },
      { databaseId: 3, workflowName: "quality-gate", conclusion: "success", headSha: head, createdAt: "2026-01-02T00:01:00Z" }
    ]);
    const artifactsJson = writeJsonFixture("artifacts", { artifacts: [{ id: 44, name: "codex-quality-gate-safe-artifacts" }] });
    const packInput = writeJsonFixture("pack", { ...evidencePack, headSha: "current_pr_head" });
    const packOutput = path.join(os.tmpdir(), `cripto-tip-pack-${Date.now()}.json`);
    runScript("fetch-github-run-evidence.mjs", [
      "--input", packInput,
      "--output", packOutput,
      "--pr-json", prJson,
      "--runs-json", runsJson,
      "--artifacts-json", artifactsJson
    ]);
    const updated = JSON.parse(fs.readFileSync(packOutput, "utf8"));
    expect(updated.headSha).toBe(head);
    expect(updated.ciRunId).toBe("2");
    expect(updated.qualityGateRunId).toBe("3");
    expect(updated.qualityGateArtifactId).toBe("44");
  });

  it("rejects stale-head GitHub runs and missing quality-gate artifact", () => {
    const head = "1234567890abcdef1234567890abcdef12345678";
    const prJson = writeJsonFixture("pr", { headRefName: "feature", headRefOid: head });
    const staleRunsJson = writeJsonFixture("runs", [
      { databaseId: 2, workflowName: "ci", conclusion: "success", headSha: "stale", createdAt: "2026-01-02T00:00:00Z" },
      { databaseId: 3, workflowName: "quality-gate", conclusion: "success", headSha: "stale", createdAt: "2026-01-02T00:01:00Z" }
    ]);
    const goodRunsJson = writeJsonFixture("runs", [
      { databaseId: 2, workflowName: "ci", conclusion: "success", headSha: head, createdAt: "2026-01-02T00:00:00Z" },
      { databaseId: 3, workflowName: "quality-gate", conclusion: "success", headSha: head, createdAt: "2026-01-02T00:01:00Z" }
    ]);
    const missingArtifactJson = writeJsonFixture("artifacts", { artifacts: [{ id: 99, name: "other" }] });
    const packInput = writeJsonFixture("pack", { ...evidencePack, headSha: "current_pr_head" });
    expect(runScriptResult("fetch-github-run-evidence.mjs", ["--input", packInput, "--pr-json", prJson, "--runs-json", staleRunsJson, "--artifacts-json", missingArtifactJson]).stderr).toMatch(/No successful .* run/);
    expect(runScriptResult("fetch-github-run-evidence.mjs", ["--input", packInput, "--pr-json", prJson, "--runs-json", goodRunsJson, "--artifacts-json", missingArtifactJson]).stderr).toMatch(/Missing codex-quality-gate-safe-artifacts/);
  });

  it("rejects quality-gate artifacts from stale runs or stale heads", () => {
    const head = "1234567890abcdef1234567890abcdef12345678";
    const prJson = writeJsonFixture("pr", { headRefName: "feature", headRefOid: head });
    const runsJson = writeJsonFixture("runs", [
      { databaseId: 2, workflowName: "ci", conclusion: "success", headSha: head, createdAt: "2026-01-02T00:00:00Z" },
      { databaseId: 3, workflowName: "quality-gate", conclusion: "success", headSha: head, createdAt: "2026-01-02T00:01:00Z" }
    ]);
    const staleRunArtifactJson = writeJsonFixture("artifacts", {
      artifacts: [{ id: 44, name: "codex-quality-gate-safe-artifacts", workflow_run: { id: 99, head_sha: head } }]
    });
    const staleHeadArtifactJson = writeJsonFixture("artifacts", {
      artifacts: [{ id: 45, name: "codex-quality-gate-safe-artifacts", workflow_run: { id: 3, head_sha: "0000000000000000000000000000000000000000" } }]
    });
    const packInput = writeJsonFixture("pack", { ...evidencePack, headSha: "current_pr_head" });
    expect(runScriptResult("fetch-github-run-evidence.mjs", ["--input", packInput, "--pr-json", prJson, "--runs-json", runsJson, "--artifacts-json", staleRunArtifactJson]).stderr).toMatch(/Missing codex-quality-gate-safe-artifacts/);
    expect(runScriptResult("fetch-github-run-evidence.mjs", ["--input", packInput, "--pr-json", prJson, "--runs-json", runsJson, "--artifacts-json", staleHeadArtifactJson]).stderr).toMatch(/Missing codex-quality-gate-safe-artifacts/);
  });

  it("chooses newest successful runs for the same head and ignores failed newer runs", () => {
    const head = "1234567890abcdef1234567890abcdef12345678";
    const prJson = writeJsonFixture("pr", { headRefName: "feature", headRefOid: head });
    const runsJson = writeJsonFixture("runs", [
      { databaseId: 2, workflowName: "ci", conclusion: "success", headSha: head, createdAt: "2026-01-02T00:00:00Z" },
      { databaseId: 4, workflowName: "ci", conclusion: "failure", headSha: head, createdAt: "2026-01-03T00:00:00Z" },
      { databaseId: 5, workflowName: "ci", conclusion: "success", headSha: head, createdAt: "2026-01-04T00:00:00Z" },
      { databaseId: 3, workflowName: "quality-gate", conclusion: "success", headSha: head, createdAt: "2026-01-02T00:01:00Z" }
    ]);
    const artifactsJson = writeJsonFixture("artifacts", { artifacts: [{ id: 44, name: "codex-quality-gate-safe-artifacts", workflow_run: { id: 3, head_sha: head } }] });
    const packInput = writeJsonFixture("pack", { ...evidencePack, headSha: "current_pr_head" });
    const packOutput = path.join(os.tmpdir(), `cripto-tip-pack-newest-${Date.now()}.json`);
    runScript("fetch-github-run-evidence.mjs", ["--input", packInput, "--output", packOutput, "--pr-json", prJson, "--runs-json", runsJson, "--artifacts-json", artifactsJson]);
    expect(JSON.parse(fs.readFileSync(packOutput, "utf8")).ciRunId).toBe("5");
  });

  it("rejects fixture PR head that differs from a concrete evidence-pack head", () => {
    const packInput = writeJsonFixture("pack", { ...evidencePack, headSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });
    const prJson = writeJsonFixture("pr", { headRefName: "feature", headRefOid: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" });
    const runsJson = writeJsonFixture("runs", [
      { databaseId: 2, workflowName: "ci", conclusion: "success", headSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", createdAt: "2026-01-02T00:00:00Z" },
      { databaseId: 3, workflowName: "quality-gate", conclusion: "success", headSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", createdAt: "2026-01-02T00:01:00Z" }
    ]);
    const artifactsJson = writeJsonFixture("artifacts", { artifacts: [{ id: 44, name: "codex-quality-gate-safe-artifacts" }] });
    expect(runScriptResult("fetch-github-run-evidence.mjs", ["--input", packInput, "--pr-json", prJson, "--runs-json", runsJson, "--artifacts-json", artifactsJson]).stderr).toMatch(/head SHA/);
  });

  it("supports offline-readonly GitHub evidence validation without mutating evidence", () => {
    expect(runScript("fetch-github-run-evidence.mjs", ["--offline-readonly"])).toContain("offline-readonly");
  });

  it("quality-gate self-protection detects weakened quality-gate workflow", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cripto-tip-qg-"));
    const workflow = path.join(dir, "quality-gate.yml");
    fs.writeFileSync(workflow, "name: quality-gate\njobs:\n  quality-gate:\n    continue-on-error: true\n");
    const result = runScriptResult("check-quality-gate-self-protection.mjs", ["--workflow", workflow, "--scripts-dir", dir]);
    expect(result.stderr).toMatch(/missing required protection|continue-on-error/);
  });

  it("quality-gate self-protection detects removed required workflow steps", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cripto-tip-qg-missing-"));
    const workflow = path.join(dir, "quality-gate.yml");
    fs.writeFileSync(workflow, [
      "name: quality-gate",
      "jobs:",
      "  quality-gate:",
      "    steps:",
      "      - name: Write safe quality summary",
      "        run: echo summary",
      "      - name: Upload safe quality artifacts",
      "        uses: actions/upload-artifact@v4",
      "        with:",
      "          name: codex-quality-gate-safe-artifacts",
      "          if-no-files-found: error"
    ].join("\n"));
    const result = runScriptResult("check-quality-gate-self-protection.mjs", ["--workflow", workflow, "--scripts-dir", dir]);
    expect(result.stderr).toMatch(/Run Codex quality gate/);
  });

  it("quality-gate self-protection detects unsafe artifact upload behavior", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cripto-tip-qg-artifact-"));
    const workflow = path.join(dir, "quality-gate.yml");
    fs.writeFileSync(workflow, [
      "name: quality-gate",
      "jobs:",
      "  quality-gate:",
      "    steps:",
      "      - name: Run Codex quality gate",
      "        run: node scripts/codex-local-quality-gate.mjs",
      "      - name: Write safe quality summary",
      "        run: echo summary",
      "      - name: Upload safe quality artifacts",
      "        uses: actions/upload-artifact@v4",
      "        with:",
      "          name: codex-quality-gate-safe-artifacts",
      "          if-no-files-found: ignore"
    ].join("\n"));
    const result = runScriptResult("check-quality-gate-self-protection.mjs", ["--workflow", workflow, "--scripts-dir", dir]);
    expect(result.stderr).toMatch(/artifact upload/);
  });

  it("quality-gate self-protection detects executable always-pass wording", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cripto-tip-qg-script-"));
    const workflow = path.join(dir, "quality-gate.yml");
    const script = path.join(dir, "unsafe.mjs");
    fs.writeFileSync(workflow, [
      "name: quality-gate",
      "jobs:",
      "  quality-gate:",
      "    steps:",
      "      - name: Run Codex quality gate",
      "        run: node scripts/codex-local-quality-gate.mjs",
      "      - name: Write safe quality summary",
      "        run: echo summary",
      "      - name: Upload safe quality artifacts",
      "        uses: actions/upload-artifact@v4",
      "        with:",
      "          name: codex-quality-gate-safe-artifacts",
      "          if-no-files-found: error"
    ].join("\n"));
    fs.writeFileSync(script, "export const note = 'always pass';\n");
    const result = runScriptResult("check-quality-gate-self-protection.mjs", ["--workflow", workflow, "--scripts-dir", dir]);
    expect(result.stderr).toMatch(/always pass/);
  });

  it("marks remote npm diagnostic as executed when npm exit code is present", async () => {
    const result = execFileSync("node", [path.join(root, "scripts", "codex-remote-npm-diagnostic-classify.mjs")], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        CODEX_QUALITY_REPORT: "json",
        CODEX_NPM_TEST_SAFE_SUMMARY_JSON: JSON.stringify({
          schemaVersion: "0.8.3",
          npmExitCode: 0,
          safeFailureCategory: "test_assertion_failure",
          rawValuesStored: false,
          safeSummaryOnly: true
        })
      }
    });
    const parsed = JSON.parse(result);
    expect(parsed.remoteNpmDiagnosticStatus.status).toBe("pass");
    expect(parsed.remoteNpmDiagnosticStatus.npmExecuted).toBe(true);
    expect(parsed.remoteNpmDiagnosticStatus.npmExitCode).toBe(0);
  });

  it("accepts diagnostic npm exit code as remote npm execution evidence", () => {
    const result = execFileSync("node", [path.join(root, "scripts", "codex-remote-npm-diagnostic-normalization-gate.mjs")], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        CODEX_QUALITY_REPORT: "json",
        CODEX_CHANGE_CLASSIFICATION_JSON: JSON.stringify({
          changeClassificationStatus: {
            productRelevantChanged: true,
            packageOrLockfileChanged: true,
            runtimeReadinessClaimed: false
          }
        }),
        CODEX_REMOTE_NPM_DIAGNOSTIC_JSON: JSON.stringify({
          status: "pass",
          diagnostic: {
            npmExitCode: 0
          }
        })
      }
    });
    expect(JSON.parse(result).remoteNpmDiagnosticNormalizationStatus.status).toBe("pass");
  });
});
