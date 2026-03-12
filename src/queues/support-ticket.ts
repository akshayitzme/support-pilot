import { Queue, QueueEvents } from "bullmq";
import { BULLMQ_CONF } from "../config/bullmq.js";

export const QUEUE_NAME = "support-tickets";

export const ticketQueue = new Queue(QUEUE_NAME, BULLMQ_CONF);
const queueEvents = new QueueEvents(QUEUE_NAME, BULLMQ_CONF);

queueEvents.on("waiting", ({ jobId }) => {
  console.log(`A job with ID ${jobId} is waiting`);
});

queueEvents.on("active", ({ jobId, prev }) => {
  console.log(`Job ${jobId} is now active; previous status was ${prev}`);
});

queueEvents.on("completed", ({ jobId, returnvalue }) => {
  console.log(`${jobId} has completed and returned ${returnvalue}`);
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  console.log(`${jobId} has failed with reason ${failedReason}`);
});
