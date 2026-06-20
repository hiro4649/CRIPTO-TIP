import { z } from "zod";

const isoDateTime = z.string().datetime();
const referenceStatus = z.enum(["absent", "opaque_reference_recorded"]);
const allReferenceKeys = [
  "owner_decision_reference_status",
  "network_authorization_reference_status",
  "credential_reference_status",
  "privacy_review_reference_status",
  "data_deletion_review_reference_status",
  "kill_switch_reference_status"
] as const;

export const YouTubeCanaryAuthorizationRecordSchema = z.object({
  schema_version: z.literal("1.0.0"),
  record_id: z.string().regex(/^safe_youtube_canary_record_[0-9a-f]{16}$/),
  authorization_bundle_hash: z.string().regex(/^safe_hash_[0-9a-f]{16}$/),
  audit_receipt_hash: z.string().regex(/^safe_receipt_[0-9a-f]{16}$/),
  scope_version: z.literal("p1_youtube_canary_authorization_record_v1"),
  record_status: z.enum(["draft", "recorded_non_executable", "revoked", "expired"]),
  created_at: isoDateTime,
  expires_at: isoDateTime,
  revoked_at: isoDateTime.optional(),
  revocation_reason_code: z.enum(["owner_revoked", "expired_replaced", "safety_boundary_changed"]).optional(),
  owner_decision_reference_status: referenceStatus,
  network_authorization_reference_status: referenceStatus,
  credential_reference_status: referenceStatus,
  privacy_review_reference_status: referenceStatus,
  data_deletion_review_reference_status: referenceStatus,
  kill_switch_reference_status: referenceStatus,
  execution_status: z.literal("forbidden"),
  network_enabled: z.literal(false),
  oauth_configured: z.literal(false),
  secret_accessed: z.literal(false),
  real_api_execution: z.literal(false),
  record_persisted: z.literal(false),
  persistence_status: z.literal("not_implemented")
}).strict().superRefine((record, ctx) => {
  const createdAt = Date.parse(record.created_at);
  const expiresAt = Date.parse(record.expires_at);
  if (Number.isFinite(createdAt) && Number.isFinite(expiresAt) && expiresAt <= createdAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expires_at"],
      message: "expires_at_must_be_after_created_at"
    });
  }
  if (record.record_status === "revoked" && !record.revoked_at) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["revoked_at"],
      message: "revoked_record_requires_revoked_at"
    });
  }
  if (record.record_status === "revoked" && !record.revocation_reason_code) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["revocation_reason_code"],
      message: "revoked_record_requires_revocation_reason_code"
    });
  }
  if (record.record_status !== "revoked" && record.revoked_at) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["revoked_at"],
      message: "non_revoked_record_must_not_have_revoked_at"
    });
  }
  if (record.record_status !== "revoked" && record.revocation_reason_code) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["revocation_reason_code"],
      message: "non_revoked_record_must_not_have_revocation_reason_code"
    });
  }
  if (record.revoked_at) {
    const revokedAt = Date.parse(record.revoked_at);
    if (Number.isFinite(createdAt) && Number.isFinite(revokedAt) && revokedAt <= createdAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["revoked_at"],
        message: "revoked_at_must_be_after_created_at"
      });
    }
  }
  if (record.record_status === "recorded_non_executable") {
    const missingReference = allReferenceKeys.find((key) => record[key] !== "opaque_reference_recorded");
    if (missingReference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [missingReference],
        message: "recorded_non_executable_requires_all_references_recorded"
      });
    }
  }
});

export type YouTubeCanaryAuthorizationRecord = z.infer<typeof YouTubeCanaryAuthorizationRecordSchema>;

export type YouTubeCanaryAuthorizationRecordEvaluation = {
  effective_record_status: "invalid" | "draft" | "recorded_non_executable" | "revoked" | "expired";
  execution_status: "forbidden";
  network_enabled: false;
  oauth_configured: false;
  secret_accessed: false;
  real_api_execution: false;
  record_persisted: false;
  persistence_status: "not_implemented";
  safe_reason_codes: string[];
};

export function evaluateYouTubeCanaryAuthorizationRecord(input: unknown, now = new Date()): YouTubeCanaryAuthorizationRecordEvaluation {
  const parsed = YouTubeCanaryAuthorizationRecordSchema.safeParse(input);
  if (!parsed.success) return buildEvaluation("invalid", ["authorization_record_schema_invalid"]);
  const record = parsed.data;
  if (record.record_status === "revoked" || record.revoked_at) return buildEvaluation("revoked", ["authorization_record_revoked"]);
  if (record.record_status === "expired" || Date.parse(record.expires_at) <= now.getTime()) return buildEvaluation("expired", ["authorization_record_expired"]);
  if (record.record_status === "draft") return buildEvaluation("draft", ["authorization_record_draft"]);
  const missingReferences = allReferenceKeys.filter((key) => record[key] !== "opaque_reference_recorded");
  if (missingReferences.length) return buildEvaluation("draft", missingReferences.map((key) => `${key}_absent`));
  return buildEvaluation("recorded_non_executable", ["authorization_record_non_executable"]);
}

function buildEvaluation(
  effectiveRecordStatus: YouTubeCanaryAuthorizationRecordEvaluation["effective_record_status"],
  safeReasonCodes: string[]
): YouTubeCanaryAuthorizationRecordEvaluation {
  return {
    effective_record_status: effectiveRecordStatus,
    execution_status: "forbidden",
    network_enabled: false,
    oauth_configured: false,
    secret_accessed: false,
    real_api_execution: false,
    record_persisted: false,
    persistence_status: "not_implemented",
    safe_reason_codes: [...new Set(safeReasonCodes)]
  };
}
