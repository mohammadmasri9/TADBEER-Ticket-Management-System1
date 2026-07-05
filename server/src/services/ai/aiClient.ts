import OpenAI from "openai";

const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || "";

export const aiConfig = {
  model: process.env.AI_MODEL?.trim() || "openai/gpt-3.5-turbo",
  maxTokens: Number(process.env.AI_MAX_TOKENS || 600),
  temperature: Number(process.env.AI_TEMPERATURE || 0.2),
  embeddingModel: process.env.AI_EMBEDDING_MODEL?.trim() || "openai/text-embedding-3-small",
};

export const openai = new OpenAI({
  apiKey: openRouterKey || "missing-key",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.CLIENT_URL || "http://localhost:5000",
    "X-Title": "Tadbeer Ticketing System",
  },
});

export function hasAIKey() {
  return Boolean(openRouterKey);
}
