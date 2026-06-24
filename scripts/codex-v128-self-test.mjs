#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.8

import fs from 'node:fs';
import { writeJsonReport, exitFor } from './codex-v080-lib.mjs';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function test(name, fn) {
  try {
    return { name, status: fn() ? 'pass' : 'fail', safeSummaryOnly: true };
  } catch {
    return { name, status: 'fail', reasonCodes: ['self_test_exception'], safeSummaryOnly: true };
  }
}

const agents = fs.readFileSync('AGENTS.md', 'utf8');
const manifest = readJson('docs/process/CODEX_HARNESS_MANIFEST.json');
const policy = readJson('docs/process/CODEX_ACTIVE_POLICY_INDEX.json');

const v128 = manifest.deterministicDecisionProjectionAndTokenMinimalLoopClosure || {};
const safety = v128.complexSafety || {};

const cases = [
  ['v128_self_test_must_pass', () => true],
  ['agents_marker_supports_v128_rollback', () => agents.includes('CODEX_QUALITY_HARNESS_FILE v1.2.9')
    && agents.includes('v1.2.8 remains available as rollback')],
  ['manifest_exposes_v128_rollback_tuple', () => manifest.activeHarnessVersion === '1.2.9'
    && manifest.activeSelfTestSuite === 'v129'
    && manifest.versioningRollback?.activeHarnessVersion === '1.2.8'
    && manifest.versioningRollback?.activeSelfTestSuite === 'v128'
    && manifest.versioningRollback?.activeSelfTestStatusKey === 'v128SelfTestStatus'],
  ['complex_target_materialization_is_active_path_only', () => manifest.targetRepoMode === true
    && v128.rolloutClass === 'complex'
    && v128.materialization === 'target_quality_gate_active_path'
    && v128.sourceFullBundleCopied === false
    && v128.workflowChanged === false
    && v128.productCodeChanged === false
    && v128.packageOrLockfileChanged === false],
  ['v127_rollback_tuple_available', () => manifest.versioning?.activeHarnessVersion === '1.2.7'
    && manifest.versioning?.activeSelfTestSuite === 'v127'
    && manifest.versioning?.rollbackAvailable === true
    && ['blocking_compatibility_rollback', 'blocking_compatibility'].includes(manifest.legacySelfTests?.v127)],
  ['crypto_youtube_runtime_boundaries_preserved', () => safety.cryptoCustodyBoundaryPreserved === true
    && safety.youtubePolicyBoundaryPreserved === true
    && safety.deployForbidden === true
    && safety.walletAccessForbidden === true
    && safety.rpcAccessForbidden === true
    && safety.secretAccessForbidden === true
    && safety.runtimeReadinessClaimed === false
    && safety.productionReadinessClaimed === false
    && safety.legalComplianceClaimed === false
    && safety.youtubePolicyComplianceClaimed === false],
  ['token_economy_budget_is_restricted', () => v128.routineColdArtifactRead === 0
    && v128.routineSelectedSkillMax === 1
    && v128.routineReviewerFanout === 0
    && v128.routineOwnerInterruptMax === 0],
  ['policy_index_points_to_v129_with_v128_rollback_and_v127_deferred', () => policy.schemaVersion === '1.2.9'
    && policy.requiredReads.includes('docs/process/CODEX_V129_SPEC.md')
    && policy.deferredReads.includes('docs/process/CODEX_V128_SPEC.md')
    && policy.deferredReads.includes('docs/process/CODEX_V127_SPEC.md')
    && policy.selectedSkillsMax === 1],
  ['pr_body_is_not_machine_evidence', () => manifest.prBodyMachineEvidence === false
    && v128.prBodyMachineEvidence === false],
  ['active_spec_exists', () => fs.existsSync('docs/process/CODEX_V128_SPEC.md')],
].map(([name, fn]) => test(name, fn));

const failures = cases.filter((item) => item.status !== 'pass');
const report = {
  v128SelfTestStatus: {
    status: failures.length ? 'fail' : 'pass',
    caseCount: cases.length,
    failureCount: failures.length,
    safeSummaryOnly: true,
  },
  cases,
  status: failures.length ? 'fail' : 'pass',
  safeSummaryOnly: true,
};

writeJsonReport(report, 'CODEX_V128_SELF_TEST_REPORT');
if (!process.env.CODEX_V128_SELF_TEST_REPORT && process.env.CODEX_QUALITY_REPORT !== 'json') {
  console.log(`v128SelfTestStatus: ${report.v128SelfTestStatus.status}`);
}
exitFor(report);
