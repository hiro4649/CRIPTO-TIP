import type { CriptoTipRepository, OutboxEvent } from "../repositories/types.js";

export type OutboxHandler = (job: OutboxEvent) => Promise<void>;

export class TerminalOutboxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TerminalOutboxError";
  }
}

export async function processOutboxBatch(args: { repository: CriptoTipRepository; workerId: string; limit: number; handler: OutboxHandler; now?: Date }) {
  const jobs = await args.repository.claimOutboxJobs(args.workerId, args.limit, args.now);
  for (const job of jobs) {
    try {
      await args.handler(job);
      await args.repository.completeOutboxJob(job.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof TerminalOutboxError) await args.repository.moveToDeadLetter(job.id, message, args.now);
      else await args.repository.failOutboxJob(job.id, message, args.now);
    }
  }
  return jobs.length;
}

export async function reclaimStaleOutboxLocks(args: { repository: CriptoTipRepository; workerId: string; staleLockMs: number; limit: number; now?: Date }) {
  const now = args.now ?? new Date();
  const staleBefore = new Date(now.getTime() - args.staleLockMs);
  return args.repository.reclaimStaleOutboxJobs(args.workerId, staleBefore, args.limit, now);
}
