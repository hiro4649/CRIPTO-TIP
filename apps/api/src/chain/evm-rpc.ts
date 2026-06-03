export type EvmLog = {
  address: string;
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
  logIndex: number;
  topics: [`0x${string}`, ...`0x${string}`[]];
  data: `0x${string}`;
  removed?: boolean;
};

export type GetLogsInput = {
  address: string;
  fromBlock: number;
  toBlock: number;
  topics?: `0x${string}`[];
};

export type LogSubscription = {
  close(): Promise<void> | void;
};

export interface EvmRpcProvider {
  getLatestBlockNumber(): Promise<number>;
  getBlockHash(blockNumber: number): Promise<string | undefined>;
  getLogs(input: GetLogsInput): Promise<EvmLog[]>;
  subscribeToLogs?(input: Omit<GetLogsInput, "fromBlock" | "toBlock">, onLog: (log: EvmLog) => void, onError: (error: unknown) => void): Promise<LogSubscription>;
}

export class MockEvmRpcProvider implements EvmRpcProvider {
  latestBlockNumber = 0;
  logs: EvmLog[] = [];
  blockHashes = new Map<number, string>();
  subscriptions: Array<{ input: Omit<GetLogsInput, "fromBlock" | "toBlock">; onLog: (log: EvmLog) => void; onError: (error: unknown) => void }> = [];

  async getLatestBlockNumber() {
    return this.latestBlockNumber;
  }

  async getBlockHash(blockNumber: number) {
    return this.blockHashes.get(blockNumber);
  }

  async getLogs(input: GetLogsInput) {
    return this.logs.filter((log) =>
      log.address.toLowerCase() === input.address.toLowerCase() &&
      log.blockNumber >= input.fromBlock &&
      log.blockNumber <= input.toBlock &&
      (!input.topics?.[0] || log.topics[0] === input.topics[0])
    );
  }

  async subscribeToLogs(input: Omit<GetLogsInput, "fromBlock" | "toBlock">, onLog: (log: EvmLog) => void, onError: (error: unknown) => void) {
    const subscription = { input, onLog, onError };
    this.subscriptions.push(subscription);
    return {
      close: () => {
        this.subscriptions = this.subscriptions.filter((item) => item !== subscription);
      }
    };
  }

  emit(log: EvmLog) {
    for (const subscription of this.subscriptions) {
      if (log.address.toLowerCase() !== subscription.input.address.toLowerCase()) continue;
      if (subscription.input.topics?.[0] && log.topics[0] !== subscription.input.topics[0]) continue;
      subscription.onLog(log);
    }
  }

  emitError(error: unknown) {
    for (const subscription of this.subscriptions) subscription.onError(error);
  }
}
