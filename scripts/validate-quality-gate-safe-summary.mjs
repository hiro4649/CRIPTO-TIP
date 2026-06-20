#!/usr/bin/env node
import fs from "node:fs";

const args = process.argv.slice(2);

function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function fail(reasonCode) {
  console.error(`safe_summary_validation_failed=${reasonCode}`);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    fail("safe_summary_json_parse_failed");
  }
}

function scoreObject(summary) {
  return summary.targetQualityScoreStatus || summary.qualityScoreStatus || {};
}

function blockingStatuses(summary) {
  const score = scoreObject(summary);
  return Array.isArray(score.blockingStatuses) ? score.blockingStatuses : [];
}

function technicalBlockingStatuses(summary) {
  return Array.isArray(summary.technicalBlockingStatuses) ? summary.technicalBlockingStatuses : [];
}

function technicalEvidenceRequiredStatuses(summary) {
  return Array.isArray(summary.technicalEvidenceRequiredStatuses) ? summary.technicalEvidenceRequiredStatuses : [];
}

function allowedOptionalStatus(status) {
  return ["pass", "not_required", "not_applicable"].includes(String(status || ""));
}

function validate(summary, options = {}) {
  const failures = [];
  const expectedHead = options.expectedHead || "";
  const technicalOnly = options.technicalOnly === true;

  if (!summary || typeof summary !== "object" || Array.isArray(summary)) failures.push("summary_not_object");
  if (summary.status !== "pass") failures.push("summary_status_not_pass");
  if (summary.technicalStatus && summary.technicalStatus !== "pass") failures.push("technical_status_not_pass");
  if (summary.technicalChecksReady !== true) failures.push("technical_checks_not_ready");
  if (!technicalOnly && blockingStatuses(summary).length !== 0) failures.push("blocking_statuses_present");
  if (technicalBlockingStatuses(summary).length !== 0) failures.push("technical_blocking_statuses_present");
  if (technicalEvidenceRequiredStatuses(summary).length !== 0) failures.push("technical_evidence_required_statuses_present");

  if (summary.securityLifecycleStatus && summary.securityLifecycleStatus.status !== "pass") {
    failures.push("security_lifecycle_not_pass");
  }
  if (summary.bestOfNEvidenceStatus && !allowedOptionalStatus(summary.bestOfNEvidenceStatus.status)) {
    failures.push("best_of_n_evidence_not_pass");
  }
  if (summary.requiredHeadingHintStatus && !allowedOptionalStatus(summary.requiredHeadingHintStatus.status)) {
    failures.push("required_heading_hint_not_pass");
  }
  if (summary.taskModeStatus && summary.taskModeStatus.status !== "pass") {
    failures.push("task_mode_not_pass");
  }
  if (summary.prProfileStatus && summary.prProfileStatus.status !== "pass") {
    failures.push("pr_profile_not_pass");
  }

  if (expectedHead) {
    const observedHead =
      summary.head ||
      summary.headSha ||
      summary.decisionCapsule?.headSha ||
      summary.decisionCapsule?.head ||
      summary.finalDecision?.headSha ||
      "";
    if (observedHead && observedHead !== expectedHead) failures.push("head_mismatch");
  }

  return failures;
}

const input = valueAfter("--input");
if (!input) fail("input_missing");

const failures = validate(readJson(input), {
  expectedHead: valueAfter("--expected-head") || "",
  technicalOnly: args.includes("--technical-only"),
});

if (failures.length) fail(failures[0]);

console.log("quality_gate_safe_summary_validation=pass");
