import {
  InMemoryManualGateRegistry,
  validateManualGateApproval,
  type ManualGateApproval
} from "../manual-gates.js";

export interface ManualGatePersistentRepository {
  createRequestedGate(gate: ManualGateApproval): ManualGateApproval;
  approveGate(gateId: string, approvedByRole: string, approvalTimestamp: string): ManualGateApproval;
  getGate(gateId: string): ManualGateApproval | undefined;
  markUsed(gateId: string, usedAt: string): ManualGateApproval;
  listGates(): ManualGateApproval[];
}

export class InMemoryManualGatePersistentRepository implements ManualGatePersistentRepository {
  private readonly registry = new InMemoryManualGateRegistry();
  private readonly gates = new Map<string, ManualGateApproval>();
  private readonly usedAt = new Map<string, string>();

  createRequestedGate(gate: ManualGateApproval) {
    const created = this.registry.createRequestedGate(gate);
    this.gates.set(created.gate_id, created);
    return created;
  }

  approveGate(gateId: string, approvedByRole: string, approvalTimestamp: string) {
    const approved = this.registry.approveGate(gateId, approvedByRole, approvalTimestamp);
    this.gates.set(gateId, approved);
    return approved;
  }

  getGate(gateId: string) {
    return this.registry.getGate(gateId);
  }

  markUsed(gateId: string, usedAt: string) {
    if (this.usedAt.has(gateId)) throw new Error("manual gate has already been used");
    const gate = this.registry.markUsed(gateId);
    this.usedAt.set(gateId, usedAt);
    const used = validateManualGateApproval(gate);
    this.gates.set(gateId, used);
    return used;
  }

  listGates() {
    return [...this.gates.values()];
  }
}
