import { describe, expect, it } from "vitest";
import {
  YouTubeCanaryAuthorizationRecordSchema,
  evaluateYouTubeCanaryAuthorizationRecord,
  type YouTubeCanaryAuthorizationRecord
} from "./youtube-live-chat-canary-authorization-record.js";

const now = new Date("2026-06-20T12:00:00.000Z");

function record(overrides: Partial<YouTubeCanaryAuthorizationRecord> = {}): YouTubeCanaryAuthorizationRecord {
  return {
    schema_version: "1.0.0",
    record_id: "safe_youtube_canary_record_0123456789abcdef",
    authorization_bundle_hash: "safe_hash_0123456789abcdef",
    audit_receipt_hash: "safe_receipt_0123456789abcdef",
    scope_version: "p1_youtube_canary_authorization_record_v1",
    record_status: "draft",
    created_at: "2026-06-20T00:00:00.000Z",
    expires_at: "2026-06-21T00:00:00.000Z",
    owner_decision_reference_status: "absent",
    network_authorization_reference_status: "absent",
    credential_reference_status: "absent",
    privacy_review_reference_status: "absent",
    data_deletion_review_reference_status: "absent",
    kill_switch_reference_status: "absent",
    execution_status: "forbidden",
    network_enabled: false,
    oauth_configured: false,
    secret_accessed: false,
    real_api_execution: false,
    record_persisted: false,
    persistence_status: "not_implemented",
    ...overrides
  };
}

function recordedNonExecutable() {
  return record({
    record_status: "recorded_non_executable",
    owner_decision_reference_status: "opaque_reference_recorded",
    network_authorization_reference_status: "opaque_reference_recorded",
    credential_reference_status: "opaque_reference_recorded",
    privacy_review_reference_status: "opaque_reference_recorded",
    data_deletion_review_reference_status: "opaque_reference_recorded",
    kill_switch_reference_status: "opaque_reference_recorded"
  });
}

function expectNeverExecutable(value: ReturnType<typeof evaluateYouTubeCanaryAuthorizationRecord>) {
  expect(value.execution_status).toBe("forbidden");
  expect(value.network_enabled).toBe(false);
  expect(value.oauth_configured).toBe(false);
  expect(value.secret_accessed).toBe(false);
  expect(value.real_api_execution).toBe(false);
  expect(value.record_persisted).toBe(false);
  expect(value.persistence_status).toBe("not_implemented");
}

describe("YouTube canary authorization record model", () => {
  it("accepts valid draft and keeps execution forbidden", () => {
    const parsed = YouTubeCanaryAuthorizationRecordSchema.parse(record());
    const evaluation = evaluateYouTubeCanaryAuthorizationRecord(parsed, now);

    expect(evaluation.effective_record_status).toBe("draft");
    expect(evaluation.safe_reason_codes).toContain("authorization_record_draft");
    expectNeverExecutable(evaluation);
  });

  it("accepts recorded_non_executable but never enables execution", () => {
    const evaluation = evaluateYouTubeCanaryAuthorizationRecord(recordedNonExecutable(), now);

    expect(evaluation.effective_record_status).toBe("recorded_non_executable");
    expect(evaluation.safe_reason_codes).toEqual(["authorization_record_non_executable"]);
    expectNeverExecutable(evaluation);
  });

  it("prioritizes revoked over recorded and expired states", () => {
    const evaluation = evaluateYouTubeCanaryAuthorizationRecord(record({
      ...recordedNonExecutable(),
      record_status: "revoked",
      revoked_at: "2026-06-20T01:00:00.000Z",
      revocation_reason_code: "owner_revoked",
      expires_at: "2026-06-20T02:00:00.000Z"
    }), now);

    expect(evaluation.effective_record_status).toBe("revoked");
    expect(evaluation.safe_reason_codes).toContain("authorization_record_revoked");
    expectNeverExecutable(evaluation);
  });

  it("marks expired records using injected clock", () => {
    const evaluation = evaluateYouTubeCanaryAuthorizationRecord(record({
      ...recordedNonExecutable(),
      expires_at: "2026-06-20T11:59:59.000Z"
    }), now);

    expect(evaluation.effective_record_status).toBe("expired");
    expect(evaluation.safe_reason_codes).toContain("authorization_record_expired");
    expectNeverExecutable(evaluation);
  });

  it("rejects invalid timestamps, temporal order, hashes, raw-like unknown fields, and status mismatches", () => {
    const invalidCases = [
      record({ created_at: "not-a-date" }),
      record({ expires_at: "2026-06-19T00:00:00.000Z" }),
      record({ record_status: "revoked", revoked_at: undefined }),
      record({ record_status: "revoked", revoked_at: "2026-06-20T01:00:00.000Z", revocation_reason_code: undefined }),
      record({ record_status: "draft", revoked_at: "2026-06-20T01:00:00.000Z" }),
      record({ record_status: "draft", revocation_reason_code: "owner_revoked" }),
      record({ record_status: "revoked", revoked_at: "2026-06-19T23:59:59.000Z", revocation_reason_code: "owner_revoked" }),
      record({ ...recordedNonExecutable(), credential_reference_status: "absent" }),
      record({ authorization_bundle_hash: "hash_raw" }),
      record({ audit_receipt_hash: "receipt_raw" }),
      { ...record(), owner_email: "owner@example.test" },
      { ...record(), client_secret: "raw" },
      { ...record(), refresh_token: "raw" },
      { ...record(), channel_id: "raw" },
      { ...record(), url: "https://example.test" }
    ];

    for (const input of invalidCases) {
      expect(YouTubeCanaryAuthorizationRecordSchema.safeParse(input).success).toBe(false);
      const evaluation = evaluateYouTubeCanaryAuthorizationRecord(input, now);
      expect(evaluation.effective_record_status).toBe("invalid");
      expect(evaluation.safe_reason_codes).toContain("authorization_record_schema_invalid");
      expectNeverExecutable(evaluation);
    }
  });

  it("rejects recorded_non_executable with missing references instead of downgrading declared state", () => {
    const evaluation = evaluateYouTubeCanaryAuthorizationRecord(record({
      ...recordedNonExecutable(),
      credential_reference_status: "absent"
    }), now);

    expect(evaluation.effective_record_status).toBe("invalid");
    expect(evaluation.safe_reason_codes).toContain("authorization_record_schema_invalid");
    expectNeverExecutable(evaluation);
  });
});
