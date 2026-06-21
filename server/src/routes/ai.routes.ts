import { Router } from "express";
import rateLimit from "express-rate-limit";
import { suggestTicket, assistTicket, chatAI } from "../controllers/ai.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

router.use(requireAuth);
router.use(aiLimiter);

// Ticket suggest
router.post("/tickets/suggest", suggestTicket);

// Ticket assist (legacy + new)
router.post("/tickets/assist", assistTicket);
router.post("/tickets/:ticketId/assist", assistTicket);

// ✅ NEW: General Chatbot
router.post("/chat", chatAI);

export default router;
