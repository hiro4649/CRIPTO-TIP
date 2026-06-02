import type { CriptoTipRepository, OutboxEvent } from "../repositories/types.js";

export type OutboxHandler = (job: OutboxEvent) => Promise<void>;

export async function processOutboxBatch(args: { repository: CriptoTipRepository; workerId: string; limit: number; handler: OutboxHandler; now?: Date }) {
  const jobs = await args.repository.claimOutboxJobs(args.workerId, args.limit, args.now);
  for (const job of jobs) {
    try {
      await args.handler(job);
      await args.repository.completeOutboxJob(job.id);
    } catch (error) {
      await args.repository.failOutboxJob(job.id, error instanceof Error ? error.message : String(error), args.now);
    }
  }
  return jobs.length;
}
