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
