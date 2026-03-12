import type { TOOL_NAMES } from "../ai/tools";

export type TicketIntent = "billing" | "api" | "bug" | "feature" | "unknown";

export interface DiagnosisResult {
  rootCause: string;
  proposedFix: string;
  confidence: number;
  steps: string[];
  requiresHumanReview: boolean;
  sources?: Array<{ title: string; relevance: number }>;
}

export interface FormatOptions {
  intent: TicketIntent;
  diagnosis: DiagnosisResult;
  includeDisclaimer?: boolean;
  toolCalls?: string[];
}
