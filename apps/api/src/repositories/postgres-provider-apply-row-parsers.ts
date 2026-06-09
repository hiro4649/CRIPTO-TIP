import { manualGateTypes, type ManualGateType } from "../manual-gates.js";
import { unsafePostgresTransactionPattern } from "../provider-apply-postgres-transaction.js";

export const providerJobStatuses = [
  "planned",
  "running",
  "applied",
  "failed",
  "rollback_planned",
  "rolled_back",
  "cancelled"
] as const;

export type ProviderJobStatus = typeof providerJobStatuses[number];

export const manualGatePersistentStatuses = [
  "not_requested",
  "requested",
  "approved",
  "rejected",
  "expired",
  "used"
] as const;

export type ManualGatePersistentStatus = typeof manualGatePersistentStatuses[number];

export type ManualGateRow = {
  id: string;
  gate_type: ManualGateType;
  status: ManualGatePersistentStatus;
  target_environment: string;
  target_commit_sha: string;
  expires_at: string;
  used_at?: string | null | undefined;
};

export type ProviderJobRow = {
  id: string;
  operation: ManualGateType;
  status: ProviderJobStatus;
  manual_gate_id: string;
  target_environment: string;
  target_commit_sha: string;
  external_provider_apply_started: boolean;
  manual_gate_mark_used_attempted: boolean;
  manual_gate_mark_used_succeeded: boolean;
  compensation_required: boolean;
  rollback_plan_ref: string;
  operator_runbook_ref: string;
};

const manualGateRowKeys = [
  "id",
  "gate_type",
  "status",
  "target_environment",
  "target_commit_sha",
  "expires_at",
  "used_at"
] as const;

const providerJobRowKeys = [
  "id",
  "operation",
  "status",
  "manual_gate_id",
  "target_environment",
  "target_commit_sha",
  "external_provider_apply_started",
  "manual_gate_mark_used_attempted",
  "manual_gate_mark_used_succeeded",
  "compensation_required",
  "rollback_plan_ref",
  "operator_runbook_ref"
] as const;

const isoUtcDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export function parseManualGateRow(row: Record<string, unknown>): ManualGateRow {
  assertExactRowKeys(row, manualGateRowKeys, "manual gate");
  assertNoUnsafeRowShape(row);
  return {
    id: requiredSafeString(row, "id"),
    gate_type: requiredManualGateType(row, "gate_type"),
    status: requiredManualGateStatus(row, "status"),
    target_environment: requiredSafeString(row, "target_environment"),
    target_commit_sha: requiredCommitSha(row, "target_commit_sha"),
    expires_at: requiredIsoDateTime(row, "expires_at"),
    used_at: optionalIsoDateTime(row, "used_at")
  };
}

export function parseProviderJobRow(row: Record<string, unknown>): ProviderJobRow {
  assertExactRowKeys(row, providerJobRowKeys, "provider job");
  assertNoUnsafeRowShape(row);
  const parsed: ProviderJobRow = {
    id: requiredSafeString(row, "id"),
    operation: requiredManualGateType(row, "operation"),
    status: requiredProviderJobStatus(row, "status"),
    manual_gate_id: requiredSafeString(row, "manual_gate_id"),
    target_environment: requiredSafeString(row, "target_environment"),
    target_commit_sha: requiredCommitSha(row, "target_commit_sha"),
    external_provider_apply_started: requiredBoolean(row, "external_provider_apply_started"),
    manual_gate_mark_used_attempted: requiredBoolean(row, "manual_gate_mark_used_attempted"),
    manual_gate_mark_used_succeeded: requiredBoolean(row, "manual_gate_mark_used_succeeded"),
    compensation_required: requiredBoolean(row, "compensation_required"),
    rollback_plan_ref: requiredSafeString(row, "rollback_plan_ref"),
    operator_runbook_ref: requiredSafeString(row, "operator_runbook_ref")
  };

  if (parsed.status === "applied" && (
    !parsed.external_provider_apply_started ||
    !parsed.manual_gate_mark_used_attempted ||
    !parsed.manual_gate_mark_used_succeeded ||
    parsed.compensation_required
  )) {
    throw new Error("provider job applied invariant is invalid");
  }

  if (parsed.compensation_required && (
    parsed.status !== "failed" ||
    !parsed.external_provider_apply_started ||
    !parsed.manual_gate_mark_used_attempted ||
    parsed.manual_gate_mark_used_succeeded
  )) {
    throw new Error("provider job compensation invariant is invalid");
  }

  return parsed;
}

function requiredSafeString(row: Record<string, unknown>, field: string) {
  const value = row[field];
  if (typeof value !== "string" || value.length === 0) throw new Error(`${field} is required`);
  if (unsafePostgresTransactionPattern().test(value)) throw new Error(`${field} contains unsafe value`);
  return value;
}

function requiredCommitSha(row: Record<string, unknown>, field: string) {
  const value = requiredSafeString(row, field);
  if (!/^[0-9a-f]{40}$/i.test(value)) throw new Error(`${field} must be a 40 character hex SHA`);
  return value;
}

function requiredIsoDateTime(row: Record<string, unknown>, field: string) {
  const value = requiredSafeString(row, field);
  if (!isoUtcDateTimePattern.test(value)) throw new Error(`${field} must be an ISO UTC datetime`);
  if (Number.isNaN(new Date(value).getTime())) throw new Error(`${field} must be an ISO datetime`);
  return value;
}

function optionalIsoDateTime(row: Record<string, unknown>, field: string) {
  const value = row[field];
  if (value === null || value === undefined) return value as null | undefined;
  if (typeof value !== "string") throw new Error(`${field} must be an ISO datetime or null`);
  if (unsafePostgresTransactionPattern().test(value)) throw new Error(`${field} contains unsafe value`);
  if (!isoUtcDateTimePattern.test(value)) throw new Error(`${field} must be an ISO UTC datetime`);
  if (Number.isNaN(new Date(value).getTime())) throw new Error(`${field} must be an ISO datetime`);
  return value;
}

function requiredManualGateType(row: Record<string, unknown>, field: string) {
  const value = requiredSafeString(row, field);
  if (!manualGateTypes.includes(value as ManualGateType)) throw new Error(`${field} is invalid`);
  return value as ManualGateType;
}

function requiredManualGateStatus(row: Record<string, unknown>, field: string) {
  const value = requiredSafeString(row, field);
  if (!manualGatePersistentStatuses.includes(value as ManualGatePersistentStatus)) throw new Error(`${field} is invalid`);
  return value as ManualGatePersistentStatus;
}

function requiredProviderJobStatus(row: Record<string, unknown>, field: string) {
  const value = requiredSafeString(row, field);
  if (!providerJobStatuses.includes(value as ProviderJobStatus)) throw new Error(`${field} is invalid`);
  return value as ProviderJobStatus;
}

function requiredBoolean(row: Record<string, unknown>, field: string) {
  const value = row[field];
  if (typeof value !== "boolean") throw new Error(`${field} must be boolean`);
  return value;
}

function assertExactRowKeys(row: Record<string, unknown>, allowedKeys: readonly string[], label: string) {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(row)) {
    if (!allowed.has(key)) throw new Error(`typed_row_parser_rejected:${label}:${key} is not allowed in postgres adapter row`);
  }
}

function assertNoUnsafeRowShape(row: Record<string, unknown>) {
  for (const [key, value] of Object.entries(row)) {
    if (/raw[_-]?provider[_-]?response|provider[_-]?response|raw[_-]?message|display[_-]?name|youtube[_-]?author[_-]?id|stdout|stderr|stack[_-]?trace/i.test(key)) {
      throw new Error(`typed_row_parser_rejected:${key} is not allowed in postgres adapter row`);
    }
    if (typeof value === "string" && unsafePostgresTransactionPattern().test(value)) {
      throw new Error(`typed_row_parser_rejected:${key} contains unsafe value`);
    }
  }
}
