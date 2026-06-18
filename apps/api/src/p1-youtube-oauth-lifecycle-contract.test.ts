import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  issueYouTubeOAuthState,
  planYouTubeOAuthRefresh,
  planYouTubeOAuthRevocation,
  planYouTubeOAuthTokenExchange,
  validateYouTubeOAuthCallback
} from "./youtube-oauth-lifecycle-contract.js";

const root = path.resolve(__dirname, "..", "..", "..");

function readCodexEvidence(fileName: string) {
  return JSON.parse(fs.readFileSync(path.join(root, ".codex", fileName), "utf8"));
}

describe("P1 YouTube OAuth lifecycle contract", () => {
  it("issues one-time raw state and stores only hashes plus safe flags", () => {
    const issued = issueYouTubeOAuthState({ redirect_uri: "https://example.invalid/oauth/callback", now: new Date("2026-06-18T00:00:00.000Z") });

    expect(issued.lifecycle_status).toBe("state_issued");
    expect(issued.raw_state_once.length).toBeGreaterThan(20);
    expect(issued.record.state_hash).not.toBe(issued.raw_state_once);
    expect(issued.record.redirect_binding_hash).not.toContain("example.invalid");
    expect(issued.record.raw_state_stored).toBe(false);
    expect(issued.record.authorization_code_stored).toBe(false);
    expect(issued.record.access_token_stored).toBe(false);
    expect(issued.record.refresh_token_stored).toBe(false);
  });

  it("validates callback without allowing token exchange or network", () => {
    const issued = issueYouTubeOAuthState({ redirect_uri: "https://example.invalid/oauth/callback", now: new Date("2026-06-18T00:00:00.000Z") });
    const decision = validateYouTubeOAuthCallback({
      record: issued.record,
      raw_state: issued.raw_state_once,
      redirect_uri: "https://example.invalid/oauth/callback",
      authorization_code_present: true,
      now: new Date("2026-06-18T00:01:00.000Z")
    });

    expect(decision.lifecycle_status).toBe("callback_validated");
    expect(decision.network_call_allowed).toBe(false);
    expect(decision.token_exchange_allowed).toBe(false);
    expect(decision.refresh_allowed).toBe(false);
  });

  it("rejects state mismatch, expiry, and persisted raw OAuth material", () => {
    const issued = issueYouTubeOAuthState({ redirect_uri: "https://example.invalid/oauth/callback", now: new Date("2026-06-18T00:00:00.000Z") });

    expect(validateYouTubeOAuthCallback({
      record: issued.record,
      raw_state: "wrong_state",
      redirect_uri: "https://example.invalid/oauth/callback",
      authorization_code_present: true,
      now: new Date("2026-06-18T00:01:00.000Z")
    }).safe_reason_codes).toContain("state_hash_mismatch");
    expect(validateYouTubeOAuthCallback({
      record: issued.record,
      raw_state: issued.raw_state_once,
      redirect_uri: "https://example.invalid/oauth/callback",
      authorization_code_present: true,
      now: new Date("2026-06-18T00:20:00.000Z")
    }).safe_reason_codes).toContain("state_expired");
    expect(validateYouTubeOAuthCallback({
      record: { ...issued.record, access_token_stored: true } as unknown as typeof issued.record,
      raw_state: issued.raw_state_once,
      redirect_uri: "https://example.invalid/oauth/callback",
      authorization_code_present: true,
      now: new Date("2026-06-18T00:01:00.000Z")
    }).safe_reason_codes).toContain("raw_oauth_material_stored");
  });

  it("blocks exchange and refresh while only planning revocation", () => {
    expect(planYouTubeOAuthTokenExchange()).toMatchObject({ lifecycle_status: "exchange_blocked", network_call_allowed: false, token_exchange_allowed: false });
    expect(planYouTubeOAuthRefresh()).toMatchObject({ lifecycle_status: "refresh_blocked", network_call_allowed: false, refresh_allowed: false });
    expect(planYouTubeOAuthRevocation()).toMatchObject({ lifecycle_status: "revocation_planned", revocation_executed: false });
  });

  it("committed OAuth lifecycle evidence preserves no-network and no-token boundaries", () => {
    const evidence = readCodexEvidence("p1-youtube-oauth-lifecycle-contract.json");

    expect(evidence.oauthLifecycleContractStatus).toBe("implemented");
    expect(evidence.stateHashOnlyStatus).toBe("pass");
    expect(evidence.tokenExchangeAllowed).toBe(false);
    expect(evidence.refreshAllowed).toBe(false);
    expect(evidence.revocationExecuted).toBe(false);
    expect(evidence.networkCallAllowed).toBe(false);
    expect(evidence.rawTokenStored).toBe(false);
    expect(evidence.packageJsonChanged).toBe(false);
    expect(evidence.pnpmLockChanged).toBe(false);
  });
});
