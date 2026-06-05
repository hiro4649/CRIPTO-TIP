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

describe("evidence single source of truth scripts", () => {
  const evidencePack = JSON.parse(fs.readFileSync(path.join(root, ".codex", "evidence-pack.json"), "utf8"));

  it("renders PR evidence from evidence-pack with required quality-gate headings", () => {
    const output = path.join(os.tmpdir(), `cripto-tip-pr-evidence-${Date.now()}.md`);
    runScript("render-pr-evidence.mjs", ["--input", ".codex/evidence-pack.json", "--output", output]);
    const rendered = fs.readFileSync(output, "utf8");
    expect(rendered).toContain("## Task Contract");
    expect(rendered).toContain("## Evidence Integrity");
    expect(rendered).toContain("## Testing and review");
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
    expect(runScriptResult("validate-evidence-freshness.mjs", ["--quality-gate-run", "1"]).stderr).toMatch(/stale/);
  }, 20000);

  it("accepts current recorded evidence freshness values", () => {
    expect(runScript("validate-evidence-freshness.mjs", [
      "--head", evidencePack.headSha,
      "--tests", String(evidencePack.testSummary.passed),
      "--quality-gate-run", evidencePack.qualityGateRunId
    ])).toContain("passed");
  });

  it("resolves current_pr_head when validating freshness", () => {
    expect(runScript("validate-evidence-freshness.mjs", [
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
        CODEX_PR_NUMBER: "18",
        CODEX_PR_HEAD_SHA: "1234567890abcdef1234567890abcdef12345678",
        CODEX_PR_BASE_SHA: "abcdef1234567890abcdef1234567890abcdef12",
        CODEX_HARNESS_SOURCE_REPO: "1"
      }
    });
    expect(JSON.parse(result).evidencePackStatus.status).toBe("pass");
    expect(JSON.parse(result).normalizedEvidencePack.headSha).toBe("1234567890abcdef1234567890abcdef12345678");
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
});
