import { generateObject, generateText, Output } from "ai";
import z from "zod";
import { AI_CONF } from "../config/ai";
import type { DiagnosisResult, FormatOptions, TicketIntent } from "../types/ai";
import { model } from "./index";
import { DIAGNOSIS_PROMPT, INTENT_CLASSIFICATION_PROMPT, TOOL_USAGE_INSTRUCTIONS } from "./prompts";
import { TOOL_NAMES, tools } from "./tools";

type KnowledgeDoc = {
  title: string;
  content: string;
  relevance?: number;
  score?: number;
};

type IntentDetection = {
  intent: TicketIntent;
  confidence: number;
  reasoning: string;
};

const diagnosisSchema = z.object({
  rootCause: z.string(),
  proposedFix: z.string(),
  confidence: z.number().min(0).max(100),
  steps: z.array(z.string()),
  requiresHumanReview: z.boolean(),
  sources: z
    .array(
      z.object({
        title: z.string(),
        relevance: z.number().min(0).max(100),
      }),
    )
    .optional(),
});

const injectPromptVars = (template: string, vars: Record<string, string>): string => {
  return template.replace(/\{(\w+)\}/g, (_match: string, key: string) => {
    const value = vars[key];
    if (value !== undefined) {
      return value;
    }
    return `{${key}}`;
  });
};

const fallbackDiagnosis = (): DiagnosisResult => {
  return {
    rootCause: "Unable to determine root cause due to system error",
    proposedFix: "Please escalate to a human engineer for manual review",
    confidence: 0,
    steps: ["Error occurred during AI analysis"],
    requiresHumanReview: true,
  };
};

const extractDocs = (toolResults: unknown[]): KnowledgeDoc[] => {
  const docs: KnowledgeDoc[] = [];

  for (const resultItem of toolResults) {
    const item = resultItem as {
      toolName?: string;
      result?: { error?: unknown; value?: unknown } | unknown;
    };

    if (item.toolName !== TOOL_NAMES.SEARCH_KNOWLEDGE_BASE) {
      continue;
    }

    const result = item.result as { error?: unknown; value?: unknown } | undefined;

    if (result && typeof result === "object" && "error" in result && result.error) {
      continue;
    }

    const output =
      result && typeof result === "object" && "value" in result
        ? (result.value as unknown)
        : result;

    if (Array.isArray(output)) {
      for (const entry of output) {
        const doc = entry as KnowledgeDoc;
        if (doc.title) {
          docs.push(doc);
        }
      }
    } else if (output && typeof output === "object") {
      const doc = output as KnowledgeDoc;
      if (doc.title) {
        docs.push(doc);
      }
    }
  }

  return docs;
};

const buildContextBlock = (docs: KnowledgeDoc[]): string => {
  if (docs.length === 0) {
    return "No relevant documentation found.";
  }

  const sections: string[] = [];
  sections.push("## Retrieved Documentation (USE AS PRIMARY SOURCE)");

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    sections.push(`### ${i + 1}. ${doc.title}`);
    sections.push(doc.content);
    sections.push("");
  }

  return sections.join("\n").trim();
};

const normalizeSources = (docs: KnowledgeDoc[]): { title: string; relevance: number }[] => {
  const sources: { title: string; relevance: number }[] = [];

  for (const doc of docs.slice(0, 5)) {
    let relevance = 50;

    if (typeof doc.relevance === "number") {
      relevance = Math.round(doc.relevance);
    } else if (typeof doc.score === "number") {
      relevance = Math.round(doc.score);
    }

    sources.push({
      title: doc.title,
      relevance,
    });
  }

  return sources;
};

export const diagnoseIssue = async (
  ticketDescription: string,
  intent: TicketIntent,
): Promise<DiagnosisResult> => {
  try {
    const contextResult = await generateText({
      model,
      tools,
      toolChoice: "auto",
      temperature: AI_CONF.temperature,
      messages: [
        {
          role: "system",
          content: TOOL_USAGE_INSTRUCTIONS,
        },
        {
          role: "user",
          content:
            `Intent: ${intent}\n` +
            `Ticket: ${ticketDescription}\n\n` +
            `Call searchKnowledgeBase with a query like "401 unauthorized api" if the ticket mentions technical terms.`,
        },
      ],
    });

    const toolResults = (contextResult.toolResults ?? []) as unknown[];
    const docs = extractDocs(toolResults);
    const contextBlock = buildContextBlock(docs);

    const synthesisPrompt = injectPromptVars(DIAGNOSIS_PROMPT, {
      intent,
      ticket: ticketDescription,
      context: contextBlock,
    });

    const result = await generateObject({
      model,
      schema: diagnosisSchema,
      prompt: synthesisPrompt,
      temperature: AI_CONF.temperature,
    });

    const object = result.object;

    if (!object) {
      return fallbackDiagnosis();
    }

    if (docs.length > 0 && object.confidence < 80) {
      object.confidence = 85;
      object.requiresHumanReview = false;
    }

    if ((!object.sources || object.sources.length === 0) && docs.length > 0) {
      object.sources = normalizeSources(docs);
    }

    return object;
  } catch {
    return fallbackDiagnosis();
  }
};

export const detectIntent = async (
  title: string,
  description: string,
): Promise<IntentDetection> => {
  const intentSchema = z.object({
    intent: z.enum(["billing", "api", "bug", "feature", "unknown"]),
    confidence: z.number().min(0).max(100),
    reasoning: z.string(),
  });

  try {
    const result = await generateText({
      model,
      output: Output.object({
        schema: intentSchema,
      }),
      prompt:
        `${INTENT_CLASSIFICATION_PROMPT}\n` +
        `## Ticket to Classify\n` +
        `Title: "${title}"\n` +
        `Description: "${description}"`,
    });

    return result.output as IntentDetection;
  } catch {
    return {
      intent: "unknown",
      confidence: 0,
      reasoning: "Model failed to classify intent",
    };
  }
};

const formatIntent = (intent: TicketIntent): string => {
  const labels: Record<TicketIntent, string> = {
    billing: "Billing & Subscription",
    api: "API Integration",
    bug: "Bug Report",
    feature: "Feature Request",
    unknown: "General Inquiry",
  };

  return labels[intent] ?? intent;
};

const formatConfidence = (value: number): string => {
  if (value >= 80) {
    return "High";
  }

  if (value >= 50) {
    return "Medium";
  }

  return "Low";
};

export const formatResponse = (options: FormatOptions): string => {
  const intent = options.intent;
  const diagnosis = options.diagnosis;
  const includeDisclaimer = options.includeDisclaimer ?? true;

  const rootCause = diagnosis.rootCause;
  const proposedFix = diagnosis.proposedFix;
  const confidence = diagnosis.confidence;
  const steps = diagnosis.steps;
  const requiresHumanReview = diagnosis.requiresHumanReview;
  const sources = diagnosis.sources;

  const sections: string[] = [];

  sections.push("## SupportPilot Analysis");
  sections.push("---");
  sections.push(`**Classification**: ${formatIntent(intent)}`);
  sections.push(`**Confidence**: ${formatConfidence(confidence)} (${confidence}%)`);
  sections.push("");

  sections.push("### Root Cause Analysis");
  sections.push("");
  sections.push(rootCause.trim());
  sections.push("");

  sections.push("### Recommended Resolution");
  sections.push("");
  sections.push(proposedFix.trim());
  sections.push("");

  if (steps.length > 0) {
    sections.push("### Implementation Steps");
    sections.push("");

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i].trim();
      sections.push(`${i + 1}. ${step}`);
    }

    sections.push("");
  }

  if (sources && sources.length > 0) {
    sections.push("### Referenced Documentation");
    sections.push("");

    for (const source of sources) {
      const title = source.title ? source.title.trim() : "Untitled";
      const relevance = typeof source.relevance === "number" ? Math.round(source.relevance) : "N/A";

      sections.push(`- ${title} (Relevance: ${relevance}%)`);
    }

    sections.push("");
  }

  if (requiresHumanReview) {
    sections.push(
      "> **Note**: This analysis has low confidence or involves complex logic. Please review before sharing with the customer.",
    );
    sections.push("");
  }

  if (includeDisclaimer) {
    sections.push("---");
    sections.push(`**SupportPilot** &mdash; Model: *${AI_CONF.modelName}*`);
  }

  return sections.join("\n").trim();
};
