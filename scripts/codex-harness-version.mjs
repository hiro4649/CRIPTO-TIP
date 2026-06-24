#!/usr/bin/env node
const version = {
  marker: 'CODEX_QUALITY_HARNESS_FILE v1.2.9',
  activeHarnessVersion: '1.2.9',
  targetHarnessVersion: '1.2.9',
  activeSelfTestSuite: 'v129',
  targetRollout: 'completed',
  rolloutClass: 'complex',
  materialization: 'target_quality_gate_active_path'
};
if (process.env.CODEX_QUALITY_REPORT === 'json') {
  console.log(JSON.stringify(version));
} else {
  console.log('HARNESS v1.2.9 target profile active');
}
