import {
  InMemoryManualGateRegistry,
  validateManualGateApproval,
  type ManualGateApproval
} from "../manual-gates.js";

export type ManualGatePersistentRecord = ManualGateApproval & {
  used_at?: string | undefined;
};

export interface ManualGatePersistentRepository {
  createRequestedGate(gate: ManualGateApproval): ManualGatePersistentRecord;
  approveGate(gateId: string, approvedByRole: string, approvalTimestamp: string): ManualGatePersistentRecord;
  getGate(gateId: string): ManualGatePersistentRecord | undefined;
  markUsed(gateId: string, usedAt: string): ManualGatePersistentRecord;
  listGates(): ManualGatePersistentRecord[];
}

export class InMemoryManualGatePersistentRepository implements ManualGatePersistentRepository {
  private readonly registry = new InMemoryManualGateRegistry();
  private readonly gates = new Map<string, ManualGatePersistentRecord>();

  createRequestedGate(gate: ManualGateApproval) {
    if (this.gates.has(gate.gate_id)) throw new Error("manual gate id already exists");
    const created = this.registry.createRequestedGate(gate);
    this.gates.set(created.gate_id, created);
    return created;
  }

  approveGate(gateId: string, approvedByRole: string, approvalTimestamp: string) {
    const current = this.requirePersistentGate(gateId);
    if (!["requested", "not_requested"].includes(current.status)) {
      throw new Error("manual gate cannot be approved from current status");
    }
    const approved = this.registry.approveGate(gateId, approvedByRole, approvalTimestamp);
    this.gates.set(gateId, approved);
    return approved;
  }

  getGate(gateId: string) {
    return this.gates.get(gateId);
  }

  markUsed(gateId: string, usedAt: string) {
    const current = this.requirePersistentGate(gateId);
    if (current.status === "used") throw new Error("manual gate has already been used");
    if (current.status !== "approved") throw new Error("manual gate must be approved before use");
    const gate = this.registry.markUsed(gateId);
    const used = { ...validateManualGateApproval(gate), used_at: usedAt };
    this.gates.set(gateId, used);
    return used;
  }

  listGates() {
    return [...this.gates.values()];
  }

  private requirePersistentGate(gateId: string) {
    const gate = this.gates.get(gateId);
    if (!gate) throw new Error("manual gate not found");
    return gate;
  }
}
