import { detectIntent, diagnoseIssue, formatResponse } from "../ai/helper";
import type { TicketJobData } from "../types/queue";
import { linearClient } from "./linear-client";

export const processTicket = async (job: TicketJobData): Promise<void> => {
  const { issueId, title, description } = job;
  console.log("job", job);

  console.info(`Processing ticket`, { issueId, description });

  const intentResult = await detectIntent(title, description);

  console.debug(`Intent detected for ${issueId}`, {
    intent: intentResult.intent,
    confidence: intentResult.confidence,
  });

  const diagnosis = await diagnoseIssue(description, intentResult.intent);

  const formatted = formatResponse({
    intent: intentResult.intent,
    diagnosis,
    includeDisclaimer: true,
  });

  const success = await linearClient.postLinearComment(issueId, formatted);

  if (success) {
    console.info(`Comment posted to ${issueId}`);
  } else {
    console.warn(`Failed to post comment to ${issueId}`);
  }
};
