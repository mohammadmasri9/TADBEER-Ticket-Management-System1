import { openai, aiConfig } from "../aiClient";
import { runTool, ToolCall } from "../tools/readOnlyTools";

// الموديل لازم يطلع JSON بهذا الشكل
// step1: إمّا يطلب tools
// أو يطلع final answer
type AgentOutput =
  | {
      type: "tool_calls";
      toolCalls: ToolCall[];
      interimReply?: string;
    }
  | {
      type: "final";
      reply: string;
      steps?: string[];
      clarifyingQuestion?: string;
    };

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

const SYSTEM_AGENT = `
You are Tadbeer Assistant (RAG + Read-only DB tools).

You MUST output ONLY valid JSON. No markdown.

You can either:
A) Request tools:
{
  "type":"tool_calls",
  "toolCalls":[{"tool":"search_knowledge|get_ticket|get_ticket_comments|search_tickets|get_user_basic","args":{...}}],
  "interimReply":"optional"
}

B) Final answer:
{
  "type":"final",
  "reply":"string (detailed, based on tools/context)",
  "steps":["string","..."] ,
  "clarifyingQuestion":"optional"
}

Rules:
- If user asks about system behavior, API, permissions, UI flows, search_knowledge first.
- If user asks about specific ticket(s), call get_ticket and get_ticket_comments.
- Keep DB queries limited (max 30 items).
- Never ask for secrets (.env, API keys). Never output keys.
`.trim();

async function runModel(payload: any) {
  const r = await openai.responses.create({
    model: aiConfig.model,
    max_output_tokens: aiConfig.maxTokens,
    input: [
      { role: "system", content: SYSTEM_AGENT },
      { role: "user", content: JSON.stringify(payload) },
    ],
  });

  const text = (r as any).output_text || "";
  return text;
}

export async function chatAgent(params: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  pageContext?: any;
  auth: { userId: string; role: string };
}) {
  const messages = params.messages.slice(-20);

  // 1) Ask model what to do (tools or final)
  const firstText = await runModel({
    stage: "decide",
    pageContext: params.pageContext || null,
    messages,
  });

  let out = parseJson(firstText) as AgentOutput | null;
  if (!out) {
    // fallback: just return text
    return {
      reply: firstText || "I couldn’t parse AI output. Try again.",
      steps: [],
    };
  }

  // 2) If tool calls requested, execute them then ask model for final
  if (out.type === "tool_calls") {
    const calls = Array.isArray(out.toolCalls) ? out.toolCalls.slice(0, 6) : [];
    const toolResults: any[] = [];

    for (const c of calls) {
      try {
        const result = await runTool(c, params.auth);
        toolResults.push({ tool: c.tool, args: c.args, result });
      } catch (e: any) {
        toolResults.push({ tool: c.tool, args: c.args, result: { ok: false, error: e?.message || "Tool failed" } });
      }
    }

    const secondText = await runModel({
      stage: "finalize",
      pageContext: params.pageContext || null,
      messages,
      toolResults,
      interimReply: out.interimReply || "",
    });

    const finalOut = parseJson(secondText) as AgentOutput | null;

    if (finalOut && finalOut.type === "final") {
      return {
        reply: finalOut.reply,
        steps: Array.isArray(finalOut.steps) ? finalOut.steps : [],
        clarifyingQuestion: finalOut.clarifyingQuestion || "",
        toolResults, // helpful for debugging (you can remove in prod)
      };
    }

    // fallback if JSON invalid
    return { reply: secondText || "No response.", steps: [], toolResults };
  }

  // 3) Final directly
  return {
    reply: out.reply,
    steps: Array.isArray(out.steps) ? out.steps : [],
    clarifyingQuestion: out.clarifyingQuestion || "",
  };
}
