import { createHash } from "node:crypto";
import { z } from "zod";
import type { YouTubeCanaryAuthorizationEvaluation } from "./youtube-live-chat-canary-authorization-gate.js";
import {
  YouTubeCanaryAuthorizationBlockerCodeSchema,
  canonicalizeYouTubeCanaryAuthorizationBlockers,
  hasCanonicalYouTubeCanaryAuthorizationBlockerOrder
} from "./youtube-live-chat-canary-authorization-blockers.js";

const invalidAuthorizationBlockers = new Set([
  "authorization_bundle_schema_invalid",
  "transport_contract_invalid",
  "first_canary_limit_invalid",
  "side_effect_contract_invalid",
  "execution_flag_must_remain_false",
  "unsafe_authorization_value_forbidden"
]);

const YouTubeCanaryAuthorizationAuditReceiptBaseSchema = z.object({
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
  blocker_codes: z.array(YouTubeCanaryAuthorizationBlockerCodeSchema),
  safe_receipt_hash: z.string().regex(/^safe_receipt_[0-9a-f]{16}$/)
}).strict();

export const YouTubeCanaryAuthorizationAuditReceiptSchema = YouTubeCanaryAuthorizationAuditReceiptBaseSchema.superRefine((receipt, ctx) => {
  if (receipt.input_trust === "committed_safe_bundle" && (receipt.evaluation_mode !== "committed_safe_bundle_evaluation" || receipt.preview_only !== false)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["input_trust"], message: "committed_receipt_requires_committed_mode" });
  }
  if (receipt.input_trust === "untrusted_preview" && (receipt.evaluation_mode !== "untrusted_preview_evaluation" || receipt.preview_only !== true)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["input_trust"], message: "preview_receipt_requires_preview_mode" });
  }
  if (receipt.authorization_status === "authorization_fields_complete" && (receipt.preflight_status !== "authorization_fields_complete_network_disabled" || receipt.blocker_codes.length !== 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["authorization_status"], message: "complete_authorization_requires_no_blockers" });
  }
  if (receipt.authorization_status === "awaiting_owner_authorization" && (receipt.preflight_status !== "blocked" || receipt.blocker_codes.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["authorization_status"], message: "awaiting_authorization_requires_blockers" });
  }
  if (
    receipt.authorization_status === "invalid_authorization_bundle" &&
    (receipt.preflight_status !== "blocked" || !receipt.blocker_codes.some((code) => invalidAuthorizationBlockers.has(code)))
  ) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["authorization_status"], message: "invalid_authorization_requires_invalid_blocker" });
  }
});

export type YouTubeCanaryAuthorizationAuditReceipt = z.infer<typeof YouTubeCanaryAuthorizationAuditReceiptSchema>;

export type YouTubeCanaryAuthorizationAuditReceiptInput = Omit<YouTubeCanaryAuthorizationAuditReceipt, "safe_receipt_hash">;

export type YouTubeCanaryAuthorizationAuditReceiptIntegrityReasonCode =
  | "audit_receipt_schema_invalid"
  | "audit_receipt_semantics_invalid"
  | "audit_receipt_hash_invalid"
  | "audit_receipt_blocker_order_invalid"
  | "audit_receipt_blocker_duplicate";

export type YouTubeCanaryAuthorizationAuditReceiptIntegrity =
  | {
      integrity_status: "pass";
      receipt: YouTubeCanaryAuthorizationAuditReceipt;
      safe_reason_codes: [];
    }
  | {
      integrity_status: "fail";
      safe_reason_codes: YouTubeCanaryAuthorizationAuditReceiptIntegrityReasonCode[];
    };

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
    blocker_codes: canonicalizeYouTubeCanaryAuthorizationBlockers(evaluation.blocker_codes)
  };
  return {
    ...receiptInput,
    safe_receipt_hash: safeReceiptHash(receiptInput)
  };
}

export function safeReceiptHash(receipt: YouTubeCanaryAuthorizationAuditReceiptInput): string {
  return `safe_receipt_${createHash("sha256").update(stableStringify(receipt)).digest("hex").slice(0, 16)}`;
}

export function verifyYouTubeCanaryAuthorizationAuditReceipt(input: unknown): YouTubeCanaryAuthorizationAuditReceiptIntegrity {
  const baseParsed = YouTubeCanaryAuthorizationAuditReceiptBaseSchema.safeParse(input);
  if (!baseParsed.success) return fail(["audit_receipt_schema_invalid"]);

  const semanticParsed = YouTubeCanaryAuthorizationAuditReceiptSchema.safeParse(input);
  if (!semanticParsed.success) return fail(["audit_receipt_semantics_invalid"]);

  const receipt = semanticParsed.data;
  if (new Set(receipt.blocker_codes).size !== receipt.blocker_codes.length) {
    return fail(["audit_receipt_blocker_duplicate"]);
  }
  if (!hasCanonicalYouTubeCanaryAuthorizationBlockerOrder(receipt.blocker_codes)) {
    return fail(["audit_receipt_blocker_order_invalid"]);
  }

  const { safe_receipt_hash: _safeReceiptHash, ...receiptWithoutHash } = receipt;
  if (safeReceiptHash(receiptWithoutHash) !== receipt.safe_receipt_hash) {
    return fail(["audit_receipt_hash_invalid"]);
  }

  return {
    integrity_status: "pass",
    receipt,
    safe_reason_codes: []
  };
}

function fail(safeReasonCodes: YouTubeCanaryAuthorizationAuditReceiptIntegrityReasonCode[]): YouTubeCanaryAuthorizationAuditReceiptIntegrity {
  return {
    integrity_status: "fail",
    safe_reason_codes: [...new Set(safeReasonCodes)]
  };
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
