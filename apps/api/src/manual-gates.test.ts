import { describe, expect, it } from "vitest";
import {
  InMemoryManualGateRegistry,
  assertManualGateApproval,
  validateManualGateApproval
} from "./manual-gates.js";
import { makeManualGate, targetCommitSha } from "./manual-gates.test-support.js";

describe("manual gate registry", () => {
  it("creates a requested gate and approves it with project-owner role", () => {
    const registry = new InMemoryManualGateRegistry();
    const requested = registry.createRequestedGate(makeManualGate("dashboard_apply"));
    expect(requested.status).toBe("requested");
    const approved = registry.approveGate(requested.gate_id, "project-owner", "2026-06-05T01:00:00.000Z");
    expect(approved.status).toBe("approved");
    expect(approved.rollback_plan_ref).toBe("docs/RUNBOOK.md#rollback");
  });

  it("rejects missing target_commit_sha", () => {
    expect(() => validateManualGateApproval(makeManualGate("external_alert_apply", { target_commit_sha: "" }))).toThrow(/target_commit_sha/);
  });

  it("rejects secret values in secret_source_ref and evidence", () => {
    expect(() => validateManualGateApproval(makeManualGate("provider_secret_rotation", { secret_source_ref: "TOKEN=unsafe-value" }))).toThrow(/secret_source_ref/);
    expect(() => validateManualGateApproval(makeManualGate("provider_secret_rotation", { notes: ["Bearer", "abc"].join(" ") }))).toThrow(/unsafe secret/);
  });

  it("rejects expired gates and wrong target commits", () => {
    const expired = makeManualGate("youtube_live_soak", { expires_at: "2020-01-01T00:00:00.000Z" });
    expect(() => assertManualGateApproval(expired, { gateType: "youtube_live_soak", targetCommitSha, now: new Date("2026-01-01T00:00:00.000Z") })).toThrow(/expired/);
    expect(() => assertManualGateApproval(makeManualGate("youtube_live_soak"), { gateType: "youtube_live_soak", targetCommitSha: "abcdefabcdefabcdefabcdefabcdefabcdefabcd" })).toThrow(/target commit/);
  });

  it("rejects wrong gate type and unapproved status", () => {
    expect(() => assertManualGateApproval(makeManualGate("dashboard_apply"), { gateType: "external_alert_apply", targetCommitSha })).toThrow(/type/);
    expect(() => assertManualGateApproval(makeManualGate("dashboard_apply", { status: "requested" }), { gateType: "dashboard_apply", targetCommitSha })).toThrow(/not approved/);
  });

  it("cannot reuse a gate after it is marked used", () => {
    const registry = new InMemoryManualGateRegistry();
    registry.createRequestedGate(makeManualGate("external_alert_apply"));
    registry.approveGate("external_alert_apply-gate-1", "project-owner", "2026-06-05T01:00:00.000Z");
    registry.markUsed("external_alert_apply-gate-1");
    expect(() => registry.markUsed("external_alert_apply-gate-1")).toThrow(/already been used/);
  });
});
