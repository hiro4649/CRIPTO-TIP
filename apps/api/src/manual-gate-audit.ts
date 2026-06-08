import type { ManualGateType } from "./manual-gates.js";

export const manualGateAuditActions = [
  "manual_gate.requested",
  "manual_gate.approved",
  "manual_gate.rejected",
  "manual_gate.expired",
  "manual_gate.used"
] as const;

export type ManualGateAuditAction = typeof manualGateAuditActions[number];

export type SafeAuditPrimitive = string | number | boolean | null;
export type SafeAuditSummary = Record<string, SafeAuditPrimitive>;

export type SafeAuditRecord = {
  id: string;
  action: string;
  target_environment: string;
  target_commit_sha: string;
  safe_summary: SafeAuditSummary;
  created_at: string;
  actor_type: "operator" | "system" | "codex";
  actor_id?: string | undefined;
};

export type ManualGateAuditRecord = SafeAuditRecord & {
  gate_id: string;
  gate_type: ManualGateType;
  action: ManualGateAuditAction;
};

export function createManualGateAuditRecord(record: ManualGateAuditRecord): ManualGateAuditRecord {
  assertManualGateAuditRecord(record);
  return {
    id: record.id,
    gate_id: record.gate_id,
    gate_type: record.gate_type,
    action: record.action,
    actor_type: record.actor_type,
    ...(record.actor_id ? { actor_id: sanitizeAuditText(record.actor_id) } : {}),
    target_environment: sanitizeAuditText(record.target_environment),
    target_commit_sha: record.target_commit_sha,
    safe_summary: sanitizeSafeAuditSummary(record.safe_summary),
    created_at: record.created_at
  };
}

export function assertManualGateAuditRecord(record: ManualGateAuditRecord) {
  if (!manualGateAuditActions.includes(record.action)) throw new Error("manual gate audit action is invalid");
  if (!record.id) throw new Error("manual gate audit id is required");
  if (!record.gate_id) throw new Error("manual gate audit gate_id is required");
  if (!/^[0-9a-f]{40}$/i.test(record.target_commit_sha)) throw new Error("manual gate audit target_commit_sha is required");
  assertSafeAuditRecord(record);
}

export function assertSafeAuditRecord(record: SafeAuditRecord) {
  const serialized = JSON.stringify(record);
  if (unsafeAuditPattern().test(serialized)) throw new Error("audit record contains unsafe value");
  for (const key of Object.keys(record.safe_summary)) {
    if (unsafeAuditKeyPattern().test(key)) throw new Error("audit safe_summary contains unsafe key");
  }
}

export function sanitizeSafeAuditSummary(summary: SafeAuditSummary): SafeAuditSummary {
  return Object.fromEntries(
    Object.entries(summary)
      .filter(([key, value]) => !unsafeAuditKeyPattern().test(key) && !unsafeAuditPattern().test(String(value)))
      .map(([key, value]) => [sanitizeAuditText(key).slice(0, 64), sanitizeAuditPrimitive(value)])
  );
}

export function sanitizeAuditText(value: unknown) {
  return String(value).replace(/[\r\n]/g, " ").slice(0, 160);
}

function sanitizeAuditPrimitive(value: SafeAuditPrimitive): SafeAuditPrimitive {
  if (typeof value === "string") return sanitizeAuditText(value);
  return value;
}

export function unsafeAuditPattern() {
  return /Bearer\s+|https?:\/\/|ghp_|sk-|xoxb-|AKIA|0x[0-9a-fA-F]{40}|webhook|api[_-]?key|oauth|secret|token|private|raw[_-]?message|raw[_-]?payload|raw[_-]?provider|display[_-]?name|youtube[_-]?(author|id)/i;
}

function unsafeAuditKeyPattern() {
  return /secret|credential|webhook|token|oauth|api[_-]?key|private|wallet|raw|payload|message|display[_-]?name|youtube/i;
}
