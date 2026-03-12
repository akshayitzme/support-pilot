import { tool } from "ai";
import { z } from "zod";
import { search } from "../services/knowledge-base";

export const TOOL_NAMES = {
  SEARCH_KNOWLEDGE_BASE: "searchKnowledgeBase",
} as const;

const searchKnowledgeBaseParams = z.object({
  query: z
    .string()
    .describe(
      "Concise keyword query (2-4 technical terms). Examples: '401 unauthorized API', 'webhook retry logic'",
    )
    .min(1)
    .max(200),
  limit: z.number().min(1).max(10).default(5).describe("Number of results to return"),
});

export const tools = {
  [TOOL_NAMES.SEARCH_KNOWLEDGE_BASE]: tool({
    description:
      "Search internal knowledge base for technical documentation. Use for: error codes, API endpoints, authentication issues, configuration problems, or troubleshooting guides.",
    parameters: searchKnowledgeBaseParams,
    execute: async (args: z.infer<typeof searchKnowledgeBaseParams>) => {
      console.info(`🔍 [TOOL] searchKnowledgeBase`, {
        query: args.query,
        limit: args.limit,
      });

      if (!args.query || typeof args.query !== "string") {
        console.error("❌ [TOOL] Invalid query argument", { args });
        return [];
      }

      const results = await search(args.query, args.limit);

      console.info(`📄 [TOOL RESULT] Found ${results.length} docs`);

      return results.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content.slice(0, 800),
        relevance: r.score,
        filePath: r.filePath,
      }));
    },
  }),
};
