#!/usr/bin/env node
import { valueAfter, readJson, writeJson, classifySummary, validateSafeArtifact } from "./ci-safe-lib.mjs";

const args = process.argv.slice(2);
const inputPath = valueAfter(args, "--input");
if (!inputPath) {
  console.error("--input is required");
  process.exit(1);
}
const output = valueAfter(args, "--output");
const input = readJson(inputPath);
if (input.schema_version) validateSafeArtifact(input);
const result = {
  schema_version: "1.0.0",
  safe_reason_code: input.safe_reason_code || classifySummary(input),
  raw_log_allowed: false,
  raw_log_required: Boolean(input.raw_log_required),
  metadata_limited: Boolean(input.metadata_limited),
  next_safe_action: input.next_safe_action || "Use safe artifact metadata; CI transcript bodies remain out of scope."
};
if (output) writeJson(output, result);
console.log(JSON.stringify(result, null, 2));
