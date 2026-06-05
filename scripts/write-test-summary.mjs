#!/usr/bin/env node
import fs from "node:fs";
import { readJson } from "./evidence-lib.mjs";

const args = process.argv.slice(2);
const input = args[args.indexOf("--from") + 1];
let summary;
if (input && fs.existsSync(input)) {
  const text = fs.readFileSync(input, "utf8");
  const files = text.match(/Test Files\s+(\d+) passed/);
  const tests = text.match(/Tests\s+(\d+) passed(?:\s+\|\s+(\d+) skipped)?/);
  if (!files || !tests) throw new Error("unable to parse test summary");
  summary = {
    schemaVersion: "1.0.0",
    command: "corepack pnpm test",
    testFiles: Number(files[1]),
    passed: Number(tests[1]),
    skipped: Number(tests[2] || 0)
  };
} else {
  const packSummary = readJson(".codex/evidence-pack.json").testSummary;
  summary = {
    schemaVersion: "1.0.0",
    command: "corepack pnpm test",
    testFiles: Number(packSummary.testFiles),
    passed: Number(packSummary.passed),
    skipped: Number(packSummary.skipped)
  };
}
fs.writeFileSync(".codex/test-summary.json", JSON.stringify(summary, null, 2) + "\n");
console.log(`Test summary: ${summary.testFiles} files, ${summary.passed} passed, ${summary.skipped} skipped.`);
