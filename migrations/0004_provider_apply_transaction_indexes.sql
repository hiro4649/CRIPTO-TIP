-- CODEX_QUALITY_HARNESS_FILE v1.1.4
-- Provider apply transaction index design boundary.
-- This migration is additive and does not connect to a production database.

CREATE UNIQUE INDEX IF NOT EXISTS provider_deployment_jobs_transaction_unique
  ON provider_deployment_jobs (id);

CREATE INDEX IF NOT EXISTS provider_deployment_jobs_manual_gate_id
  ON provider_deployment_jobs (manual_gate_id);

CREATE INDEX IF NOT EXISTS provider_deployment_jobs_status
  ON provider_deployment_jobs (status);

CREATE INDEX IF NOT EXISTS provider_deployment_jobs_target_commit
  ON provider_deployment_jobs (target_commit_sha);

CREATE UNIQUE INDEX IF NOT EXISTS provider_deployment_audit_logs_id_unique
  ON provider_deployment_audit_logs (id);

CREATE INDEX IF NOT EXISTS provider_deployment_audit_logs_job_id
  ON provider_deployment_audit_logs (job_id);

CREATE INDEX IF NOT EXISTS manual_gate_audit_logs_gate_id
  ON manual_gate_audit_logs (gate_id);

CREATE INDEX IF NOT EXISTS manual_gates_status_environment_commit
  ON manual_gates (status, target_environment, target_commit_sha);

ALTER TABLE provider_deployment_jobs
  ADD COLUMN IF NOT EXISTS external_provider_apply_started boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_gate_mark_used_attempted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_gate_mark_used_succeeded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compensation_required boolean NOT NULL DEFAULT false;

ALTER TABLE provider_deployment_jobs
  DROP CONSTRAINT IF EXISTS provider_deployment_jobs_status_check,
  ADD CONSTRAINT provider_deployment_jobs_status_check
  CHECK (status IN ('planned', 'running', 'applied', 'failed', 'rollback_planned', 'rolled_back', 'cancelled'));

ALTER TABLE provider_deployment_jobs
  DROP CONSTRAINT IF EXISTS provider_deployment_jobs_applied_consistency,
  ADD CONSTRAINT provider_deployment_jobs_applied_consistency
  CHECK (
    status <> 'applied'
    OR (
      external_provider_apply_started = true
      AND manual_gate_mark_used_attempted = true
      AND manual_gate_mark_used_succeeded = true
      AND compensation_required = false
    )
  );

ALTER TABLE provider_deployment_jobs
  DROP CONSTRAINT IF EXISTS provider_deployment_jobs_compensation_consistency,
  ADD CONSTRAINT provider_deployment_jobs_compensation_consistency
  CHECK (
    compensation_required = false
    OR (
      status = 'failed'
      AND external_provider_apply_started = true
      AND manual_gate_mark_used_attempted = true
      AND manual_gate_mark_used_succeeded = false
    )
  );

ALTER TABLE provider_deployment_audit_logs
  DROP CONSTRAINT IF EXISTS provider_deployment_audit_logs_action_check,
  ADD CONSTRAINT provider_deployment_audit_logs_action_check
  CHECK (action IN (
    'provider_deployment.apply.planned',
    'provider_deployment.apply.executed',
    'provider_deployment.apply.failed',
    'provider_deployment.rollback.planned',
    'provider_deployment.rollback.executed',
    'provider_deployment.job.planned',
    'provider_deployment.job.running',
    'provider_deployment.job.applied',
    'provider_deployment.job.failed',
    'provider_deployment.job.rollback_planned',
    'provider_deployment.job.rolled_back',
    'provider_deployment.job.cancelled',
    'provider_deployment.compensation.required',
    'provider_deployment.compensation.resolved',
    'provider_apply_transaction.draft_created',
    'provider_apply_transaction.provider_apply_started',
    'provider_apply_transaction.provider_apply_succeeded',
    'provider_apply_transaction.provider_apply_failed',
    'provider_apply_transaction.mark_gate_used_attempted',
    'provider_apply_transaction.mark_gate_used_succeeded',
    'provider_apply_transaction.mark_gate_used_failed',
    'provider_apply_transaction.audit_append_succeeded',
    'provider_apply_transaction.committed',
    'provider_apply_transaction.rolled_back',
    'provider_apply_transaction.compensation_required'
  ));

ALTER TABLE provider_deployment_jobs
  DROP CONSTRAINT IF EXISTS provider_deployment_jobs_safe_summary_object,
  ADD CONSTRAINT provider_deployment_jobs_safe_summary_object
  CHECK (jsonb_typeof(safe_summary) = 'object');

ALTER TABLE provider_deployment_audit_logs
  DROP CONSTRAINT IF EXISTS provider_deployment_audit_logs_safe_summary_object,
  ADD CONSTRAINT provider_deployment_audit_logs_safe_summary_object
  CHECK (jsonb_typeof(safe_summary) = 'object');

ALTER TABLE manual_gate_audit_logs
  DROP CONSTRAINT IF EXISTS manual_gate_audit_logs_safe_summary_object,
  ADD CONSTRAINT manual_gate_audit_logs_safe_summary_object
  CHECK (jsonb_typeof(safe_summary) = 'object');
