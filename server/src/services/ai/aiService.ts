// server/src/services/ai/aiService.ts
import { z } from "zod";
import mongoose from "mongoose";
import { openai, aiConfig, hasAIKey } from "./aiClient";
import Ticket from "../../models/Ticket.model";
import Notification from "../../models/Notification.model";
import Department from "../../models/departments.model";
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
  if (!hasAIKey()) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

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

function wantsToCreateTicket(text: string) {
  const q = text.toLowerCase();
  return (
    q.includes("create ticket") ||
    q.includes("open ticket") ||
    q.includes("raise ticket") ||
    q.includes("submit ticket") ||
    q.includes("new ticket")
  );
}

function ticketTokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function guessTicketCategory(text: string): "Technical" | "Security" | "Feature" | "Account" | "Bug" {
  const tokens = ticketTokens(text);
  const has = (words: string[]) => words.some((word) => tokens.includes(word) || tokens.some((token) => token.includes(word)));
  if (has(["mfa", "security", "password", "access", "phishing", "breach", "permission"])) return "Security";
  if (has(["invoice", "billing", "payment", "account", "subscription", "plan"])) return "Account";
  if (has(["feature", "enhancement", "add", "request", "improve"])) return "Feature";
  if (has(["bug", "error", "crash", "broken", "failed", "exception"])) return "Bug";
  return "Technical";
}

function guessTicketPriority(text: string): "low" | "medium" | "high" | "urgent" {
  const tokens = ticketTokens(text);
  const has = (words: string[]) => words.some((word) => tokens.includes(word) || tokens.some((token) => token.includes(word)));
  if (has(["urgent", "critical", "down", "outage", "breach", "blocked", "production"])) return "urgent";
  if (has(["cannot", "failed", "security", "many", "all", "important"])) return "high";
  if (has(["request", "question", "update", "change"])) return "medium";
  return "low";
}

function cleanTicketText(text: string) {
  return text
    .replace(/^(please\s+)?(create|open|raise|submit)\s+(a\s+)?(new\s+)?ticket\s*(for|about|to)?\s*/i, "")
    .trim();
}

async function createTicketFromChat(input: {
  message: string;
  auth?: { userId: string; role: string };
}): Promise<ChatResult> {
  const userId = input.auth?.userId || "";
  if (!userId || !mongoose.isValidObjectId(userId)) {
    return {
      reply: "I can create tickets after you log in with a valid user session.",
      steps: ["Log in again.", "Ask me to create the ticket with a short issue description."],
    };
  }

  const issue = cleanTicketText(input.message);
  if (issue.length < 8) {
    return {
      reply: "I can create the ticket, but I need a little more detail first.",
      steps: ["Include what happened.", "Mention who is affected.", "Add any error message if available."],
      clarifyingQuestion: "What should the ticket be about?",
    };
  }

  const category = guessTicketCategory(issue);
  const priority = guessTicketPriority(issue);
  const title = issue.length > 80 ? issue.slice(0, 77).trim() + "..." : issue;
  const description = issue.length >= 20 ? issue : `User requested help with: ${issue}`;

  const departments = await Department.find().select("_id name description managerId").lean();
  const categoryHints: Record<string, string[]> = {
    Technical: ["it", "technical", "support", "network", "vpn", "email", "system"],
    Security: ["security", "access", "mfa", "permission", "phishing", "audit"],
    Feature: ["product", "development", "feature", "enhancement", "reports", "dashboard"],
    Account: ["billing", "account", "invoice", "payment", "subscription", "plan"],
    Bug: ["it", "technical", "bug", "error", "crash", "issue"],
  };

  const loweredIssue = issue.toLowerCase();
  const scoredDepartments = departments
    .map((dept: any) => {
      const deptText = `${dept.name || ""} ${dept.description || ""}`.toLowerCase();
      const hintScore = (categoryHints[category] || []).reduce((sum, word) => sum + (deptText.includes(word) ? 3 : 0), 0);
      const contentScore = ticketTokens(loweredIssue).reduce((sum, token) => sum + (deptText.includes(token) ? 1 : 0), 0);
      return { dept, score: hintScore + contentScore };
    })
    .sort((a, b) => b.score - a.score || String(a.dept.name).localeCompare(String(b.dept.name)));

  const department = scoredDepartments[0]?.dept;
  if (!department?._id) {
    return {
      reply: "I could not create the ticket because there are no departments configured.",
      steps: ["Create at least one department.", "Assign a manager to that department.", "Try asking me again."],
    };
  }

  const managerId = department.managerId?.toString?.() || "";
  if (!managerId || !mongoose.isValidObjectId(managerId)) {
    return {
      reply: `I found the ${department.name} department, but it has no manager assigned, so I did not create the ticket.`,
      steps: ["Assign a manager to the department.", "Then ask me to create the ticket again."],
    };
  }

  const ticket = await Ticket.create({
    title,
    description,
    category,
    priority,
    status: "open",
    tags: ["chatbot-created"],
    departmentId: new mongoose.Types.ObjectId(department._id.toString()),
    createdBy: new mongoose.Types.ObjectId(userId),
    assignee: new mongoose.Types.ObjectId(managerId),
    watchers: [],
    deletedAt: null,
    archivedAt: null,
  });

  await Notification.create({
    userId: managerId,
    type: "ticket_assigned",
    title: "New Ticket Assigned",
    message: `A new chatbot-created ticket "${ticket.title}" has been assigned to you.`,
    link: `/tickets/${ticket._id}`,
    isRead: false,
  });

  return {
    reply: `Created ticket "${ticket.title}" and assigned it to the ${department.name} manager.`,
    steps: [
      `Ticket ID: ${ticket._id}`,
      `Category: ${category}`,
      `Priority: ${priority}`,
      `Open: /tickets/${ticket._id}`,
    ],
  };
}

async function localSmartChat(input: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  pageContext?: any;
  auth?: { userId: string; role: string };
}): Promise<ChatResult> {
  const last = input.messages[input.messages.length - 1]?.content || "";
  const q = last.toLowerCase();
  const userId = input.auth?.userId || "";
  const role = input.auth?.role || "";

  const filter: any = { deletedAt: null, archivedAt: null };
  if (role !== "admin" && userId) {
    filter.$or = [{ createdBy: userId }, { assignee: userId }, { "watchers.userId": userId }];
  }

  if (q.includes("notification")) {
    const unread = userId ? await Notification.countDocuments({ userId, isRead: false }) : 0;
    return {
      reply: `You have ${unread} unread notification${unread === 1 ? "" : "s"}.`,
      steps: ["Open Notifications from the header/sidebar.", "Use Mark All Read after reviewing important items.", "Click a notification to jump to its ticket."],
    };
  }

  if (q.includes("urgent") || q.includes("priority")) {
    const urgent = await Ticket.find({ ...filter, priority: "urgent" })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("title status priority")
      .lean();
    return {
      reply: urgent.length ? `I found ${urgent.length} urgent ticket${urgent.length === 1 ? "" : "s"} you can review first.` : "I did not find urgent tickets in your current scope.",
      steps: urgent.length
        ? urgent.map((ticket: any) => `${ticket.title} (${ticket.status})`)
        : ["Check active tickets.", "Use priority filters.", "Create or escalate a ticket if impact is high."],
    };
  }

  if (q.includes("ticket") || q.includes("status") || q.includes("dashboard")) {
    const tickets = await Ticket.find(filter).select("status priority").lean();
    const count = (status: string) => tickets.filter((ticket: any) => ticket.status === status).length;
    return {
      reply: `Your current ticket scope has ${tickets.length} ticket${tickets.length === 1 ? "" : "s"}.`,
      steps: [
        `Open: ${count("open")}`,
        `In progress: ${count("in-progress")}`,
        `Pending: ${count("pending")}`,
        `Resolved: ${count("resolved")}`,
        `Closed: ${count("closed")}`,
      ],
      clarifyingQuestion: "Do you want me to focus on open, assigned, urgent, or overdue tickets?",
    };
  }

  return {
    reply: "I can help with tickets, notifications, priorities, status summaries, and next steps.",
    steps: [
      "Ask: how many open tickets do I have?",
      "Ask: show urgent tickets.",
      "Ask from a ticket page: what should I do next?",
    ],
    clarifyingQuestion: "What would you like to check in Tadbeer?",
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
  const lastMessage = msgs[msgs.length - 1]?.content || "";

  if (wantsToCreateTicket(lastMessage)) {
    return createTicketFromChat({
      message: lastMessage,
      auth: input.auth,
    });
  }

  try {
    if (!hasAIKey()) {
      return localSmartChat({ ...input, messages: msgs });
    }

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
      return localSmartChat({ ...input, messages: msgs });
    }

    return parsed.data;
  } catch (err: any) {
    console.error("AI chat error:", err?.message || err);
    return localSmartChat({ ...input, messages: msgs });
  }
}
