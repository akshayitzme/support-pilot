import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import { ticketQueue } from "../queues/support-ticket";

const serverAdapter = new FastifyAdapter();

createBullBoard({
  queues: [new BullMQAdapter(ticketQueue)],
  serverAdapter,
});

export const BULL_BOARD_CONF = {
  plugin: serverAdapter.registerPlugin(),
  options: {
    prefix: "/bullmq",
  },
};
