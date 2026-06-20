#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.7
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { buildTechnicalReadinessState } from './codex-technical-readiness-policy.mjs';
import { buildFormalEvidencePrecedenceReport } from './codex-v099-gate-lib.mjs';

function assertCase(name, condition, details = '') {
  if (condition) return;
  throw new Error(`${name}_failed${details ? `:${details}` : ''}`);
}

function readFixture() {
  return JSON.parse(fs.readFileSync('fixtures/harness/pr172-manual-advisory-technical-ready-candidate.json', 'utf8'));
}

function runPrProfileGate(body) {
  const result = spawnSync('node', ['scripts/codex-pr-profile-gate.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      CODEX_QUALITY_REPORT: 'json',
      CODEX_EVENT_NAME: 'pull_request',
      CODEX_CHANGED_FILES: 'scripts/codex-local-quality-gate.mjs',
      CODEX_PR_BODY: body,
      CODEX_RISK_LEVEL: 'R2',
    },
  });
  return JSON.parse(result.stdout).prProfileStatus;
}

const fixture = readFixture();
const advisoryReport = {
  humanReviewRequired: true,
  ownerMergeAuthorized: false,
  targetQualityScoreStatus: {
    status: fixture.safeSummaryStatus,
    blockingStatuses: fixture.blockingStatuses,
    manualStatuses: fixture.manualStatuses,
  },
  securityLifecycleStatus: { status: fixture.securityLifecycleStatus },
  bestOfNEvidenceStatus: { status: 'pass' },
  testCoverageEvidenceStatus: { status: 'pass' },
  prProfileStatus: { status: 'warning', reasonCodes: ['profile_escalation_accepted'] },
  safeSummaryOnly: true,
};

const advisoryState = buildTechnicalReadinessState(advisoryReport);
assertCase('manual_advisories_are_technically_ready', advisoryState.technicalStatus === 'pass');
assertCase('manual_advisories_set_technical_ready_boolean', advisoryState.technicalChecksReady === true);
assertCase('manual_advisories_have_no_technical_blockers', advisoryState.technicalBlockingStatuses.length === 0);
assertCase('manual_advisories_have_no_technical_evidence_blockers', advisoryState.technicalEvidenceRequiredStatuses.length === 0);
assertCase('owner_review_stays_separate', advisoryState.ownerReviewRequired === true);
assertCase('owner_review_does_not_create_merge_authority', advisoryState.mergeReady === false);
assertCase('artifact_soft_budget_is_advisory', advisoryState.advisoryStatuses.some((item) => item.reasonCode === 'artifact_budget_exceeded'));

const unknownState = buildTechnicalReadinessState({
  targetQualityScoreStatus: {
    status: 'manual_confirmation_required',
    blockingStatuses: [],
    manualStatuses: [{ key: 'unknownGateStatus', status: 'manual_confirmation_required', reasonCodes: ['new_unknown_reason'] }],
  },
  safeSummaryOnly: true,
});
assertCase('unknown_reason_fails_closed', unknownState.technicalStatus === 'fail');
assertCase('unknown_reason_requires_technical_evidence', unknownState.technicalEvidenceRequiredStatuses[0]?.reasonCode === 'new_unknown_reason');

const hardBudgetState = buildTechnicalReadinessState({
  targetQualityScoreStatus: {
    status: 'fail',
    blockingStatuses: [{ key: 'safeArtifactIndexStatus', status: 'fail', reasonCodes: ['artifact_hard_budget_exceeded'] }],
    manualStatuses: [],
  },
  safeSummaryOnly: true,
});
assertCase('hard_artifact_budget_is_blocking', hardBudgetState.technicalBlockingStatuses[0]?.reasonCode === 'artifact_hard_budget_exceeded');

const requiredHeadingHintState = buildTechnicalReadinessState({
  targetQualityScoreStatus: {
    status: 'pass',
    blockingStatuses: [],
    manualStatuses: [{ key: 'requiredHeadingHintStatus', status: 'warning' }],
  },
  safeSummaryOnly: true,
});
assertCase('required_heading_hint_is_advisory', requiredHeadingHintState.technicalStatus === 'pass' &&
  requiredHeadingHintState.advisoryStatuses.some((item) => item.reasonCode === 'requiredHeadingHintStatus'));

const safeArtifactManualOutcomeState = buildTechnicalReadinessState({
  targetQualityScoreStatus: {
    status: 'pass',
    blockingStatuses: [],
    manualStatuses: [{ key: 'safeArtifactIndexStatus', status: 'warning' }],
  },
  safeSummaryOnly: true,
}, {
  warnings: [{ id: 'safeArtifactIndexStatus.manual' }],
});
assertCase('safe_artifact_index_manual_outcome_is_advisory', safeArtifactManualOutcomeState.technicalStatus === 'pass' &&
  safeArtifactManualOutcomeState.technicalEvidenceRequiredStatuses.length === 0);

const compatibleBody = [
  'PR profile: harness_workflow_r3',
  '## Goal',
  'repair harness',
  '## Risk level',
  'R3',
  '## Files or scope',
  'scripts/codex-local-quality-gate.mjs',
  '## Evidence Integrity',
  'safe evidence only',
  '## Validation commands',
  'node --check',
  '## Residual risks',
  'remote gate pending',
  '## Human confirmation needed',
  'owner approval not created',
].join('\n');
const downgradeBody = [
  'PR profile: docs_only_r1_r2',
  '## Goal',
  'repair harness',
  '## Files or scope',
  'scripts/codex-local-quality-gate.mjs',
  '## Validation',
  'node --check',
  '## Residual risks',
  'remote gate pending',
].join('\n');
const compatible = runPrProfileGate(compatibleBody);
const downgrade = runPrProfileGate(downgradeBody);
assertCase('compatible_profile_escalation_passes', compatible.status === 'pass' && compatible.profileEscalated === true);
assertCase('profile_downgrade_fails', downgrade.status === 'fail' && downgrade.reasonCodes.includes('profile_downgrade'));

const harnessOnlyFormalPrecedence = buildFormalEvidencePrecedenceReport({
  productRelevant: false,
  productEvidence: { status: 'pass' },
});
assertCase('formal_precedence_not_applicable_for_harness_only', harnessOnlyFormalPrecedence.formalEvidencePrecedenceStatus.status === 'not_applicable');

const validatorInput = 'codex-h3-v127-technical-readiness-self-test.safe-summary.json';
fs.writeFileSync(validatorInput, JSON.stringify({
  status: 'pass',
  technicalStatus: 'pass',
  technicalChecksReady: true,
  mergeReady: false,
  ownerMergeAuthorized: false,
  technicalBlockingStatuses: [],
  technicalEvidenceRequiredStatuses: [],
  securityLifecycleStatus: { status: 'pass' },
  bestOfNEvidenceStatus: { status: 'pass' },
  safeSummaryOnly: true,
}, null, 2));
try {
  execFileSync('node', ['scripts/validate-quality-gate-safe-summary.mjs', '--input', validatorInput, '--technical-only'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
} finally {
  fs.rmSync(validatorInput, { force: true });
}

console.log('H3 v1.2.7 technical readiness self-test passed.');
