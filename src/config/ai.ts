import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOllama } from "ollama-ai-provider-v2";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
const ollama = createOllama({ baseURL: process.env.OLLAMA_BASE_URL });

export const models = {
  openai: {
    "gpt-4-turbo": openai("gpt-4-turbo"),
    "gpt-4o": openai("gpt-4o"),
  },
  google: {
    "gemini-2.5-flash": google("gemini-2.5-flash"),
    "gemini-1.5-pro": google("gemini-1.5-pro"),
  },
  ollama: {
    get: (name: string) => ollama(name),
  },
};

const OLLAMA_MODELS = {
  PHI4_MINI: "phi4-mini:3.8b",
  GRANITE4_1B: "granite4:1b",
  QWEN2_5B: "qwen2.5:3b",
  LLAMA3_2B: "llama3.2:3b",
} as const;

export const AI_CONF = {
  provider: "ollama",
  modelName: OLLAMA_MODELS.QWEN2_5B,
  temperature: 0.2,
};
