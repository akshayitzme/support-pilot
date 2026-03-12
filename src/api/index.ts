import type { FastifyPluginAsync } from "fastify";
import { healthRoutes } from "./health";

export const apiPlugins: FastifyPluginAsync[] = [healthRoutes];
