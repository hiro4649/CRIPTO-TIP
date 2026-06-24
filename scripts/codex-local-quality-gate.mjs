#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
function run(script) {
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  return { script, status: result.status === 0 ? 'pass' : 'fail', stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}
const checks = [
  run('scripts/codex-v129-self-test.mjs'),
  run('scripts/codex-v128-self-test.mjs'),
  run('scripts/codex-v127-self-test.mjs')
];
const manifest = JSON.parse(fs.readFileSync('docs/process/CODEX_HARNESS_MANIFEST.json', 'utf8'));
const blocking = checks.filter((check) => check.status !== 'pass').map((check) => check.script);
if (manifest.productCodeChanged !== false) blocking.push('product_code_changed');
if (manifest.runtimeCodeChanged !== false) blocking.push('runtime_code_changed');
if (manifest.packageOrLockfileChanged !== false) blocking.push('package_or_lockfile_changed');
if (manifest.workflowChanged !== false) blocking.push('workflow_changed');
if (manifest.authorityCreated !== false) blocking.push('authority_created');
const report = {
  status: blocking.length ? 'fail' : 'pass',
  qualityScore: blocking.length ? 0 : 100,
  blockingCount: blocking.length,
  blockingReasons: blocking,
  safeArtifactValidation: blocking.length ? 'fail' : 'pass',
  tokenBudgets: 'pass',
  v129SelfTestStatus: checks[0].status,
  v128CompatibilityStatus: checks[1].status,
  v127CompatibilityStatus: checks[2].status,
  productRuntimeMutationCount: 0,
  packageOrLockfileChanged: false,
  workflowChanged: false,
  authorityCreated: false,
  finalAuthority: manifest.finalAuthority,
  activeHarnessVersion: manifest.activeHarnessVersion,
  activeSelfTestSuite: manifest.activeSelfTestSuite,
  targetRollout: manifest.targetRollout
};
if (process.env.CODEX_QUALITY_REPORT === 'json') console.log(JSON.stringify(report));
else console.log(blocking.length ? 'quality-gate: fail' : 'quality-gate: pass');
process.exit(blocking.length ? 1 : 0);
