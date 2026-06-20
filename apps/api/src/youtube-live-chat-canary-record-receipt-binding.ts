import {
  YouTubeCanaryAuthorizationBundleSchema,
  evaluateYouTubeCanaryAuthorization,
  safeCanonicalAuthorizationHash
} from "./youtube-live-chat-canary-authorization-gate.js";
import {
  evaluateYouTubeCanaryAuthorizationRecord,
  YouTubeCanaryAuthorizationRecordSchema
} from "./youtube-live-chat-canary-authorization-record.js";
import {
  verifyYouTubeCanaryAuthorizationAuditReceipt,
  type YouTubeCanaryAuthorizationAuditReceipt
} from "./youtube-live-chat-canary-audit-receipt.js";
import { z } from "zod";

export const YouTubeCanaryAuthorizationRecordBindingReasonCodeSchema = z.enum([
  "authorization_bundle_schema_invalid",
  "audit_receipt_schema_invalid",
  "audit_receipt_semantics_invalid",
  "audit_receipt_hash_invalid",
  "audit_receipt_blocker_order_invalid",
  "audit_receipt_blocker_duplicate",
  "authorization_record_schema_invalid",
  "receipt_bundle_hash_mismatch",
  "record_bundle_hash_mismatch",
  "record_receipt_hash_mismatch",
  "audit_receipt_not_derived_from_bundle",
  "record_created_before_receipt",
  "untrusted_preview_not_record_authority",
  "committed_bundle_incomplete",
  "authorization_record_draft",
  "authorization_record_revoked",
  "authorization_record_expired",
  "authorization_record_bound_non_executable"
]);

export type YouTubeCanaryAuthorizationRecordBindingReasonCode = z.infer<
  typeof YouTubeCanaryAuthorizationRecordBindingReasonCodeSchema
>;

export type YouTubeCanaryAuthorizationRecordBindingStatus =
  | "invalid"
  | "receipt_integrity_failed"
  | "bundle_integrity_failed"
  | "hash_binding_failed"
  | "preview_bound_non_authoritative"
  | "committed_bundle_incomplete"
  | "record_draft"
  | "record_revoked"
  | "record_expired"
  | "bound_non_executable";

export type YouTubeCanaryAuthorizationRecordBindingEvaluation = {
  binding_status: YouTubeCanaryAuthorizationRecordBindingStatus;
  record_effective_status: "invalid" | "draft" | "recorded_non_executable" | "revoked" | "expired";
  receipt_integrity_status: "pass" | "fail";
  bundle_integrity_status: "pass" | "fail";
  hash_binding_status: "pass" | "fail";
  trust_status: "committed_safe_bundle" | "untrusted_preview" | "invalid";
  authority_status: "non_authoritative";
  execution_status: "forbidden";
  network_enabled: false;
  oauth_configured: false;
  secret_accessed: false;
  real_api_execution: false;
  record_persisted: false;
  receipt_persisted: false;
  persistence_status: "not_implemented";
  safe_reason_codes: YouTubeCanaryAuthorizationRecordBindingReasonCode[];
};

export type YouTubeCanaryAuthorizationRecordBindingInput = {
  record: unknown;
  auditReceipt: unknown;
  authorizationBundle: unknown;
  now?: Date;
};

export function evaluateYouTubeCanaryAuthorizationRecordBinding(
  input: YouTubeCanaryAuthorizationRecordBindingInput
): YouTubeCanaryAuthorizationRecordBindingEvaluation {
  const now = input.now ?? new Date();

  const receiptIntegrity = verifyYouTubeCanaryAuthorizationAuditReceipt(input.auditReceipt);
  const bundleParsed = YouTubeCanaryAuthorizationBundleSchema.safeParse(input.authorizationBundle);
  if (!bundleParsed.success) {
    return buildBinding("bundle_integrity_failed", {
      recordEffectiveStatus: "invalid",
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "fail",
      hashBindingStatus: "fail",
      trustStatus: receiptIntegrity.integrity_status === "pass" ? receiptIntegrity.receipt.input_trust : "invalid",
      safeReasonCodes: ["authorization_bundle_schema_invalid"]
    });
  }
  if (receiptIntegrity.integrity_status === "fail") {
    return buildBinding("receipt_integrity_failed", {
      recordEffectiveStatus: "invalid",
      receiptIntegrityStatus: "fail",
      bundleIntegrityStatus: "pass",
      hashBindingStatus: "fail",
      trustStatus: "invalid",
      safeReasonCodes: receiptIntegrity.safe_reason_codes
    });
  }
  const recordParsed = YouTubeCanaryAuthorizationRecordSchema.safeParse(input.record);
  if (!recordParsed.success) {
    return buildBinding("invalid", {
      recordEffectiveStatus: "invalid",
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "pass",
      hashBindingStatus: "fail",
      trustStatus: receiptIntegrity.receipt.input_trust,
      safeReasonCodes: ["authorization_record_schema_invalid"]
    });
  }

  const record = recordParsed.data;
  const receipt = receiptIntegrity.receipt;
  const computedBundleHash = safeCanonicalAuthorizationHash(bundleParsed.data);
  const expectedEvaluation = evaluateYouTubeCanaryAuthorization(bundleParsed.data, {
    inputTrust: receipt.input_trust,
    now: new Date(receipt.evaluated_at)
  });

  const expectedReceipt = expectedEvaluation.audit_receipt;
  const hashOrReceiptMismatch: YouTubeCanaryAuthorizationRecordBindingReasonCode[] = [];
  if (receipt.safe_bundle_hash !== computedBundleHash) hashOrReceiptMismatch.push("receipt_bundle_hash_mismatch");
  if (record.authorization_bundle_hash !== computedBundleHash) hashOrReceiptMismatch.push("record_bundle_hash_mismatch");
  if (record.audit_receipt_hash !== receipt.safe_receipt_hash) hashOrReceiptMismatch.push("record_receipt_hash_mismatch");
  if (!isSameYouTubeCanaryAuthorizationAuditReceipt(receipt, expectedReceipt)) {
    hashOrReceiptMismatch.push("audit_receipt_not_derived_from_bundle");
  }

  if (hashOrReceiptMismatch.length) {
    return buildBinding("hash_binding_failed", {
      recordEffectiveStatus: "invalid",
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "pass",
      hashBindingStatus: "fail",
      trustStatus: receipt.input_trust,
      safeReasonCodes: hashOrReceiptMismatch
    });
  }

  const recordCreatedAt = Date.parse(record.created_at);
  const receiptEvaluatedAt = Date.parse(receipt.evaluated_at);
  if (!Number.isFinite(recordCreatedAt) || !Number.isFinite(receiptEvaluatedAt) || recordCreatedAt < receiptEvaluatedAt) {
    return buildBinding("invalid", {
      recordEffectiveStatus: "invalid",
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "pass",
      hashBindingStatus: "pass",
      trustStatus: receipt.input_trust,
      safeReasonCodes: ["record_created_before_receipt"]
    });
  }

  const recordEvaluation = evaluateYouTubeCanaryAuthorizationRecord(record, now);

  if (receipt.input_trust === "untrusted_preview") {
    return buildBinding("preview_bound_non_authoritative", {
      recordEffectiveStatus: recordEvaluation.effective_record_status,
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "pass",
      hashBindingStatus: "pass",
      trustStatus: "untrusted_preview",
      safeReasonCodes: ["untrusted_preview_not_record_authority"]
    });
  }

  if (receipt.authorization_status !== "authorization_fields_complete") {
    return buildBinding("committed_bundle_incomplete", {
      recordEffectiveStatus: recordEvaluation.effective_record_status,
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "pass",
      hashBindingStatus: "pass",
      trustStatus: "committed_safe_bundle",
      safeReasonCodes: ["committed_bundle_incomplete"]
    });
  }

  if (recordEvaluation.effective_record_status === "draft") {
    return buildBinding("record_draft", {
      recordEffectiveStatus: "draft",
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "pass",
      hashBindingStatus: "pass",
      trustStatus: "committed_safe_bundle",
      safeReasonCodes: toBindingReasonCodes(recordEvaluation.safe_reason_codes)
    });
  }
  if (recordEvaluation.effective_record_status === "revoked") {
    return buildBinding("record_revoked", {
      recordEffectiveStatus: "revoked",
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "pass",
      hashBindingStatus: "pass",
      trustStatus: "committed_safe_bundle",
      safeReasonCodes: toBindingReasonCodes(recordEvaluation.safe_reason_codes)
    });
  }
  if (recordEvaluation.effective_record_status === "expired") {
    return buildBinding("record_expired", {
      recordEffectiveStatus: "expired",
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "pass",
      hashBindingStatus: "pass",
      trustStatus: "committed_safe_bundle",
      safeReasonCodes: toBindingReasonCodes(recordEvaluation.safe_reason_codes)
    });
  }

  return buildBinding("bound_non_executable", {
    recordEffectiveStatus: "recorded_non_executable",
    receiptIntegrityStatus: "pass",
    bundleIntegrityStatus: "pass",
    hashBindingStatus: "pass",
    trustStatus: "committed_safe_bundle",
    safeReasonCodes: ["authorization_record_bound_non_executable"]
  });
}

export function isSameYouTubeCanaryAuthorizationAuditReceipt(
  left: YouTubeCanaryAuthorizationAuditReceipt,
  right: YouTubeCanaryAuthorizationAuditReceipt
): boolean {
  return (
    left.schema_version === right.schema_version &&
    left.receipt_kind === right.receipt_kind &&
    left.evaluation_mode === right.evaluation_mode &&
    left.input_trust === right.input_trust &&
    left.authorization_status === right.authorization_status &&
    left.preflight_status === right.preflight_status &&
    left.execution_status === right.execution_status &&
    left.preview_only === right.preview_only &&
    left.state_persisted === right.state_persisted &&
    left.receipt_persisted === right.receipt_persisted &&
    left.audit_retrievable === right.audit_retrievable &&
    left.network_enabled === right.network_enabled &&
    left.oauth_configured === right.oauth_configured &&
    left.secret_accessed === right.secret_accessed &&
    left.real_api_execution === right.real_api_execution &&
    left.safe_bundle_hash === right.safe_bundle_hash &&
    left.evaluated_at === right.evaluated_at &&
    sameStringArray(left.blocker_codes, right.blocker_codes) &&
    left.safe_receipt_hash === right.safe_receipt_hash
  );
}

function buildBinding(
  bindingStatus: YouTubeCanaryAuthorizationRecordBindingStatus,
  args: {
    recordEffectiveStatus: YouTubeCanaryAuthorizationRecordBindingEvaluation["record_effective_status"];
    receiptIntegrityStatus: "pass" | "fail";
    bundleIntegrityStatus: "pass" | "fail";
    hashBindingStatus: "pass" | "fail";
    trustStatus: YouTubeCanaryAuthorizationRecordBindingEvaluation["trust_status"];
    safeReasonCodes: YouTubeCanaryAuthorizationRecordBindingReasonCode[];
  }
): YouTubeCanaryAuthorizationRecordBindingEvaluation {
  return {
    binding_status: bindingStatus,
    record_effective_status: args.recordEffectiveStatus,
    receipt_integrity_status: args.receiptIntegrityStatus,
    bundle_integrity_status: args.bundleIntegrityStatus,
    hash_binding_status: args.hashBindingStatus,
    trust_status: args.trustStatus,
    authority_status: "non_authoritative",
    execution_status: "forbidden",
    network_enabled: false,
    oauth_configured: false,
    secret_accessed: false,
    real_api_execution: false,
    record_persisted: false,
    receipt_persisted: false,
    persistence_status: "not_implemented",
    safe_reason_codes: [...new Set(args.safeReasonCodes)]
  };
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function toBindingReasonCodes(values: readonly string[]): YouTubeCanaryAuthorizationRecordBindingReasonCode[] {
  return values.flatMap((value) => {
    if (value === "authorization_record_non_executable") return ["authorization_record_bound_non_executable"] as const;
    const parsed = YouTubeCanaryAuthorizationRecordBindingReasonCodeSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
}
