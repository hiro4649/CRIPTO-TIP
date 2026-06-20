import { describe, expect, it } from "vitest";
import {
  YouTubeCanaryAuthorizationAuditReceiptSchema,
  safeReceiptHash
} from "./youtube-live-chat-canary-audit-receipt.js";
import {
  defaultYouTubeCanaryAuthorizationBundle,
  evaluateYouTubeCanaryAuthorization
} from "./youtube-live-chat-canary-authorization-gate.js";

function completeBundle() {
  return {
    ...defaultYouTubeCanaryAuthorizationBundle(),
    bundleStatus: "owner_inputs_recorded" as const,
    networkAuthorization: "owner_authorization_recorded" as const,
    credentialProvider: "opaque_interface_ready" as const,
    clientIdRef: "opaque_ref_recorded" as const,
    clientSecretRef: "opaque_ref_recorded" as const,
    refreshTokenRef: "opaque_ref_recorded" as const,
    redirectUri: "confirmed" as const,
    testChannel: "selected_test_only" as const,
    testLiveStream: "selected_test_only" as const,
    quotaBudget: "confirmed_within_first_canary_limits" as const,
    privacyReview: "pass" as const,
    dataDeletionReview: "pass" as const,
    revocationRunbook: "documented" as const,
    killSwitch: "armed_for_controlled_canary" as const
  };
}

function expectNoRawUnsafeValues(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const unsafe of ["Bearer", "client_secret=", "refresh_token=", "access_token=", "secretref:", "https://", "127.0.0.1", "live_chat_id=", "completed_fields", "pending_fields"]) {
    expect(serialized).not.toContain(unsafe);
  }
}

describe("YouTube canary authorization audit receipt", () => {
  it("derives a non-persistent committed safe receipt from the evaluation", () => {
    const evaluation = evaluateYouTubeCanaryAuthorization(defaultYouTubeCanaryAuthorizationBundle(), {
      inputTrust: "committed_safe_bundle",
      now: new Date("2026-06-20T12:00:00.000Z")
    });
    const receipt = YouTubeCanaryAuthorizationAuditReceiptSchema.parse(evaluation.audit_receipt);

    expect(receipt.input_trust).toBe(evaluation.input_trust);
    expect(receipt.evaluation_mode).toBe("committed_safe_bundle_evaluation");
    expect(receipt.authorization_status).toBe(evaluation.authorization_status);
    expect(receipt.preflight_status).toBe(evaluation.preflight_status);
    expect(receipt.execution_status).toBe("forbidden");
    expect(receipt.preview_only).toBe(false);
    expect(receipt.state_persisted).toBe(false);
    expect(receipt.receipt_persisted).toBe(false);
    expect(receipt.audit_retrievable).toBe(false);
    expect(receipt.safe_bundle_hash).toBe(evaluation.safe_bundle_hash);
    expect(receipt.evaluated_at).toBe(evaluation.evaluated_at);
    expect(receipt.blocker_codes).toEqual(evaluation.blocker_codes);
    expectNoRawUnsafeValues(receipt);
  });

  it("derives a preview receipt without creating execution or persistence authority", () => {
    const evaluation = evaluateYouTubeCanaryAuthorization(completeBundle(), {
      inputTrust: "untrusted_preview",
      now: new Date("2026-06-20T12:00:00.000Z")
    });
    const receipt = YouTubeCanaryAuthorizationAuditReceiptSchema.parse(evaluation.audit_receipt);

    expect(receipt.evaluation_mode).toBe("untrusted_preview_evaluation");
    expect(receipt.authorization_status).toBe("authorization_fields_complete");
    expect(receipt.preview_only).toBe(true);
    expect(receipt.state_persisted).toBe(false);
    expect(receipt.receipt_persisted).toBe(false);
    expect(receipt.audit_retrievable).toBe(false);
    expect(receipt.network_enabled).toBe(false);
    expect(receipt.oauth_configured).toBe(false);
    expect(receipt.secret_accessed).toBe(false);
    expect(receipt.real_api_execution).toBe(false);
    expectNoRawUnsafeValues(receipt);
  });

  it("uses a canonical safe receipt hash and changes when evaluated_at changes", () => {
    const early = evaluateYouTubeCanaryAuthorization(completeBundle(), {
      inputTrust: "untrusted_preview",
      now: new Date("2026-06-20T12:00:00.000Z")
    }).audit_receipt;
    const same = evaluateYouTubeCanaryAuthorization(completeBundle(), {
      inputTrust: "untrusted_preview",
      now: new Date("2026-06-20T12:00:00.000Z")
    }).audit_receipt;
    const later = evaluateYouTubeCanaryAuthorization(completeBundle(), {
      inputTrust: "untrusted_preview",
      now: new Date("2026-06-20T12:00:01.000Z")
    }).audit_receipt;

    expect(early.safe_receipt_hash).toBe(same.safe_receipt_hash);
    expect(early.safe_receipt_hash).not.toBe(later.safe_receipt_hash);
    const { safe_receipt_hash: _hash, ...withoutHash } = early;
    expect(safeReceiptHash(withoutHash)).toBe(early.safe_receipt_hash);
  });
});
