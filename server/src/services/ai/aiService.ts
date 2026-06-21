// server/src/services/ai/aiService.ts
import { z } from "zod";
import { openai, aiConfig } from "./aiClient";
import {
  SYSTEM_PROMPT_TICKET_ASSIST,
  SYSTEM_PROMPT_TICKET_SUGGEST,
  SYSTEM_PROMPT_CHATBOT,
} from "./aiPrompts";
import {
  SuggestTicketSchema,
  AssistTicketSchema,
  ChatSchema,
  SuggestTicketResult,
  AssistTicketResult,
  ChatResult,
} from "./aiSchemas";

// ---- helpers ----
function parseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    if (s >= 0 && e > s) {
      try {
        return JSON.parse(text.slice(s, e + 1));
      } catch {}
    }
    return null;
  }
}

async function runJson(systemPrompt: string, payload: any) {
  // OpenRouter/OpenAI compatible via openai client config
  const r = await openai.responses.create({
    model: aiConfig.model,
    max_output_tokens: aiConfig.maxTokens,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(payload) },
    ],
  });

  return (r as any).output_text || "";
}

// ---- fallbacks ----
function fallbackSuggest(reason?: string): SuggestTicketResult {
  return {
    priority: "medium",
    category: "Technical",
    shortSummary: reason ? `AI fallback: ${reason}` : "AI unavailable, default triage applied.",
    steps: [
      "Share exact error message (or screenshot).",
      "Confirm when the issue started and what changed.",
      "Try reproducing the issue and list steps.",
    ],
    clarifyingQuestion: "What exact error do you see, and who is affected (one user or many)?",
  };
}

function fallbackAssist(reason?: string): AssistTicketResult {
  return {
    suggestedStatus: "open",
    reply: reason
      ? `AI is unavailable (${reason}). Share the exact error and what you tried.`
      : "AI is currently unavailable. Share the exact error and what you tried.",
    steps: [
      "Provide steps to reproduce the issue.",
      "Attach a screenshot or error code.",
      "Test on another device/network if possible.",
    ],
    clarifyingQuestion: "What’s the exact error message and does it happen for all users?",
  };
}

function fallbackChat(reason?: string): ChatResult {
  return {
    reply: reason
      ? `AI is unavailable (${reason}). Tell me what you're trying to do, and I’ll help manually.`
      : "AI is currently unavailable. Tell me what you're trying to do, and I’ll help manually.",
    steps: ["Explain the goal.", "Share the error/message.", "Tell me what you tried."],
    clarifyingQuestion: "What page are you on and what exactly are you trying to achieve?",
  };
}

// ---- services ----
export async function suggestTicketAI(input: {
  title: string;
  description: string;
}): Promise<SuggestTicketResult> {
  const title = String(input.title || "").trim();
  const description = String(input.description || "").trim();
  if (!title && !description) return fallbackSuggest("Empty input");

  try {
    const payload = {
      title,
      description,
      allowedPriorities: ["low", "medium", "high", "urgent"],
      allowedCategories: ["Technical", "Security", "Feature", "Account", "Bug"],
    };

    const text = await runJson(SYSTEM_PROMPT_TICKET_SUGGEST, payload);
    const json = parseJson(text);

    const parsed = SuggestTicketSchema.safeParse(json);
    if (!parsed.success) {
      console.error("Suggest validation failed:", parsed.error?.issues);
      console.error("Model raw text:", text);
      return fallbackSuggest("Invalid JSON from model");
    }

    return parsed.data;
  } catch (err: any) {
    console.error("AI suggest error:", err?.message || err);
    return fallbackSuggest(err?.message || "AI error");
  }
}

export async function assistTicketAI(input: {
  ticketContext: any;
  question: string;
}): Promise<AssistTicketResult> {
  const question = String(input.question || "").trim();
  if (!question) return fallbackAssist("Empty question");

  try {
    const payload = {
      ticket: input.ticketContext,
      question,
      allowedStatuses: ["open", "in-progress", "pending", "resolved", "closed"],
    };

    const text = await runJson(SYSTEM_PROMPT_TICKET_ASSIST, payload);
    const json = parseJson(text);

    const parsed = AssistTicketSchema.safeParse(json);
    if (!parsed.success) {
      console.error("Assist validation failed:", parsed.error?.issues);
      console.error("Model raw text:", text);
      return fallbackAssist("Invalid JSON from model");
    }

    return parsed.data;
  } catch (err: any) {
    console.error("AI assist error:", err?.message || err);
    return fallbackAssist(err?.message || "AI error");
  }
}

export async function chatAIService(input: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  pageContext?: any;
  auth?: { userId: string; role: string };
}): Promise<ChatResult & { toolResults?: any[] }> {
  const msgs = Array.isArray(input.messages) ? input.messages.slice(-20) : [];
  if (!msgs.length) return fallbackChat("Empty messages");

  try {
    const payload = {
      pageContext: input.pageContext || null,
      auth: input.auth || null,
      messages: msgs,
    };

    const text = await runJson(SYSTEM_PROMPT_CHATBOT, payload);
    const json = parseJson(text);

    const parsed = ChatSchema.safeParse(json);
    if (!parsed.success) {
      console.error("Chat validation failed:", parsed.error?.issues);
      console.error("Model raw text:", text);
      return fallbackChat("Invalid JSON from model");
    }

    return parsed.data;
  } catch (err: any) {
    console.error("AI chat error:", err?.message || err);
    return fallbackChat(err?.message || "AI error");
  }
}
