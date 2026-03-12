export const REDIS_CONF = {
  URL: process.env.REDIS_URL ?? "localhost",
  options: {
    retryStrategy(times: number) {
      const delay = Math.min(times * 50, 2000);
      console.warn(`Redis retry attempt ${times}, delay: ${delay}ms`);
      return delay;
    },
    enableOfflineQueue: true,
    maxRetriesPerRequest: null,
  },
};
