// server/src/controllers/ai.controller.ts
import { Request, Response } from "express";
import { suggestTicketAI, assistTicketAI, chatAIService } from "../services/ai/aiService";
import Ticket from "../models/Ticket.model";
import Comment from "../models/Comments";

function normalizeAIError(err: any) {
  const status = err?.status || err?.response?.status;
  const message = err?.message || "Unknown error";
  const details = err?.response?.data || err?.error || err;
  return { status, message, details };
}

function getAuthFromReq(req: Request) {
  // Adjust keys if your requireAuth middleware stores differently
  const u: any = (req as any).user || {};
  const userId = String(u.userId || u.id || u._id || "");
  const role = String(u.role || "");
  return { userId, role };
}

export async function suggestTicket(req: Request, res: Response) {
  try {
    const { title, description } = req.body || {};

    const result = await suggestTicketAI({
      title: String(title || ""),
      description: String(description || ""),
    });

    return res.json({ ok: true, data: result });
  } catch (err: any) {
    const e = normalizeAIError(err);

    console.error("AI suggest failed:", {
      status: e.status,
      message: e.message,
      details: e.details,
    });

    return res.status(500).json({
      ok: false,
      message: "AI suggest failed",
      error: e.message,
      status: e.status,
    });
  }
}

export async function assistTicket(req: Request, res: Response) {
  try {
    const ticketId = String(req.params.ticketId || req.body?.ticketId || "").trim();
    const question = String(req.body?.question || "").trim();

    if (!ticketId) return res.status(400).json({ ok: false, message: "ticketId is required" });
    if (!question) return res.status(400).json({ ok: false, message: "question is required" });

    const ticket = await Ticket.findById(ticketId).lean();
    if (!ticket) return res.status(404).json({ ok: false, message: "Ticket not found" });

    const comments = await Comment.find({ ticketId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "name email role")
      .lean();

    const recentComments = comments.reverse().map((c: any) => ({
      author: c?.userId?.name || c?.userId?.email || "User",
      text: String(c?.content || ""),
      createdAt: c?.createdAt,
    }));

    const result = await assistTicketAI({
      ticketContext: {
        ticketId,
        title: String((ticket as any).title || ""),
        description: String((ticket as any).description || ""),
        status: String((ticket as any).status || ""),
        priority: String((ticket as any).priority || ""),
        recentComments,
      },
      question,
    });

    return res.json({ ok: true, data: result });
  } catch (err: any) {
    const e = normalizeAIError(err);

    console.error("AI assist failed:", {
      status: e.status,
      message: e.message,
      details: e.details,
    });

    return res.status(500).json({
      ok: false,
      message: "AI assist failed",
      error: e.message,
      status: e.status,
    });
  }
}

export async function chatAI(req: Request, res: Response) {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const pageContext = req.body?.pageContext || null;

    if (!messages.length) {
      return res.status(400).json({ ok: false, message: "messages is required" });
    }

    const auth = getAuthFromReq(req);

    const result = await chatAIService({
      messages,
      pageContext,
      auth,
    });

    return res.json({ ok: true, data: result });
  } catch (err: any) {
    const e = normalizeAIError(err);

    console.error("AI chat failed:", {
      status: e.status,
      message: e.message,
      details: e.details,
    });

    return res.status(500).json({
      ok: false,
      message: "AI chat failed",
      error: e.message,
      status: e.status,
    });
  }
}
