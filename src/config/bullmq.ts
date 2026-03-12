import type { QueueOptions, RedisClient } from "bullmq";
import { redis } from "../services/redis-client";

export const BULLMQ_CONF: QueueOptions = {
  connection: redis as unknown as RedisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
};
