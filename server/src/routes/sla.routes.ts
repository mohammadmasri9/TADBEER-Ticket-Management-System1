// server/src/routes/sla.routes.ts
import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";

import SLAPolicy from "../models/SLAPolicy.model";
import Ticket from "../models/Ticket.model";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();
router.use(requireAuth);

const isValidObjectId = (id: string) => mongoose.isValidObjectId(id);

const DEFAULT_POLICIES = [
  {
    name: "Critical Priority SLA",
    description: "For urgent and critical tickets requiring immediate attention",
    priority: "urgent" as const,
    responseTime: 15,
    resolutionTime: 120,
    isActive: true,
  },
  {
    name: "High Priority SLA",
    description: "For high priority tickets affecting multiple users",
    priority: "high" as const,
    responseTime: 30,
    resolutionTime: 240,
    isActive: true,
  },
  {
    name: "Medium Priority SLA",
    description: "For standard support requests",
    priority: "medium" as const,
    responseTime: 60,
    resolutionTime: 480,
    isActive: true,
  },
  {
    name: "Low Priority SLA",
    description: "For general inquiries and low priority issues",
    priority: "low" as const,
    responseTime: 120,
    resolutionTime: 720,
    isActive: true,
  },
];

async function ensureDefaultPolicies() {
  // Per-policy atomic upsert (not insertMany) so concurrent callers (policies + metrics
  // routes can both fire this on first load) can't race into a duplicate-key error.
  await Promise.all(
    DEFAULT_POLICIES.map((policy) =>
      SLAPolicy.updateOne(
        { priority: policy.priority },
        { $setOnInsert: policy },
        { upsert: true }
      )
    )
  );
}

/* =========================
   GET /api/sla/policies
========================= */
router.get("/policies", async (_req, res) => {
  try {
    await ensureDefaultPolicies();
    const policies = await SLAPolicy.find().sort({ priority: 1 });
    return res.json(policies);
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

/* =========================
   PUT /api/sla/policies/:id
   - admin/manager only
========================= */
const updatePolicySchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  responseTime: z.number().min(1).optional(),
  resolutionTime: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
});

router.put("/policies/:id", requireRole("admin", "manager"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid policy id" });

    const data = updatePolicySchema.parse(req.body);

    const updated = await SLAPolicy.findByIdAndUpdate(id, data, { new: true });
    if (!updated) return res.status(404).json({ message: "Policy not found" });

    return res.json(updated);
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

/* =========================
   GET /api/sla/metrics
========================= */
router.get("/metrics", async (_req, res) => {
  try {
    await ensureDefaultPolicies();
    const policies = await SLAPolicy.find();
    const policyByPriority = new Map(policies.map((p) => [p.priority, p]));

    const tickets = await Ticket.find({ deletedAt: null }).select(
      "priority status createdAt closedAt slaEscalatedAt"
    );

    let metSLA = 0;
    let breachedSLA = 0;
    let atRisk = 0;
    let responseTimeTotal = 0;
    let resolutionTimeTotal = 0;
    let resolvedCount = 0;

    const now = Date.now();

    for (const t of tickets as any[]) {
      const policy = policyByPriority.get(t.priority);
      if (!policy) continue;

      const createdMs = new Date(t.createdAt).getTime();
      const endMs = t.closedAt ? new Date(t.closedAt).getTime() : now;
      const elapsedMinutes = (endMs - createdMs) / 60000;

      const isClosed = t.status === "resolved" || t.status === "closed";

      if (isClosed) {
        resolvedCount += 1;
        resolutionTimeTotal += elapsedMinutes;
        responseTimeTotal += Math.min(elapsedMinutes, policy.responseTime);

        if (elapsedMinutes > policy.resolutionTime) breachedSLA += 1;
        else metSLA += 1;
      } else {
        if (elapsedMinutes > policy.resolutionTime) breachedSLA += 1;
        else if (elapsedMinutes > policy.resolutionTime * 0.8) atRisk += 1;
        else metSLA += 1;
      }
    }

    const totalTickets = tickets.length;
    const complianceRate = totalTickets > 0 ? Math.round((metSLA / totalTickets) * 1000) / 10 : 100;

    return res.json({
      totalTickets,
      metSLA,
      breachedSLA,
      atRisk,
      avgResponseTime: resolvedCount > 0 ? Math.round(responseTimeTotal / resolvedCount) : 0,
      avgResolutionTime: resolvedCount > 0 ? Math.round(resolutionTimeTotal / resolvedCount) : 0,
      complianceRate,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

export default router;
