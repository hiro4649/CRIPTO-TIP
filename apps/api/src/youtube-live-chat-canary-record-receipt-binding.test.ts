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
  evaluateYouTubeCanaryAuthorizationRecordBinding,
  type YouTubeCanaryAuthorizationRecordBindingEvaluation
} from "./youtube-live-chat-canary-record-receipt-binding.js";
import type { YouTubeCanaryAuthorizationRecord } from "./youtube-live-chat-canary-authorization-record.js";

const receiptTime = new Date("2026-06-20T12:00:00.000Z");
const bindingEvaluationTime = new Date("2026-06-20T13:00:00.000Z");

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
    now: receiptTime
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
    created_at: "2026-06-20T12:00:00.000Z",
    expires_at: "2026-06-21T12:00:00.000Z",
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

function expectNeverExecutable(value: YouTubeCanaryAuthorizationRecordBindingEvaluation) {
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

function evaluate(
  args: {
    bundle?: YouTubeCanaryAuthorizationBundle | unknown;
    receipt?: YouTubeCanaryAuthorizationAuditReceipt | unknown;
    record?: YouTubeCanaryAuthorizationRecord | unknown;
  } = {}
) {
  const bundle = args.bundle ?? completeBundle();
  const receipt = args.receipt ?? receiptFor(bundle as YouTubeCanaryAuthorizationBundle);
  const record = args.record ?? recordFor(bundle as YouTubeCanaryAuthorizationBundle, receipt as YouTubeCanaryAuthorizationAuditReceipt);
  return evaluateYouTubeCanaryAuthorizationRecordBinding({
    record,
    auditReceipt: receipt,
    authorizationBundle: bundle,
    now: bindingEvaluationTime
  });
}

function tamperReceipt(
  receipt: YouTubeCanaryAuthorizationAuditReceipt,
  overrides: Partial<YouTubeCanaryAuthorizationAuditReceipt>
): YouTubeCanaryAuthorizationAuditReceipt {
  const tampered = { ...receipt, ...overrides };
  return {
    ...tampered,
    safe_receipt_hash: safeReceiptHash(withoutReceiptHash(tampered))
  };
}

describe("YouTube canary record receipt binding", () => {
  it("binds a record created at receipt time to complete committed bundle and matching receipt", () => {
    const evaluation = evaluate();

    expect(evaluation.binding_status).toBe("bound_non_executable");
    expect(evaluation.record_effective_status).toBe("recorded_non_executable");
    expect(evaluation.receipt_integrity_status).toBe("pass");
    expect(evaluation.bundle_integrity_status).toBe("pass");
    expect(evaluation.hash_binding_status).toBe("pass");
    expect(evaluation.trust_status).toBe("committed_safe_bundle");
    expect(evaluation.safe_reason_codes).toContain("authorization_record_bound_non_executable");
    expectNeverExecutable(evaluation);
  });

  it("binds a record created after the receipt time", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);
    const evaluation = evaluate({
      bundle,
      receipt,
      record: recordFor(bundle, receipt, { created_at: "2026-06-20T12:00:01.000Z" })
    });

    expect(evaluation.binding_status).toBe("bound_non_executable");
    expect(evaluation.safe_reason_codes).toContain("authorization_record_bound_non_executable");
    expectNeverExecutable(evaluation);
  });

  it("rejects a record created before the receipt time", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);
    const evaluation = evaluate({
      bundle,
      receipt,
      record: recordFor(bundle, receipt, { created_at: "2026-06-20T11:59:59.999Z" })
    });

    expect(evaluation.binding_status).toBe("invalid");
    expect(evaluation.record_effective_status).toBe("invalid");
    expect(evaluation.safe_reason_codes).toEqual(["record_created_before_receipt"]);
    expectNeverExecutable(evaluation);
  });

  it("keeps temporal failure before revoked and expired business states", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);

    expect(evaluate({
      bundle,
      receipt,
      record: recordFor(bundle, receipt, {
        created_at: "2026-06-20T11:59:59.999Z",
        record_status: "revoked",
        revoked_at: "2026-06-20T12:00:01.000Z",
        revocation_reason_code: "owner_revoked"
      })
    }).binding_status).toBe("invalid");

    const expired = evaluate({
      bundle,
      receipt,
      record: recordFor(bundle, receipt, {
        created_at: "2026-06-20T11:59:59.999Z",
        expires_at: "2026-06-20T12:30:00.000Z"
      })
    });
    expect(expired.binding_status).toBe("invalid");
    expect(expired.safe_reason_codes).toEqual(["record_created_before_receipt"]);
  });

  it("keeps receipt and bundle integrity failures before temporal binding", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);
    const beforeReceiptRecord = recordFor(bundle, receipt, { created_at: "2026-06-20T11:59:59.999Z" });

    expect(evaluate({
      bundle,
      record: beforeReceiptRecord,
      receipt: { ...receipt, safe_receipt_hash: "safe_receipt_0000000000000000" }
    }).binding_status).toBe("receipt_integrity_failed");

    expect(evaluate({
      bundle: { ...bundle, clientIdRef: "Bearer raw" },
      record: beforeReceiptRecord,
      receipt
    }).binding_status).toBe("bundle_integrity_failed");
  });

  it("rejects invalid record schema without echoing raw record input", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);
    const evaluation = evaluate({
      bundle,
      receipt,
      record: { ...recordFor(bundle, receipt), record_id: "raw-owner@example.test" }
    });

    expect(evaluation.binding_status).toBe("invalid");
    expect(evaluation.safe_reason_codes).toEqual(["authorization_record_schema_invalid"]);
    expect(JSON.stringify(evaluation)).not.toContain("raw-owner");
    expectNeverExecutable(evaluation);
  });

  it("returns specific hash and receipt derivation reason codes", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);

    expect(evaluate({
      bundle,
      receipt,
      record: recordFor(bundle, receipt, { authorization_bundle_hash: "safe_hash_0000000000000000" })
    }).safe_reason_codes).toContain("record_bundle_hash_mismatch");

    expect(evaluate({
      bundle,
      receipt: tamperReceipt(receipt, { safe_bundle_hash: "safe_hash_0000000000000000" }),
      record: recordFor(bundle, receipt)
    }).safe_reason_codes).toEqual(expect.arrayContaining([
      "receipt_bundle_hash_mismatch",
      "record_receipt_hash_mismatch",
      "audit_receipt_not_derived_from_bundle"
    ]));

    expect(evaluate({
      bundle,
      receipt,
      record: recordFor(bundle, receipt, { audit_receipt_hash: "safe_receipt_0000000000000000" })
    }).safe_reason_codes).toContain("record_receipt_hash_mismatch");
  });

  it("marks preview receipt binding as non-authoritative", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle, "untrusted_preview");
    const evaluation = evaluate({ bundle, receipt, record: recordFor(bundle, receipt) });

    expect(evaluation.binding_status).toBe("preview_bound_non_authoritative");
    expect(evaluation.trust_status).toBe("untrusted_preview");
    expect(evaluation.safe_reason_codes).toEqual(["untrusted_preview_not_record_authority"]);
    expectNeverExecutable(evaluation);
  });

  it("marks committed incomplete bundle without creating authority", () => {
    const bundle = defaultYouTubeCanaryAuthorizationBundle();
    const receipt = receiptFor(bundle);
    const evaluation = evaluate({ bundle, receipt, record: recordFor(bundle, receipt) });

    expect(evaluation.binding_status).toBe("committed_bundle_incomplete");
    expect(evaluation.hash_binding_status).toBe("pass");
    expect(evaluation.safe_reason_codes).toEqual(["committed_bundle_incomplete"]);
    expectNeverExecutable(evaluation);
  });

  it("maps draft, revoked, and expired records after temporal and hash checks pass", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);

    expect(evaluate({
      bundle,
      receipt,
      record: recordFor(bundle, receipt, { record_status: "draft" })
    }).binding_status).toBe("record_draft");

    expect(evaluate({
      bundle,
      receipt,
      record: recordFor(bundle, receipt, {
        record_status: "revoked",
        revoked_at: "2026-06-20T12:00:01.000Z",
        revocation_reason_code: "owner_revoked"
      })
    }).binding_status).toBe("record_revoked");

    expect(evaluate({
      bundle,
      receipt,
      record: recordFor(bundle, receipt, { expires_at: "2026-06-20T12:30:00.000Z" })
    }).binding_status).toBe("record_expired");
  });

  it("rejects invalid bundle input and does not echo raw input", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);
    const evaluation = evaluate({
      bundle: { ...bundle, clientIdRef: "Bearer raw" },
      receipt,
      record: recordFor(bundle, receipt)
    });

    expect(evaluation.binding_status).toBe("bundle_integrity_failed");
    expect(JSON.stringify(evaluation)).not.toContain("Bearer");
    expect(JSON.stringify(evaluation)).not.toContain("client_secret");
    expectNeverExecutable(evaluation);
  });

  it("does not include raw timestamps, hashes, secrets, URLs, owner identity, or stack traces in failures", () => {
    const bundle = completeBundle();
    const receipt = receiptFor(bundle);
    const evaluationText = JSON.stringify(evaluate({
      bundle,
      receipt,
      record: recordFor(bundle, receipt, { created_at: "2026-06-20T11:59:59.999Z" })
    }));

    for (const forbidden of [
      "2026-06-20T11:59:59.999Z",
      "2026-06-20T12:00:00.000Z",
      "safe_hash_",
      "safe_receipt_",
      "client_id",
      "client_secret",
      "refresh_token",
      "Bearer",
      "Authorization",
      "https://",
      "liveChatId",
      "wallet",
      "postgres://",
      "owner@example",
      "github.com/",
      "Error:"
    ]) {
      expect(evaluationText).not.toContain(forbidden);
    }
  });
});

function withoutReceiptHash<T extends { safe_receipt_hash: string }>(receipt: T): Omit<T, "safe_receipt_hash"> {
  const { safe_receipt_hash: _hash, ...withoutHash } = receipt;
  return withoutHash;
}
