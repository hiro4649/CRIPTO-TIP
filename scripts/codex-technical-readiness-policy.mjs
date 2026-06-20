#!/usr/bin/env node
// CODEX_QUALITY_HARNESS_FILE v1.2.7

const TECHNICAL_BLOCKER_REASONS = new Set([
  'secret_leak',
  'unsafe_value_detected',
  'unsafe_output',
  'dangerous_api_pattern_detected',
  'required_check_failure',
  'test_failure',
  'typecheck_failure',
  'contract_failure',
  'workflow_failure',
  'required_artifact_missing',
  'artifact_hard_budget_exceeded',
  'artifact_duplicate_ambiguity',
  'security_oracle_invalid',
  'profile_downgrade',
  'missing_required_security_profile_section',
  'stale_head',
  'head_mismatch',
]);

const TECHNICAL_EVIDENCE_REASONS = new Set([
  'missing_negative_path_evidence',
  'missing_required_security_oracle_coverage',
  'missing_required_test_evidence',
  'missing_current_head_evidence',
  'security_oracle_missing_for_security_sensitive_change',
]);

const OWNER_REVIEW_REASONS = new Set([
  'owner_approval_not_recorded',
  'github_approval_review_not_recorded',
  'merge_authority_not_recorded',
  'release_authority_not_recorded',
  'missing_human_confirmation',
  'human_confirmation_incomplete',
  'owner_merge_instruction',
]);

const ADVISORY_REASONS = new Set([
  'artifact_budget_exceeded',
  'artifact_soft_budget_exceeded',
  'compatible_profile_escalation',
  'profile_escalation_accepted',
  'full_verification_required_and_completed',
  'task_mode_not_bugfix',
  'pr_profile_repair_hint_available',
  'pr_profile_conflict',
  'import_smoke_config_absent',
  'runtime_risk_register_absent',
  'fast_path_full_verification_required',
  'safe_artifact_index',
  'safe_artifact_index_status',
  'required_heading_hint',
  'required_heading_hint_status',
  'required_heading_hint_available',
  'required_heading_near_miss',
  'ai_review_disclaimer',
  'product_evidence_explained',
  'fast_path_denied_full_verification_used',
]);

const OPTIONAL_REASONS = new Set([
  'not_applicable',
  'not_required',
  'safe_artifact_index_not_requested',
]);

function normalizeReasonCode(value = '') {
  return String(value || '')
    .replace(/\.(failed|manual|warning|manual_confirmation_required)$/i, '')
    .replace(/Status$/i, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export function classifyReasonCode(reasonCode = '') {
  const normalized = normalizeReasonCode(reasonCode);
  if (!normalized) return 'technical_evidence_required';
  if (TECHNICAL_BLOCKER_REASONS.has(normalized)) return 'technical_blocker';
  if (TECHNICAL_EVIDENCE_REASONS.has(normalized)) return 'technical_evidence_required';
  if (OWNER_REVIEW_REASONS.has(normalized)) return 'owner_review_required';
  if (ADVISORY_REASONS.has(normalized)) return 'advisory';
  if (OPTIONAL_REASONS.has(normalized)) return 'optional';
  if (/_failed$|fail|failure|unsafe|secret|dangerous|stale|mismatch|missing|required/.test(normalized)) {
    return 'technical_evidence_required';
  }
  return 'technical_evidence_required';
}

function reasonFromStatus(status = {}) {
  return status.reasonCode || status.reasonCodes?.[0] || status.key || status.id || status.gate || '';
}

export function classifyGateStatus(status = {}) {
  const value = String(status?.effectiveStatus || status?.status || '').toLowerCase();
  if (!value) return classifyReasonCode(reasonFromStatus(status));
  if (value === 'pass' || value === 'pass_optional' || value === 'not_applicable' || value === 'not_required') return 'optional';
  if (value === 'fail' || value === 'missing' || value === 'not_run') return 'technical_blocker';
  if (value === 'manual_confirmation_required' || value === 'warning') {
    return classifyReasonCode(reasonFromStatus(status));
  }
  return 'technical_evidence_required';
}

function collectStatuses(report = {}, names = []) {
  const values = [];
  for (const name of names) {
    const source = report[name];
    if (!source) continue;
    values.push({ key: name, status: source.status, reasonCodes: source.reasonCodes || [], gate: name });
  }
  return values;
}

export function buildTechnicalReadinessState(report = {}, outcome = {}) {
  const score = report.targetQualityScoreStatus || report.qualityScoreStatus || {};
  const reasonSummary = report.reasonSummaryStatus?.summary || report.reasonSummary || {};
  const scoreStatuses = [
    ...(Array.isArray(score.blockingStatuses) ? score.blockingStatuses : []),
    ...(Array.isArray(score.manualStatuses) ? score.manualStatuses : []),
  ];
  const hasScoreSource = Boolean(score && typeof score === 'object' && score.status);
  const reasonSummaryStatuses = hasScoreSource ? [] : [
    ...(Array.isArray(reasonSummary.blockingReasons) ? reasonSummary.blockingReasons : []),
    ...(Array.isArray(reasonSummary.manualReasons) ? reasonSummary.manualReasons : []),
  ];
  const candidates = [
    ...scoreStatuses,
    ...reasonSummaryStatuses,
    ...collectStatuses(report, [
      'safeArtifactValidation',
      'safeArtifactValidationStatus',
      'securityLifecycleStatus',
      'bestOfNEvidenceStatus',
      'testCoverageEvidenceStatus',
      'prProfileStatus',
      'requiredHeadingHintStatus',
      'taskModeStatus',
    ]),
    ...(Array.isArray(outcome.failures) ? outcome.failures : []),
    ...(Array.isArray(outcome.warnings) ? outcome.warnings : []),
  ];

  const technicalBlockingStatuses = [];
  const technicalEvidenceRequiredStatuses = [];
  const ownerReviewReasons = [];
  const advisoryStatuses = [];
  const optionalStatuses = [];

  for (const item of candidates) {
    const classification = classifyGateStatus(item);
    const entry = {
      gate: item.gate || item.key || 'unknown',
      status: item.effectiveStatus || item.status || 'unknown',
      reasonCode: item.reasonCode || item.reasonCodes?.[0] || item.id || item.message || item.key || 'unknown_reason',
      classification,
      safeSummaryOnly: true,
    };
    if (classification === 'technical_blocker') technicalBlockingStatuses.push(entry);
    else if (classification === 'technical_evidence_required') technicalEvidenceRequiredStatuses.push(entry);
    else if (classification === 'owner_review_required') ownerReviewReasons.push(entry);
    else if (classification === 'advisory') advisoryStatuses.push(entry);
    else optionalStatuses.push(entry);
  }

  const technicalStatus = technicalBlockingStatuses.length || technicalEvidenceRequiredStatuses.length ? 'fail' : 'pass';
  const ownerReviewRequired = ownerReviewReasons.length > 0 || report.humanReviewRequired === true;
  return {
    status: technicalStatus,
    technicalStatus,
    technicalChecksReady: technicalStatus === 'pass',
    technicalBlockingStatuses,
    technicalEvidenceRequiredStatuses,
    ownerReviewRequired,
    ownerReviewReasons,
    advisoryStatuses,
    optionalStatuses,
    reviewStatus: ownerReviewRequired ? 'owner_review_required' : 'not_required',
    ownerMergeAuthorized: report.ownerMergeAuthorized === true || report.finalDecision?.mergeAllowed === true,
    mergeReady: technicalStatus === 'pass' && (report.ownerMergeAuthorized === true || report.finalDecision?.mergeAllowed === true),
    safeSummaryOnly: true,
  };
}
