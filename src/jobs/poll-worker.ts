import { LINEAR_POLL_CONF } from "../config/linear-poll";
import { ticketQueue } from "../queues/support-ticket";
import { linearClient } from "../services/linear-client";
import type { TicketJobData } from "../types/queue";

export const pollAndEnqueueTickets = async () => {
  console.info("Starting Linear poll cycle");

  try {
    const createdAfter = new Date(Date.now() - LINEAR_POLL_CONF.POLL_INTERVAL_MS - 5000);

    const issues = await linearClient.fetchRecentIssues({ createdAfter });

    console.log("issues", JSON.stringify(issues));
    console.info(`Found ${issues.length} recent issues`);

    for (const issue of issues) {
      const existingJob = await ticketQueue.getJob(`ticket-${issue.identifier}`);
      if (existingJob) {
        console.debug(`Skipping already queued: ${issue.identifier}`);
        continue;
      }

      const job: TicketJobData = {
        identifier: issue.identifier,
        issueId: issue.id,
        title: issue.title,
        description: issue.description ?? "",
        createdAt: new Date(issue.createdAt),
        state: issue.state,
      };

      await ticketQueue.add("process-ticket", job, {
        jobId: `ticket-${issue.identifier}`,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      });

      console.info(`Queued ${issue.identifier} for analysis`);
    }
  } catch (error) {
    console.error("Poller cycle failed", { error });
  }
};
