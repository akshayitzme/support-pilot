import type { DiagnosisResult, TicketIntent } from "./ai";
import type { LinearState } from "./linear";

export interface TicketJobData {
  identifier: string;
  issueId: string;
  title: string;
  description: string;
  team?: string;
  createdAt: Date;
  state: LinearState;
}
