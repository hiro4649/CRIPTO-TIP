import { describe, expect, it } from "vitest";
import {
  defaultYouTubeCanaryAuthorizationBundle,
  evaluateYouTubeCanaryAuthorization,
  safeCanonicalAuthorizationHash,
  type YouTubeCanaryAuthorizationBundle
} from "./youtube-live-chat-canary-authorization-gate.js";
import {
  safeReceiptHash,
  type YouTubeCanaryAuthorizationAuditReceipt
} from "./youtube-live-chat-canary-audit-receipt.js";
import {
  evaluateYouTubeCanaryAuthorizationRecordBinding
} from "./youtube-live-chat-canary-record-receipt-binding.js";
import type { YouTubeCanaryAuthorizationRecord } from "./youtube-live-chat-canary-authorization-record.js";

const now = new Date("2026-06-20T12:00:00.000Z");

function completeBundle(): YouTubeCanaryAuthorizationBundle {
  return {
    ...defaultYouTubeCanaryAuthorizationBundle(),
    bundleStatus: "owner_inputs_recorded",
    networkAuthorization: "owner_authorization_recorded",
    credentialProvider: "opaque_interface_ready",
    clientIdRef: "opaque_ref_recorded",
    clientSecretRef: "opaque_ref_recorded",
    refreshTokenRef: "opaque_ref_recorded",
    redirectUri: "confirmed",
    testChannel: "selected_test_only",
    testLiveStream: "selected_test_only",
    quotaBudget: "confirmed_within_first_canary_limits",
    privacyReview: "pass",
    dataDeletionReview: "pass",
    revocationRunbook: "documented",
    killSwitch: "armed_for_controlled_canary"
  };
}

function receiptFor(bundle: YouTubeCanaryAuthorizationBundle, inputTrust: "committed_safe_bundle" | "untrusted_preview" = "committed_safe_bundle") {
  return evaluateYouTubeCanaryAuthorization(bundle, {
    inputTrust,
    now
  }).audit_receipt;
}

function recordFor(
  bundle: YouTubeCanaryAuthorizationBundle,
  receipt: YouTubeCanaryAuthorizationAuditReceipt,
  overrides: Partial<YouTubeCanaryAuthorizationRecord> = {}
): YouTubeCanaryAuthorizationRecord {
  return {
    schema_version: "1.0.0",
    record_id: "safe_youtube_canary_record_0123456789abcdef",
    authorization_bundle_hash: safeCanonicalAuthorizationHash(bundle),
    audit_receipt_hash: receipt.safe_receipt_hash,
    scope_version: "p1_youtube_canary_authorization_record_v1",
    record_status: "recorded_non_executable",
    created_at: "2026-06-20T00:00:00.000Z",
    expires_at: "2026-06-21T00:00:00.000Z",
    owner_decision_reference_status: "opaque_reference_recorded",
    network_authorization_reference_status: "opaque_reference_recorded",
    credential_reference_status: "opaque_reference_recorded",
    privacy_review_reference_status: "opaque_reference_recorded",
    data_deletion_review_reference_status: "opaque_reference_recorded",
    kill_switch_reference_status: "opaque_reference_recorded",
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

function expectNeverExecutable(value: ReturnType<typeof evaluateYouTubeCanaryAuthorizationRecordBinding>) {
  expect(value.authority_status).toBe("non_authoritative");
  expect(value.execution_status).toBe("forbidden");
  expect(value.network_enabled).toBe(false);
  expect(value.oauth_configured).toBe(false);
  expect(value.secret_accessed).toBe(false);
  expect(value.real_api_execution).toBe(false);
  expect(value.record_persisted).toBe(false);
  expect(value.receipt_persisted).toBe(false);
  expect(value.persistence_status).toBe("not_implemented");
}

describe("YouTube canary record receipt binding", () => {
  it("binds recorded_non_executable record to complete committed bundle and matching receipt", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);
    const evaluation = evaluateYouTubeCanaryAuthorizationRecordBinding({
      record: recordFor(bundle, receipt),
      auditReceipt: receipt,
      authorizationBundle: bundle,
      now
    });

    expect(evaluation.binding_status).toBe("bound_non_executable");
    expect(evaluation.record_effective_status).toBe("recorded_non_executable");
    expect(evaluation.receipt_integrity_status).toBe("pass");
    expect(evaluation.bundle_integrity_status).toBe("pass");
    expect(evaluation.hash_binding_status).toBe("pass");
    expect(evaluation.trust_status).toBe("committed_safe_bundle");
    expectNeverExecutable(evaluation);
  });

  it("marks preview receipt binding as non-authoritative", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle, "untrusted_preview");
    const evaluation = evaluateYouTubeCanaryAuthorizationRecordBinding({
      record: recordFor(bundle, receipt),
      auditReceipt: receipt,
      authorizationBundle: bundle,
      now
    });

    expect(evaluation.binding_status).toBe("preview_bound_non_authoritative");
    expect(evaluation.trust_status).toBe("untrusted_preview");
    expectNeverExecutable(evaluation);
  });

  it("marks committed incomplete bundle without creating authority", () => {
    const bundle = defaultYouTubeCanaryAuthorizationBundle();
    const receipt = receiptFor(bundle);
    const evaluation = evaluateYouTubeCanaryAuthorizationRecordBinding({
      record: recordFor(bundle, receipt),
      auditReceipt: receipt,
      authorizationBundle: bundle,
      now
    });

    expect(evaluation.binding_status).toBe("committed_bundle_incomplete");
    expect(evaluation.hash_binding_status).toBe("pass");
    expectNeverExecutable(evaluation);
  });

  it("maps draft, revoked, and expired records after hashes pass", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);

    expect(evaluateYouTubeCanaryAuthorizationRecordBinding({
      record: recordFor(bundle, receipt, { record_status: "draft" }),
      auditReceipt: receipt,
      authorizationBundle: bundle,
      now
    }).binding_status).toBe("record_draft");

    expect(evaluateYouTubeCanaryAuthorizationRecordBinding({
      record: recordFor(bundle, receipt, {
        record_status: "revoked",
        revoked_at: "2026-06-20T01:00:00.000Z",
        revocation_reason_code: "owner_revoked"
      }),
      auditReceipt: receipt,
      authorizationBundle: bundle,
      now
    }).binding_status).toBe("record_revoked");

    expect(evaluateYouTubeCanaryAuthorizationRecordBinding({
      record: recordFor(bundle, receipt, { expires_at: "2026-06-20T11:59:59.000Z" }),
      auditReceipt: receipt,
      authorizationBundle: bundle,
      now
    }).binding_status).toBe("record_expired");
  });

  it("rejects mismatched record bundle hash and record receipt hash", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);

    expect(evaluateYouTubeCanaryAuthorizationRecordBinding({
      record: recordFor(bundle, receipt, { authorization_bundle_hash: "safe_hash_0000000000000000" }),
      auditReceipt: receipt,
      authorizationBundle: bundle,
      now
    }).binding_status).toBe("hash_binding_failed");

    expect(evaluateYouTubeCanaryAuthorizationRecordBinding({
      record: recordFor(bundle, receipt, { audit_receipt_hash: "safe_receipt_0000000000000000" }),
      auditReceipt: receipt,
      authorizationBundle: bundle,
      now
    }).binding_status).toBe("hash_binding_failed");
  });

  it("rejects tampered receipt hash and tampered receipt semantics", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);
    const tamperedHash = { ...receipt, safe_receipt_hash: "safe_receipt_0000000000000000" };
    expect(evaluateYouTubeCanaryAuthorizationRecordBinding({
      record: recordFor(bundle, receipt),
      auditReceipt: tamperedHash,
      authorizationBundle: bundle,
      now
    }).binding_status).toBe("receipt_integrity_failed");

    const tamperedSemantics = { ...receipt, authorization_status: "awaiting_owner_authorization" as const };
    tamperedSemantics.safe_receipt_hash = safeReceiptHash(withoutReceiptHash(tamperedSemantics));
    expect(evaluateYouTubeCanaryAuthorizationRecordBinding({
      record: recordFor(bundle, receipt),
      auditReceipt: tamperedSemantics,
      authorizationBundle: bundle,
      now
    }).binding_status).toBe("receipt_integrity_failed");
  });

  it("rejects invalid bundle input and does not echo raw input", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);
    const evaluation = evaluateYouTubeCanaryAuthorizationRecordBinding({
      record: recordFor(bundle, receipt),
      auditReceipt: receipt,
      authorizationBundle: { ...bundle, clientIdRef: "Bearer raw" },
      now
    });

    expect(evaluation.binding_status).toBe("bundle_integrity_failed");
    expect(JSON.stringify(evaluation)).not.toContain("Bearer");
    expect(JSON.stringify(evaluation)).not.toContain("client_secret");
    expectNeverExecutable(evaluation);
  });
});

function withoutReceiptHash<T extends { safe_receipt_hash: string }>(receipt: T): Omit<T, "safe_receipt_hash"> {
  const { safe_receipt_hash: _hash, ...withoutHash } = receipt;
  return withoutHash;
}
