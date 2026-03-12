require("dotenv").config();

import Fastify from "fastify";
import { apiPlugins } from "./api";
import { BULL_BOARD_CONF } from "./config/bull-board";
import { FASTIFY_CONF } from "./config/fastify";
import { initWorker } from "./workers";

const fastify = Fastify(FASTIFY_CONF);

if (process.env.NODE_ENV === "development") {
  fastify.register(BULL_BOARD_CONF.plugin, BULL_BOARD_CONF.options);
}

for (const plugin of apiPlugins) {
  await fastify.register(plugin, { prefix: "/api/v1/" });
}

fastify.listen({ port: Number(process.env.PORT || 8000) }, (err, _address) => {
  initWorker();
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
