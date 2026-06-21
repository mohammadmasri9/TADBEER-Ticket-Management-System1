import OpenAI from "openai";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing env var: ${name}`);
  }
  return String(v).trim();
}

export const aiConfig = {
  // 🔁 OpenRouter model name
  model: process.env.AI_MODEL?.trim() || "openai/gpt-3.5-turbo",

  // token limit
  maxTokens: Number(process.env.AI_MAX_TOKENS || 600),

  temperature: Number(process.env.AI_TEMPERATURE || 0.2),
};

// ✅ OpenRouter is OpenAI-compatible
export const openai = new OpenAI({
  apiKey: requireEnv("OPENROUTER_API_KEY"),

  // 🔥 THIS IS THE FIX
  baseURL: "https://openrouter.ai/api/v1",

  // optional but recommended by OpenRouter
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:5000", // or your domain
    "X-Title": "Tadbeer Ticketing System",
  },
});
