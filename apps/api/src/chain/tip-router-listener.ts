import { createPublicId, createIdempotencyKeyForChainLog, type TipTransaction } from "@cripto-tip/shared";
import { decodeEventLog, parseAbiItem, toEventSelector } from "viem";
import type { CriptoTipRepository } from "../repositories/types.js";
import type { EvmLog, EvmRpcProvider, LogSubscription } from "./evm-rpc.js";

export const TIP_SENT_EVENT = parseAbiItem(
  "event TipSent(address indexed from, bytes32 indexed streamId, bytes32 indexed characterId, uint256 amount, bytes32 messageHash, bytes32 clientTipId, address token, uint256 blockTimestamp)"
);

export const TIP_SENT_TOPIC = toEventSelector(TIP_SENT_EVENT);

export type ChainListenerConfig = {
  chainId: number;
  contractAddress: `0x${string}`;
  confirmationBlocks: number;
  startBlock: number;
  workerId: string;
  now?: () => Date;
};

export type ChainListenerRunResult = {
  scanned_from: number;
  scanned_to: number;
  detected: number;
  confirmed: number;
  reorged: number;
};

export function decodeTipSentLog(log: EvmLog) {
  const decoded = decodeEventLog({
    abi: [TIP_SENT_EVENT],
    data: log.data,
    topics: log.topics,
    strict: true
  });
  if (decoded.eventName !== "TipSent") throw new Error("unexpected event");
  return decoded.args;
}

export class TipRouterChainListener {
  constructor(
    private readonly repository: CriptoTipRepository,
    private readonly provider: EvmRpcProvider,
    private readonly config: ChainListenerConfig
  ) {}

  async catchUp(): Promise<ChainListenerRunResult> {
    const latest = await this.provider.getLatestBlockNumber();
    const cursor = await this.repository.getChainCursor({ chain_id: this.config.chainId, contract_address: this.config.contractAddress });
    const fromBlock = Math.max(this.config.startBlock, (cursor?.last_scanned_block ?? this.config.startBlock - 1) + 1);
    if (fromBlock > latest) {
      const confirmation = await this.processConfirmations(latest);
      return { scanned_from: fromBlock, scanned_to: latest, detected: 0, ...confirmation };
    }
    const logs = await this.provider.getLogs({ address: this.config.contractAddress, fromBlock, toBlock: latest, topics: [TIP_SENT_TOPIC] });
    let detected = 0;
    for (const log of logs) {
      const created = await this.processLog(log);
      if (created) detected += 1;
    }
    const finalized = Math.max(0, latest - this.config.confirmationBlocks);
    const nextCursor = {
      id: cursor?.id ?? createPublicId("cursor"),
      chain_id: this.config.chainId,
      contract_address: this.config.contractAddress,
      last_scanned_block: latest,
      last_finalized_block: finalized,
      updated_at: this.nowIso()
    };
    const lastSeenBlockHash = await this.provider.getBlockHash(latest);
    await this.repository.saveChainCursor(lastSeenBlockHash ? { ...nextCursor, last_seen_block_hash: lastSeenBlockHash } : nextCursor);
    const confirmation = await this.processConfirmations(latest);
    return { scanned_from: fromBlock, scanned_to: latest, detected, ...confirmation };
  }

  async subscribe() {
    if (!this.provider.subscribeToLogs) throw new Error("rpc provider does not support log subscription");
    return this.provider.subscribeToLogs(
      { address: this.config.contractAddress, topics: [TIP_SENT_TOPIC] },
      (log) => {
        void this.processLog(log).catch(() => undefined);
      },
      () => undefined
    ) as Promise<LogSubscription>;
  }

  async processLog(log: EvmLog) {
    if (log.removed) {
      const existing = await this.repository.findTipTransactionByChainLog(this.keyFromLog(log));
      if (!existing) return false;
      await this.repository.updateTipTransactionByChainLog(existing, { status: "reorged" });
      return false;
    }
    const decoded = decodeTipSentLog(log);
    const transaction: TipTransaction = {
      id: createPublicId("tx"),
      chain_id: this.config.chainId,
      contract_address: this.config.contractAddress,
      token_address: decoded.token,
      tx_hash: log.transactionHash,
      log_index: log.logIndex,
      block_number: log.blockNumber,
      block_hash: log.blockHash,
      from_address: decoded.from,
      stream_id: decoded.streamId,
      character_id: decoded.characterId,
      amount_raw: decoded.amount.toString(),
      message_hash: decoded.messageHash,
      client_tip_id: decoded.clientTipId,
      status: "pending_confirmation",
      confirmations: 0,
      detected_at: this.nowIso()
    };
    const existing = await this.repository.findTipTransactionByChainLog(transaction);
    await this.repository.recordTipTransaction(transaction);
    if (!existing) {
      await this.repository.enqueueOutbox({
        id: createPublicId("job"),
        job_type: "chain.tip.detected",
        aggregate_type: "tip_transaction",
        aggregate_id: transaction.id,
        idempotency_key: `chain.tip.detected:${createIdempotencyKeyForChainLog(transaction)}`,
        payload_json: { chain_id: transaction.chain_id, contract_address: transaction.contract_address, tx_hash: transaction.tx_hash, log_index: transaction.log_index }
      });
    }
    return !existing;
  }

  async processConfirmations(latestBlock: number) {
    const pending = await this.repository.listPendingTipTransactions(this.config.chainId, this.config.contractAddress);
    let confirmed = 0;
    let reorged = 0;
    for (const tx of pending) {
      const canonicalHash = await this.provider.getBlockHash(tx.block_number);
      if (tx.block_hash && canonicalHash && canonicalHash !== tx.block_hash) {
        await this.repository.updateTipTransactionByChainLog(tx, { status: "reorged", confirmations: 0 });
        reorged += 1;
        continue;
      }
      const confirmations = Math.max(0, latestBlock - tx.block_number + 1);
      if (confirmations < this.config.confirmationBlocks) {
        await this.repository.updateTipTransactionByChainLog(tx, { status: "pending_confirmation", confirmations });
        continue;
      }
      const updated = await this.repository.updateTipTransactionByChainLog(tx, { status: "confirmed", confirmations, confirmed_at: this.nowIso() });
      if (!updated) continue;
      await this.repository.enqueueOutbox({
        id: createPublicId("job"),
        job_type: "support.normalize",
        aggregate_type: "tip_transaction",
        aggregate_id: updated.id,
        idempotency_key: `support.normalize:${createIdempotencyKeyForChainLog(updated)}`,
        payload_json: { chain_id: updated.chain_id, contract_address: updated.contract_address, tx_hash: updated.tx_hash, log_index: updated.log_index }
      });
      confirmed += 1;
    }
    return { confirmed, reorged };
  }

  private keyFromLog(log: EvmLog) {
    return { chain_id: this.config.chainId, contract_address: this.config.contractAddress, tx_hash: log.transactionHash, log_index: log.logIndex };
  }

  private nowIso() {
    return (this.config.now?.() ?? new Date()).toISOString();
  }
}
