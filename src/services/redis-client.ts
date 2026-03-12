import Redis from "ioredis";
import { REDIS_CONF } from "../config/redis";

export const redis = new Redis(REDIS_CONF.URL, REDIS_CONF.options);

redis.on("connect", () => console.info("🔌 Redis connected"));
redis.on("ready", () => console.info("✅ Redis ready"));
redis.on("error", (err) => console.error({ err }, "❌ Redis error"));
redis.on("close", () => console.warn("🔌 Redis connection closed"));

const closeRedis = async () => {
  console.info("🔌 Closing Redis connection...");
  await redis.quit();
};

process.on("SIGINT", closeRedis);
process.on("SIGTERM", closeRedis);
