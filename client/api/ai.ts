import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL?.trim() || "http://localhost:5000/api";

const aiApi = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

aiApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "Technical" | "Security" | "Feature" | "Account" | "Bug";
export type TicketStatus = "open" | "in-progress" | "pending" | "resolved" | "closed";

export interface SuggestTicketAIResponse {
  priority: TicketPriority;
  category: TicketCategory;
  shortSummary: string;
  steps: string[];
  clarifyingQuestion?: string;
}

export interface AssistTicketAIResponse {
  suggestedStatus: TicketStatus;
  reply: string;
  steps: string[];
  clarifyingQuestion?: string;
}

// ✅ NEW
export interface ChatAIResponse {
  reply: string;
  steps: string[];
  clarifyingQuestion?: string;
}

export async function suggestTicketAI(params: {
  title: string;
  description: string;
}): Promise<SuggestTicketAIResponse> {
  const res = await aiApi.post("/ai/tickets/suggest", params);
  return res.data.data as SuggestTicketAIResponse;
}

export async function assistTicketAI(params: {
  ticketId: string;
  question: string;
}): Promise<AssistTicketAIResponse> {
  const ticketId = String(params.ticketId || "").trim();
  const question = String(params.question || "").trim();
  if (!ticketId) throw new Error("ticketId is required");
  if (!question) throw new Error("question is required");

  const res = await aiApi.post(`/ai/tickets/${ticketId}/assist`, { question });
  return res.data.data as AssistTicketAIResponse;
}

// ✅ NEW: General chat
export async function chatAI(params: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  pageContext?: any;
}): Promise<ChatAIResponse> {
  const res = await aiApi.post("/ai/chat", params);
  return res.data.data as ChatAIResponse;
}
