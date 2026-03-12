import cron from "node-cron";
import { LINEAR_POLL_CONF } from "../config/linear-poll";
import { pollAndEnqueueTickets } from "../jobs/poll-worker";
import { initializeKnowledgeBase } from "../services/knowledge-base";
import { ticketQueueWorker } from "./support-ticket";

export const initWorker = async () => {
  console.info("Loading knowledge base");

  await initializeKnowledgeBase("./docs/kb");

  console.info("BullMQ worker listening for jobs");

  const pollIntervalSec = Math.round(LINEAR_POLL_CONF.POLL_INTERVAL_MS / 1000);
  const cronExpression = `*/${pollIntervalSec} * * * * *`;

  cron.schedule(cronExpression, async () => {
    await pollAndEnqueueTickets();
  });

  console.info(`Poller scheduled: every ${pollIntervalSec}s`);

  return { ticketQueueWorker, cron };
};
