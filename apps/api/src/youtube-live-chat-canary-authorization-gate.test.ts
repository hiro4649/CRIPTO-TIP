import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  YouTubeCanaryAuthorizationBundleSchema,
  YouTubeCanaryAuthorizationEvidenceSchema,
  defaultYouTubeCanaryAuthorizationBundle,
  evaluateYouTubeCanaryAuthorization,
  projectAuthorizationToLegacyPreflight,
  projectAuthorizationToRealConnectorReadiness,
  safeCanonicalAuthorizationHash
} from "./youtube-live-chat-canary-authorization-gate.js";
import { evaluateYouTubeLiveChatRealConnectorReadinessFromAuthorizationBundle } from "./youtube-live-chat-real-connector-readiness-gate.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

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

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

function expectSafeOutput(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const unsafe of ["Bearer", "client_secret=", "refresh_token=", "access_token=", "secretref:", "https://", "127.0.0.1", "live_chat_id="]) {
    expect(serialized).not.toContain(unsafe);
  }
}

describe("YouTube canary authorization gate", () => {
  it("keeps the default canonical bundle awaiting owner authorization", () => {
    const evaluation = evaluateYouTubeCanaryAuthorization(defaultYouTubeCanaryAuthorizationBundle());

    expect(evaluation.authorization_status).toBe("awaiting_owner_authorization");
    expect(evaluation.preflight_status).toBe("blocked");
    expect(evaluation.execution_status).toBe("forbidden");
    expect(evaluation.input_trust).toBe("untrusted_preview");
    expect(evaluation.blocker_codes).toEqual([
      "bundle_status_incomplete",
      "network_authorization_absent",
      "credential_provider_unselected",
      "client_id_ref_absent",
      "client_secret_ref_absent",
      "refresh_token_ref_absent",
      "redirect_uri_unconfirmed",
      "test_channel_unselected",
      "test_live_stream_unselected",
      "quota_budget_unconfirmed",
      "privacy_review_incomplete",
      "data_deletion_review_incomplete",
      "kill_switch_blocked"
    ]);
    expect(evaluation.network_enabled).toBe(false);
    expect(evaluation.oauth_configured).toBe(false);
    expect(evaluation.secret_accessed).toBe(false);
    expect(evaluation.real_api_execution).toBe(false);
    expect(evaluation.owner_approval_created).toBe(false);
    expect(evaluation.github_approval_review_created).toBe(false);
    expect(evaluation.merge_authority_created).toBe(false);
    expectSafeOutput(evaluation);
  });

  it("accepts complete authorization fields while keeping execution forbidden and network disabled", () => {
    const evaluation = evaluateYouTubeCanaryAuthorization(completeBundle());

    expect(evaluation.authorization_status).toBe("authorization_fields_complete");
    expect(evaluation.preflight_status).toBe("authorization_fields_complete_network_disabled");
    expect(evaluation.blocker_codes).toEqual([]);
    expect(evaluation.network_enabled).toBe(false);
    expect(evaluation.oauth_configured).toBe(false);
    expect(evaluation.secret_accessed).toBe(false);
    expect(evaluation.real_api_execution).toBe(false);
  });

  it("rejects unknown fields, unsafe values, execution flags, side effects, and out-of-bounds limits", () => {
    const base = completeBundle();
    const invalidCases = [
      { ...base, unknown: true },
      { ...base, clientIdRef: "Bearer raw" },
      { ...base, networkExecution: true },
      { ...base, oauthExecution: true },
      { ...base, secretAccess: true },
      { ...base, realYouTubeApiUsed: true },
      { ...base, firstCanaryLimits: { ...base.firstCanaryLimits, maxResults: 201 } },
      { ...base, firstCanaryLimits: { ...base.firstCanaryLimits, maximumApiCalls: 4 } },
      { ...base, firstCanaryLimits: { ...base.firstCanaryLimits, maximumDurationSeconds: 61 } },
      { ...base, firstCanaryLimits: { ...base.firstCanaryLimits, automaticFallback: true } },
      { ...base, firstCanaryLimits: { ...base.firstCanaryLimits, automaticRetry: true } },
      { ...base, firstCanaryLimits: { ...base.firstCanaryLimits, safeParsePreviewOnly: false } },
      { ...base, firstCanaryLimits: { ...base.firstCanaryLimits, supportSideEffects: true } },
      { ...base, firstCanaryLimits: { ...base.firstCanaryLimits, sideEffects: { ...base.firstCanaryLimits.sideEffects, overlay: true } } }
    ];

    for (const input of invalidCases) {
      const evaluation = evaluateYouTubeCanaryAuthorization(input);
      expect(evaluation.authorization_status).toBe("invalid_authorization_bundle");
      expect(evaluation.blocker_codes.length).toBeGreaterThan(0);
      expect(evaluation.execution_status).toBe("forbidden");
      expectSafeOutput(evaluation);
    }

    expect(evaluateYouTubeCanaryAuthorization({ ...base, clientIdRef: "Bearer raw" }).blocker_codes).toContain("unsafe_authorization_value_forbidden");
    expect(evaluateYouTubeCanaryAuthorization({ ...base, firstCanaryLimits: { ...base.firstCanaryLimits, maxResults: 201 } }).blocker_codes).toContain("first_canary_limit_invalid");
    expect(evaluateYouTubeCanaryAuthorization({ ...base, firstCanaryLimits: { ...base.firstCanaryLimits, automaticRetry: true } }).blocker_codes).toContain("first_canary_limit_invalid");
    expect(evaluateYouTubeCanaryAuthorization({ ...base, firstCanaryLimits: { ...base.firstCanaryLimits, sideEffects: { ...base.firstCanaryLimits.sideEffects, overlay: true } } }).blocker_codes).toContain("side_effect_contract_invalid");
    expect(evaluateYouTubeCanaryAuthorization({ ...base, networkExecution: true }).blocker_codes).toContain("execution_flag_must_remain_false");
    expect(evaluateYouTubeCanaryAuthorization({ ...base, unknown: true }).blocker_codes).toContain("authorization_bundle_schema_invalid");
  });

  it("uses a stable safe hash independent of key order and evaluated_at", () => {
    const base = completeBundle();
    const reordered = Object.fromEntries(Object.entries(base).reverse());
    const changed = { ...base, privacyReview: "incomplete" as const };

    expect(safeCanonicalAuthorizationHash(base)).toBe(safeCanonicalAuthorizationHash(YouTubeCanaryAuthorizationBundleSchema.parse(reordered)));
    expect(evaluateYouTubeCanaryAuthorization(base, { now: new Date("2026-06-20T00:00:00.000Z") }).safe_bundle_hash).toBe(evaluateYouTubeCanaryAuthorization(base, { now: new Date("2026-06-21T00:00:00.000Z") }).safe_bundle_hash);
    expect(safeCanonicalAuthorizationHash(base)).not.toBe(safeCanonicalAuthorizationHash(changed));
  });

  it("projects canonical authorization into legacy preflight and real readiness inputs", () => {
    expect(projectAuthorizationToLegacyPreflight(completeBundle())).toMatchObject({
      config_status: "controlled_canary_candidate",
      credential_provider_status: "opaque_interface_ready",
      kill_switch_status: "armed_for_controlled_canary",
      network_authorization_status: "present"
    });
    expect(projectAuthorizationToRealConnectorReadiness(completeBundle())).toMatchObject({
      config_status: "controlled_canary_candidate",
      secret_provider_status: "opaque_interface_ready",
      kill_switch_status: "armed_for_controlled_canary",
      network_authorization_status: "present"
    });
  });

  it("keeps real readiness fail-closed for a complete authorization bundle", () => {
    const readiness = evaluateYouTubeLiveChatRealConnectorReadinessFromAuthorizationBundle(completeBundle());

    expect(readiness.readiness_status).toBe("blocked_pending_network_enablement");
    expect(readiness.preflight_status).toBe("code_ready_network_blocked");
    expect(readiness.execution_status).toBe("forbidden");
    expect(readiness.network_enabled).toBe(false);
    expect(readiness.oauth_configured).toBe(false);
    expect(readiness.real_api_execution).toBe(false);
    expect(JSON.stringify(readiness)).not.toContain("controlled_canary_candidate");
  });

  it("keeps committed .codex evidence wrapper schema-compatible without runtime file reads", () => {
    const evidence = readCodexEvidence("p1-youtube-controlled-canary-authorization-bundle.json");
    expect(YouTubeCanaryAuthorizationEvidenceSchema.parse(evidence).bundle).toEqual(defaultYouTubeCanaryAuthorizationBundle());
    expect(evidence.productRuntimeChanged).toBe(true);
    expect(evidence.readOnlyAdminSurfaceAdded).toBe(true);
    expect(evidence.externalExecutionEnabled).toBe(false);
  });

  it("does not add runtime .codex/docs reads or network/client execution to the authorization path", () => {
    const files = [
      "apps/api/src/youtube-live-chat-canary-authorization-gate.ts",
      "apps/api/src/youtube-live-chat-controlled-canary-preflight.ts",
      "apps/api/src/youtube-live-chat-real-connector-readiness-gate.ts",
      "apps/api/src/routes/admin-youtube-connector-routes.ts"
    ];
    for (const file of files) {
      const source = fs.readFileSync(path.join(root, file), "utf8");
      expect(source).not.toContain(".codex");
      expect(source).not.toContain("docs/");
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toContain("googleapis");
      expect(source).not.toContain("OAuth2");
      expect(source).not.toContain("child_process");
    }
  });
});
