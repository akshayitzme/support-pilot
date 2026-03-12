export const FASTIFY_CONF = {
  logger: {
    level: process.env.NODE_ENV === "development" ? "debug" : "info",
  },
};
