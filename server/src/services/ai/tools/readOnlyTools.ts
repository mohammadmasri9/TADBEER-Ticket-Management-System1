import Ticket from "../../../models/Ticket.model";
import Comment from "../../../models/Comments";
import User from "../../../models/User.model";
import { searchProjectKnowledge } from "../knowledge/searchDocs";

export type ToolName =
  | "search_knowledge"
  | "get_ticket"
  | "get_ticket_comments"
  | "search_tickets"
  | "get_user_basic";

export type ToolCall = { tool: ToolName; args: any };

function safeLimit(n: any, def = 10, max = 50) {
  const x = Number(n);
  if (!Number.isFinite(x)) return def;
  return Math.max(1, Math.min(max, Math.floor(x)));
}

export async function runTool(call: ToolCall, auth: { userId: string; role: string }) {
  const { tool, args } = call;

  switch (tool) {
    case "search_knowledge": {
      const q = String(args?.query || "").trim();
      if (!q) return { ok: false, error: "query is required" };

      const hits = await searchProjectKnowledge({
        query: q,
        roots: ["docs", "src"], // ✅ docs + code
        maxHits: safeLimit(args?.maxHits, 6, 10),
      });

      return { ok: true, data: hits };
    }

    case "get_ticket": {
      const ticketId = String(args?.ticketId || "").trim();
      if (!ticketId) return { ok: false, error: "ticketId is required" };

      const t = await Ticket.findById(ticketId)
        .select("title description status priority departmentId assignee createdBy createdAt updatedAt watchers")
        .populate("departmentId", "name")
        .populate("assignee", "name email role")
        .populate("createdBy", "name email role")
        .lean();

      if (!t) return { ok: false, error: "Ticket not found" };
      return { ok: true, data: t };
    }

    case "get_ticket_comments": {
      const ticketId = String(args?.ticketId || "").trim();
      if (!ticketId) return { ok: false, error: "ticketId is required" };

      const limit = safeLimit(args?.limit, 10, 30);

      const cs = await Comment.find({ ticketId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("userId", "name email role")
        .lean();

      // reverse to chronological
      return { ok: true, data: cs.reverse() };
    }

    case "search_tickets": {
      const q = String(args?.query || "").trim();
      const limit = safeLimit(args?.limit, 10, 30);

      // simple search: title/description
      const filter: any = q
        ? {
            $or: [{ title: { $regex: q, $options: "i" } }, { description: { $regex: q, $options: "i" } }],
          }
        : {};

      // Role-based narrowing (basic): user sees own/assigned/watching; manager/admin can see more
      const role = String(auth.role || "");
      if (role === "user" || role === "agent") {
        filter.$or = filter.$or || [];
        filter.$or.push({ createdBy: auth.userId }, { assignee: auth.userId }, { "watchers.userId": auth.userId });
      }

      const list = await Ticket.find(filter)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .select("title status priority departmentId assignee createdBy updatedAt")
        .populate("departmentId", "name")
        .lean();

      return { ok: true, data: list };
    }

    case "get_user_basic": {
      const userId = String(args?.userId || auth.userId).trim();
      const u = await User.findById(userId).select("name email role departmentId").populate("departmentId", "name").lean();
      if (!u) return { ok: false, error: "User not found" };
      return { ok: true, data: u };
    }

    default:
      return { ok: false, error: `Unknown tool: ${tool}` };
  }
}
