#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return [full];
  });
}

function assertWorkflowProtected(workflowPath) {
  if (!fs.existsSync(workflowPath)) throw new Error(`quality-gate workflow missing: ${workflowPath}`);
  const text = fs.readFileSync(workflowPath, "utf8");
  const requiredSnippets = [
    "Run Codex quality gate",
    "Write safe quality summary",
    "Upload safe quality artifacts",
    "codex-quality-gate-safe-artifacts"
  ];
  for (const snippet of requiredSnippets) {
    if (!text.includes(snippet)) throw new Error(`quality-gate workflow missing required protection: ${snippet}`);
  }
  if (/continue-on-error\s*:\s*true/i.test(text)) {
    throw new Error("quality-gate workflow must not use continue-on-error: true");
  }
}

function assertExecutableScriptsProtected(scriptsDir) {
  const executableFiles = listFiles(scriptsDir)
    .filter((file) => /\.(mjs|js|cjs|sh|bash|yml|yaml)$/i.test(file))
    .filter((file) => !file.endsWith("check-quality-gate-self-protection.mjs"));
  const dangerousPatterns = [
    { pattern: /\balways\s+pass\b/i, message: "always pass wording" },
    { pattern: /\bignore\s+failure\b/i, message: "ignore failure wording" },
    { pattern: /\bskip\s+quality\b/i, message: "skip quality wording" }
  ];
  for (const file of executableFiles) {
    const text = fs.readFileSync(file, "utf8");
    if (/codex-local-quality-gate|quality-gate|codex-workflow-quality-runner|codex-secret|scrap/i.test(text)) {
      if (/\|\|\s*true/.test(text) && !/lifeboat|artifact|optional|fallback/i.test(text)) {
        throw new Error(`unsafe || true in required quality path: ${file}`);
      }
    }
    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(text)) throw new Error(`${message} in executable script: ${file}`);
    }
  }
}

const workflowPath = valueAfter("--workflow") || ".github/workflows/quality-gate.yml";
const scriptsDir = valueAfter("--scripts-dir") || "scripts";

assertWorkflowProtected(workflowPath);
assertExecutableScriptsProtected(scriptsDir);
console.log("Quality-gate self-protection passed.");
