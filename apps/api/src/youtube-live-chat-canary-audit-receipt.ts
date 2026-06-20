import { createHash } from "node:crypto";
import { z } from "zod";
import type { YouTubeCanaryAuthorizationEvaluation } from "./youtube-live-chat-canary-authorization-gate.js";

export const YouTubeCanaryAuthorizationAuditReceiptSchema = z.object({
  schema_version: z.literal("1.0.0"),
  receipt_kind: z.literal("youtube_canary_authorization_evaluation"),
  evaluation_mode: z.enum(["committed_safe_bundle_evaluation", "untrusted_preview_evaluation"]),
  input_trust: z.enum(["committed_safe_bundle", "untrusted_preview"]),
  authorization_status: z.enum(["awaiting_owner_authorization", "authorization_fields_complete", "invalid_authorization_bundle"]),
  preflight_status: z.enum(["blocked", "authorization_fields_complete_network_disabled"]),
  execution_status: z.literal("forbidden"),
  preview_only: z.boolean(),
  state_persisted: z.literal(false),
  receipt_persisted: z.literal(false),
  audit_retrievable: z.literal(false),
  network_enabled: z.literal(false),
  oauth_configured: z.literal(false),
  secret_accessed: z.literal(false),
  real_api_execution: z.literal(false),
  safe_bundle_hash: z.string().regex(/^safe_hash_[0-9a-f]{16}$/),
  evaluated_at: z.string().datetime(),
  blocker_codes: z.array(z.string()),
  safe_receipt_hash: z.string().regex(/^safe_receipt_[0-9a-f]{16}$/)
}).strict();

export type YouTubeCanaryAuthorizationAuditReceipt = z.infer<typeof YouTubeCanaryAuthorizationAuditReceiptSchema>;

export type YouTubeCanaryAuthorizationAuditReceiptInput = Omit<YouTubeCanaryAuthorizationAuditReceipt, "safe_receipt_hash">;

export function buildYouTubeCanaryAuthorizationAuditReceipt(
  evaluation: Omit<YouTubeCanaryAuthorizationEvaluation, "audit_receipt">
): YouTubeCanaryAuthorizationAuditReceipt {
  const receiptInput: YouTubeCanaryAuthorizationAuditReceiptInput = {
    schema_version: "1.0.0",
    receipt_kind: "youtube_canary_authorization_evaluation",
    evaluation_mode: evaluation.input_trust === "committed_safe_bundle" ? "committed_safe_bundle_evaluation" : "untrusted_preview_evaluation",
    input_trust: evaluation.input_trust,
    authorization_status: evaluation.authorization_status,
    preflight_status: evaluation.preflight_status,
    execution_status: "forbidden",
    preview_only: evaluation.preview_only,
    state_persisted: false,
    receipt_persisted: false,
    audit_retrievable: false,
    network_enabled: false,
    oauth_configured: false,
    secret_accessed: false,
    real_api_execution: false,
    safe_bundle_hash: evaluation.safe_bundle_hash,
    evaluated_at: evaluation.evaluated_at,
    blocker_codes: [...evaluation.blocker_codes]
  };
  return {
    ...receiptInput,
    safe_receipt_hash: safeReceiptHash(receiptInput)
  };
}

export function safeReceiptHash(receipt: YouTubeCanaryAuthorizationAuditReceiptInput): string {
  return `safe_receipt_${createHash("sha256").update(stableStringify(receipt)).digest("hex").slice(0, 16)}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
