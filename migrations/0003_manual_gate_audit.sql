-- CODEX_QUALITY_HARNESS_FILE v1.1.3
-- Persistent manual gate and provider deployment audit schema draft.
-- This migration is a design boundary only; production DB application is gated
-- by a future approved manual gate and deployment job.

CREATE TABLE IF NOT EXISTS manual_gates (
  id text PRIMARY KEY,
  gate_type text NOT NULL CHECK (gate_type IN (
    'youtube_live_soak',
    'dashboard_apply',
    'external_alert_apply',
    'provider_secret_rotation',
    'provider_specific_deployment_apply',
    'production_rpc_enable',
    'iris_core_delivery_enable',
    'overlay_token_rotation_apply'
  )),
  status text NOT NULL CHECK (status IN ('not_requested', 'requested', 'approved', 'rejected', 'expired', 'used')),
  required_before text NOT NULL,
  target_environment text NOT NULL,
  target_commit_sha text NOT NULL CHECK (target_commit_sha ~ '^[0-9a-fA-F]{40}$'),
  requested_by text NOT NULL,
  approved_by_role text,
  approval_timestamp timestamptz,
  required_evidence jsonb NOT NULL,
  rollback_plan_ref text NOT NULL,
  operator_runbook_ref text NOT NULL,
  secret_source_ref text NOT NULL CHECK (
    secret_source_ref !~ '(Bearer\\s+|https?://|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40})'
  ),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((status = 'used' AND used_at IS NOT NULL) OR (status <> 'used' AND used_at IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS manual_gates_used_once
  ON manual_gates (id)
  WHERE status = 'used';

CREATE TABLE IF NOT EXISTS manual_gate_audit_logs (
  id text PRIMARY KEY,
  gate_id text NOT NULL REFERENCES manual_gates(id),
  action text NOT NULL CHECK (action IN (
    'manual_gate.requested',
    'manual_gate.approved',
    'manual_gate.rejected',
    'manual_gate.expired',
    'manual_gate.used'
  )),
  actor_type text NOT NULL CHECK (actor_type IN ('operator', 'system', 'codex')),
  actor_id text,
  target_environment text NOT NULL,
  target_commit_sha text NOT NULL CHECK (target_commit_sha ~ '^[0-9a-fA-F]{40}$'),
  safe_summary jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_deployment_jobs (
  id text PRIMARY KEY,
  operation text NOT NULL CHECK (operation IN (
    'youtube_live_soak',
    'dashboard_apply',
    'external_alert_apply',
    'provider_secret_rotation',
    'provider_specific_deployment_apply',
    'production_rpc_enable',
    'iris_core_delivery_enable',
    'overlay_token_rotation_apply'
  )),
  status text NOT NULL CHECK (status IN ('planned', 'running', 'applied', 'failed', 'rolled_back', 'cancelled')),
  target text NOT NULL,
  target_environment text NOT NULL,
  target_commit_sha text NOT NULL CHECK (target_commit_sha ~ '^[0-9a-fA-F]{40}$'),
  manual_gate_id text REFERENCES manual_gates(id),
  rollback_plan_ref text NOT NULL,
  operator_runbook_ref text NOT NULL,
  safe_summary jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_deployment_audit_logs (
  id text PRIMARY KEY,
  job_id text NOT NULL REFERENCES provider_deployment_jobs(id),
  operation text NOT NULL,
  action text NOT NULL CHECK (action IN (
    'provider_deployment.apply.planned',
    'provider_deployment.apply.executed',
    'provider_deployment.apply.failed',
    'provider_deployment.rollback.planned',
    'provider_deployment.rollback.executed'
  )),
  target text NOT NULL,
  safe_summary jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
