import {
  YouTubeCanaryAuthorizationBundleSchema,
  evaluateYouTubeCanaryAuthorization,
  safeCanonicalAuthorizationHash
} from "./youtube-live-chat-canary-authorization-gate.js";
import {
  evaluateYouTubeCanaryAuthorizationRecord,
  type YouTubeCanaryAuthorizationRecord
} from "./youtube-live-chat-canary-authorization-record.js";
import {
  verifyYouTubeCanaryAuthorizationAuditReceipt,
  type YouTubeCanaryAuthorizationAuditReceipt
} from "./youtube-live-chat-canary-audit-receipt.js";

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
  safe_reason_codes: string[];
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
  const recordEvaluation = evaluateYouTubeCanaryAuthorizationRecord(input.record, now);
  if (recordEvaluation.effective_record_status === "invalid") {
    return buildBinding("invalid", {
      recordEffectiveStatus: "invalid",
      receiptIntegrityStatus: "fail",
      bundleIntegrityStatus: "fail",
      hashBindingStatus: "fail",
      trustStatus: "invalid",
      safeReasonCodes: recordEvaluation.safe_reason_codes
    });
  }

  const receiptIntegrity = verifyYouTubeCanaryAuthorizationAuditReceipt(input.auditReceipt);
  if (receiptIntegrity.integrity_status === "fail") {
    return buildBinding("receipt_integrity_failed", {
      recordEffectiveStatus: recordEvaluation.effective_record_status,
      receiptIntegrityStatus: "fail",
      bundleIntegrityStatus: "fail",
      hashBindingStatus: "fail",
      trustStatus: "invalid",
      safeReasonCodes: receiptIntegrity.safe_reason_codes
    });
  }

  const bundleParsed = YouTubeCanaryAuthorizationBundleSchema.safeParse(input.authorizationBundle);
  if (!bundleParsed.success) {
    return buildBinding("bundle_integrity_failed", {
      recordEffectiveStatus: recordEvaluation.effective_record_status,
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "fail",
      hashBindingStatus: "fail",
      trustStatus: receiptIntegrity.receipt.input_trust,
      safeReasonCodes: ["authorization_bundle_schema_invalid"]
    });
  }

  const record = input.record as YouTubeCanaryAuthorizationRecord;
  const receipt = receiptIntegrity.receipt;
  const computedBundleHash = safeCanonicalAuthorizationHash(bundleParsed.data);
  const expectedEvaluation = evaluateYouTubeCanaryAuthorization(bundleParsed.data, {
    inputTrust: receipt.input_trust,
    now: new Date(receipt.evaluated_at)
  });

  const expectedReceipt = expectedEvaluation.audit_receipt;
  const hashOrReceiptMismatch =
    record.authorization_bundle_hash !== computedBundleHash ||
    record.audit_receipt_hash !== receipt.safe_receipt_hash ||
    receipt.safe_bundle_hash !== computedBundleHash ||
    receipt.safe_receipt_hash !== expectedReceipt.safe_receipt_hash ||
    receipt.authorization_status !== expectedReceipt.authorization_status ||
    receipt.preflight_status !== expectedReceipt.preflight_status ||
    receipt.input_trust !== expectedReceipt.input_trust ||
    receipt.preview_only !== expectedReceipt.preview_only ||
    !sameStringArray(receipt.blocker_codes, expectedReceipt.blocker_codes);

  if (hashOrReceiptMismatch) {
    return buildBinding("hash_binding_failed", {
      recordEffectiveStatus: recordEvaluation.effective_record_status,
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "pass",
      hashBindingStatus: "fail",
      trustStatus: receipt.input_trust,
      safeReasonCodes: ["record_receipt_hash_binding_failed"]
    });
  }

  if (receipt.input_trust === "untrusted_preview") {
    return buildBinding("preview_bound_non_authoritative", {
      recordEffectiveStatus: recordEvaluation.effective_record_status,
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "pass",
      hashBindingStatus: "pass",
      trustStatus: "untrusted_preview",
      safeReasonCodes: ["preview_receipt_non_authoritative"]
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
      safeReasonCodes: recordEvaluation.safe_reason_codes
    });
  }
  if (recordEvaluation.effective_record_status === "revoked") {
    return buildBinding("record_revoked", {
      recordEffectiveStatus: "revoked",
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "pass",
      hashBindingStatus: "pass",
      trustStatus: "committed_safe_bundle",
      safeReasonCodes: recordEvaluation.safe_reason_codes
    });
  }
  if (recordEvaluation.effective_record_status === "expired") {
    return buildBinding("record_expired", {
      recordEffectiveStatus: "expired",
      receiptIntegrityStatus: "pass",
      bundleIntegrityStatus: "pass",
      hashBindingStatus: "pass",
      trustStatus: "committed_safe_bundle",
      safeReasonCodes: recordEvaluation.safe_reason_codes
    });
  }

  return buildBinding("bound_non_executable", {
    recordEffectiveStatus: "recorded_non_executable",
    receiptIntegrityStatus: "pass",
    bundleIntegrityStatus: "pass",
    hashBindingStatus: "pass",
    trustStatus: "committed_safe_bundle",
    safeReasonCodes: ["record_receipt_bound_non_executable"]
  });
}

function buildBinding(
  bindingStatus: YouTubeCanaryAuthorizationRecordBindingStatus,
  args: {
    recordEffectiveStatus: YouTubeCanaryAuthorizationRecordBindingEvaluation["record_effective_status"];
    receiptIntegrityStatus: "pass" | "fail";
    bundleIntegrityStatus: "pass" | "fail";
    hashBindingStatus: "pass" | "fail";
    trustStatus: YouTubeCanaryAuthorizationRecordBindingEvaluation["trust_status"];
    safeReasonCodes: string[];
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
