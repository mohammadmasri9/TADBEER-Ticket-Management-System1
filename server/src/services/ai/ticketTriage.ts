// server/src/services/ai/ticketTriage.ts
import { suggestTicketAI } from "./aiService";

export async function triageTicket(input: { title: string; description: string }) {
  const result = await suggestTicketAI({
    title: input.title,
    description: input.description,
  });

  return {
    category: result.category,
    priority: result.priority,
    shortSummary: result.shortSummary,
    steps: result.steps,
    clarifyingQuestion: result.clarifyingQuestion,
  };
}
