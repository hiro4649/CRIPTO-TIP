import { describe, expect, it } from "vitest";
import { parseManualGateRow, parseProviderJobRow } from "./postgres-provider-apply-row-parsers.js";

const sha = "1234567890abcdef1234567890abcdef12345678";

describe("postgres provider apply row parsers", () => {
  it("parseManualGateRow rejects missing id", () => {
    expect(() => parseManualGateRow({ ...manualGateRow(), id: undefined })).toThrow(/id is required/);
  });

  it("parseManualGateRow rejects wrong gate_type", () => {
    expect(() => parseManualGateRow({ ...manualGateRow(), gate_type: "invalid_operation" })).toThrow(/gate_type is invalid|manual gate/i);
  });

  it("parseManualGateRow rejects invalid target_commit_sha", () => {
    expect(() => parseManualGateRow({ ...manualGateRow(), target_commit_sha: "not-a-sha" })).toThrow(/target_commit_sha/);
  });

  it("parseManualGateRow rejects private URL in target_environment", () => {
    expect(() => parseManualGateRow({ ...manualGateRow(), target_environment: "https://private.example.invalid" })).toThrow(/unsafe/);
  });

  it("parseManualGateRow rejects wallet address in id", () => {
    expect(() => parseManualGateRow({ ...manualGateRow(), id: "0x1234567890abcdef1234567890abcdef12345678" })).toThrow(/unsafe/);
  });

  it("parseManualGateRow accepts used_at null", () => {
    expect(parseManualGateRow({ ...manualGateRow(), used_at: null }).used_at).toBeNull();
  });

  it("parseProviderJobRow rejects missing operation", () => {
    expect(() => parseProviderJobRow({ ...providerJobRow(), operation: undefined })).toThrow(/operation is required/);
  });

  it("parseProviderJobRow rejects wrong operation", () => {
    expect(() => parseProviderJobRow({ ...providerJobRow(), operation: "invalid_operation" })).toThrow(/operation is invalid|manual gate/i);
  });

  it("parseProviderJobRow rejects invalid status", () => {
    expect(() => parseProviderJobRow({ ...providerJobRow(), status: "mystery" })).toThrow(/status is invalid/);
  });

  it("parseProviderJobRow rejects missing rollback_plan_ref", () => {
    expect(() => parseProviderJobRow({ ...providerJobRow(), rollback_plan_ref: "" })).toThrow(/rollback_plan_ref is required/);
  });

  it("parseProviderJobRow rejects unsafe rollback_plan_ref private URL", () => {
    expect(() => parseProviderJobRow({ ...providerJobRow(), rollback_plan_ref: "https://private.example.invalid" })).toThrow(/unsafe/);
  });

  it("parseProviderJobRow rejects unsafe operator_runbook_ref token-like value", () => {
    expect(() => parseProviderJobRow({ ...providerJobRow(), operator_runbook_ref: "sk-test-token" })).toThrow(/unsafe/);
  });

  it("parseProviderJobRow rejects non-boolean state flags", () => {
    expect(() => parseProviderJobRow({ ...providerJobRow(), manual_gate_mark_used_succeeded: "false" })).toThrow(/boolean/);
  });

  it("parseProviderJobRow accepts valid running job row", () => {
    expect(parseProviderJobRow(providerJobRow()).status).toBe("running");
  });

  it("parseProviderJobRow accepts valid failed compensation job row", () => {
    expect(parseProviderJobRow(providerJobRow({
      status: "failed",
      external_provider_apply_started: true,
      manual_gate_mark_used_attempted: true,
      manual_gate_mark_used_succeeded: false,
      compensation_required: true
    })).compensation_required).toBe(true);
  });

  it("parseProviderJobRow rejects applied job row unless all applied invariants are true", () => {
    expect(() => parseProviderJobRow(providerJobRow({
      status: "applied",
      external_provider_apply_started: true,
      manual_gate_mark_used_attempted: true,
      manual_gate_mark_used_succeeded: false,
      compensation_required: false
    }))).toThrow(/applied invariant/);
  });

  it("parseProviderJobRow rejects compensation_required unless failed invariant is true", () => {
    expect(() => parseProviderJobRow(providerJobRow({
      status: "running",
      external_provider_apply_started: true,
      manual_gate_mark_used_attempted: true,
      manual_gate_mark_used_succeeded: false,
      compensation_required: true
    }))).toThrow(/compensation invariant/);
  });

  it("parseProviderJobRow rejects raw provider response fields", () => {
    expect(() => parseProviderJobRow({ ...providerJobRow(), raw_provider_response: "forbidden" })).toThrow(/not allowed/);
  });
});

function manualGateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "gate-contract-hardening-1",
    gate_type: "provider_specific_deployment_apply",
    status: "approved",
    target_environment: "staging",
    target_commit_sha: sha,
    expires_at: "2026-06-10T00:00:00.000Z",
    used_at: null,
    ...overrides
  };
}

function providerJobRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "job-contract-hardening-1",
    operation: "provider_specific_deployment_apply",
    status: "running",
    manual_gate_id: "gate-contract-hardening-1",
    target_environment: "staging",
    target_commit_sha: sha,
    external_provider_apply_started: false,
    manual_gate_mark_used_attempted: false,
    manual_gate_mark_used_succeeded: false,
    compensation_required: false,
    rollback_plan_ref: "docs/RUNBOOK.md#rollback",
    operator_runbook_ref: "docs/RUNBOOK.md#provider-apply",
    ...overrides
  };
}
