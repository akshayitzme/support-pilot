import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (fastify, _options) => {
  fastify.get("/health", async (_request, reply) => {
    try {
      return reply.send({
        status: "OK",
        updatedAt: new Date().toISOString(),
      });
    } catch (_err) {
      return reply.code(503).send({
        status: "ERROR",
        updatedAt: new Date().toISOString(),
      });
    }
  });
};
