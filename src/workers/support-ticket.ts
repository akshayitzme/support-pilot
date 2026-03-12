import { type ConnectionOptions, Worker } from "bullmq";
import { QUEUE_NAME } from "../queues/support-ticket";
import { redis } from "../services/redis-client";
import { processTicket } from "../services/ticket-processor";

export const ticketQueueWorker = new Worker(
  QUEUE_NAME,
  async (job) => {
    await processTicket(job.data);
  },
  { connection: redis as ConnectionOptions, concurrency: 2 },
);

ticketQueueWorker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

ticketQueueWorker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});
