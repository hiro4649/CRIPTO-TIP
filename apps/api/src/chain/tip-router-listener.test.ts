import { describe, expect, it } from "vitest";
import { encodeAbiParameters, encodeEventTopics } from "viem";
import { createIdempotencyKeyForChainLog } from "@cripto-tip/shared";
import { InMemoryRepository } from "../repositories/in-memory.js";
import { MockEvmRpcProvider, type EvmLog } from "./evm-rpc.js";
import { TIP_SENT_EVENT, TipRouterChainListener, decodeTipSentLog } from "./tip-router-listener.js";

const contractAddress = "0x2222222222222222222222222222222222222222" as const;
const tokenAddress = "0x3333333333333333333333333333333333333333" as const;
const fromAddress = "0x1111111111111111111111111111111111111111" as const;
const streamId = `0x${"a".repeat(64)}` as const;
const characterId = `0x${"b".repeat(64)}` as const;
const messageHash = `0x${"c".repeat(64)}` as const;
const clientTipId = `0x${"d".repeat(64)}` as const;

function encodedTipLog(overrides: Partial<EvmLog> = {}): EvmLog {
  const topics = encodeEventTopics({ abi: [TIP_SENT_EVENT], eventName: "TipSent", args: { from: fromAddress, streamId, characterId } });
  const data = encodeAbiParameters(
    [
      { name: "amount", type: "uint256" },
      { name: "messageHash", type: "bytes32" },
      { name: "clientTipId", type: "bytes32" },
      { name: "token", type: "address" },
      { name: "blockTimestamp", type: "uint256" }
    ],
    [100n, messageHash, clientTipId, tokenAddress, 1_800_000_000n]
  );
  return {
    address: contractAddress,
    blockNumber: 10,
    blockHash: `0x${"1".repeat(64)}`,
    transactionHash: `0x${"2".repeat(64)}`,
    logIndex: 1,
    topics: topics as EvmLog["topics"],
    data,
    ...overrides
  };
}

function listener(repo = new InMemoryRepository(), provider = new MockEvmRpcProvider()) {
  return new TipRouterChainListener(repo, provider, {
    chainId: 31337,
    contractAddress,
    confirmationBlocks: 3,
    startBlock: 1,
    workerId: "chain-worker",
    now: () => new Date("2026-06-03T00:00:00.000Z")
  });
}

describe("TipRouterChainListener", () => {
  it("decodes TipSent logs without user personal text fields", () => {
    const decoded = decodeTipSentLog(encodedTipLog());
    expect(decoded.from).toBe(fromAddress);
    expect(decoded.streamId).toBe(streamId);
    expect(decoded.characterId).toBe(characterId);
    expect(decoded.amount).toBe(100n);
    const serialized = JSON.stringify(decoded, (_key, value) => typeof value === "bigint" ? value.toString() : value);
    expect(serialized).not.toContain("Akira");
    expect(serialized).not.toContain("thanks");
    expect(serialized).not.toContain("youtube");
  });

  it("keeps duplicate logs idempotent", async () => {
    const repo = new InMemoryRepository();
    const chain = listener(repo);
    const log = encodedTipLog();
    expect(await chain.processLog(log)).toBe(true);
    expect(await chain.processLog(log)).toBe(false);
    expect(repo.tipTransactions.size).toBe(1);
    expect([...repo.outboxEvents.values()].filter((job) => job.job_type === "chain.tip.detected")).toHaveLength(1);
  });

  it("catches up with eth_getLogs and persists the block cursor", async () => {
    const repo = new InMemoryRepository();
    const provider = new MockEvmRpcProvider();
    provider.latestBlockNumber = 12;
    provider.blockHashes.set(12, `0x${"9".repeat(64)}`);
    provider.logs = [encodedTipLog()];
    const result = await listener(repo, provider).catchUp();
    expect(result.detected).toBe(1);
    expect(await repo.getChainCursor({ chain_id: 31337, contract_address: contractAddress })).toEqual(expect.objectContaining({ last_scanned_block: 12, last_finalized_block: 9 }));
  });

  it("records logs from WebSocket subscription boundary", async () => {
    const repo = new InMemoryRepository();
    const provider = new MockEvmRpcProvider();
    const chain = listener(repo, provider);
    const subscription = await chain.subscribe();
    provider.emit(encodedTipLog());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(repo.tipTransactions.size).toBe(1);
    await subscription.close();
  });

  it("waits for the confirmation window before enqueueing support.normalize", async () => {
    const repo = new InMemoryRepository();
    const provider = new MockEvmRpcProvider();
    const chain = listener(repo, provider);
    const log = encodedTipLog();
    provider.blockHashes.set(10, log.blockHash);
    await chain.processLog(log);
    await chain.processConfirmations(11);
    expect([...repo.outboxEvents.values()].some((job) => job.job_type === "support.normalize")).toBe(false);
    await chain.processConfirmations(12);
    const tx = await repo.findTipTransactionByChainLog({ chain_id: 31337, contract_address: contractAddress, tx_hash: log.transactionHash, log_index: log.logIndex });
    expect(tx?.status).toBe("confirmed");
    expect([...repo.outboxEvents.values()].filter((job) => job.job_type === "support.normalize")).toHaveLength(1);
  });

  it("moves reorged transactions out of the confirmation path", async () => {
    const repo = new InMemoryRepository();
    const provider = new MockEvmRpcProvider();
    const chain = listener(repo, provider);
    const log = encodedTipLog();
    await chain.processLog(log);
    provider.blockHashes.set(10, `0x${"3".repeat(64)}`);
    const result = await chain.processConfirmations(12);
    const tx = await repo.findTipTransactionByChainLog({ chain_id: 31337, contract_address: contractAddress, tx_hash: log.transactionHash, log_index: log.logIndex });
    expect(result.reorged).toBe(1);
    expect(tx?.status).toBe("reorged");
    expect([...repo.outboxEvents.values()].some((job) => job.job_type === "support.normalize")).toBe(false);
  });

  it("returns RPC errors to the worker retry/backoff boundary", async () => {
    const repo = new InMemoryRepository();
    const provider = new MockEvmRpcProvider();
    provider.getLogs = async () => {
      throw new Error("rpc unavailable");
    };
    provider.latestBlockNumber = 10;
    await expect(listener(repo, provider).catchUp()).rejects.toThrow("rpc unavailable");
  });

  it("uses chain log idempotency key for confirmed support.normalize jobs", async () => {
    const repo = new InMemoryRepository();
    const provider = new MockEvmRpcProvider();
    const chain = listener(repo, provider);
    const log = encodedTipLog();
    provider.blockHashes.set(10, log.blockHash);
    await chain.processLog(log);
    await chain.processConfirmations(12);
    await chain.processConfirmations(13);
    const jobs = [...repo.outboxEvents.values()].filter((job) => job.job_type === "support.normalize");
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.idempotency_key).toBe(`support.normalize:${createIdempotencyKeyForChainLog({ chain_id: 31337, contract_address: contractAddress, tx_hash: log.transactionHash, log_index: log.logIndex })}`);
  });
});
