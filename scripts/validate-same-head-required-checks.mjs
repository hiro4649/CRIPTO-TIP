#!/usr/bin/env node
import { valueAfter, readJson, buildRequiredChecksMetadata } from "./ci-safe-lib.mjs";

const args = process.argv.slice(2);
const inputPath = valueAfter(args, "--input");
if (!inputPath) {
  console.error("--input is required");
  process.exit(1);
}
const input = readJson(inputPath);
const metadata = input.required_checks ? input : buildRequiredChecksMetadata(input);
if (metadata.artifact_generation_phase !== "post_required_checks") {
  console.error("required_check_metadata_incomplete");
  process.exit(1);
}
if (!metadata.same_head_required_checks_passed) {
  console.error(metadata.safe_reason_code || "same_head_required_checks_not_all_pass");
  process.exit(1);
}
console.log("Same-head required checks validation passed.");
