// server/src/routes/tickets.routes.ts
import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";

import Ticket, { TicketCategory, TicketPriority } from "../models/Ticket.model";
import Comment from "../models/Comments";
import Notification from "../models/Notification.model";
import User from "../models/User.model";
import Department from "../models/departments.model";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();
router.use(requireAuth);

/* =========================
   Helpers
========================= */
const isValidObjectId = (id: string) => mongoose.isValidObjectId(id);

function getUserId(req: any): string {
  return String(
    req.user?.userId ||
    req.user?._id ||
    req.user?.id ||
    req.user?.uid ||
    req.user?.sub ||
    ""
  );
}

function getUserRole(req: any): string {
  return String(req.user?.role || "");
}

function getUserDeptId(req: any): string {
  return String(req.user?.departmentId || "");
}

function normalizeId(val: any): string {
  return val?._id?.toString?.() ?? val?.toString?.() ?? "";
}

function parseCsvParam(value: any): string[] {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getWatcherPermission(ticket: any, uid: string): "read" | "write" | null {
  const ws = (ticket.watchers || []) as any[];
  const w = ws.find((x) => normalizeId(x.userId) === String(uid));
  return w?.permission || null;
}

/**
 * ✅ FIX: creator/assignee always can view/write
 * ✅ FIX: manager access also includes creator/assignee (even if different dept)
 */
function canWriteTicket(req: any, ticket: any): boolean {
  const role = getUserRole(req);
  const uid = getUserId(req);

  if (role === "admin") return true;

  const assigneeId = normalizeId(ticket.assignee);
  const createdById = normalizeId(ticket.createdBy);

  // ✅ creator/assignee can always write
  if (assigneeId && assigneeId === uid) return true;
  if (createdById && createdById === uid) return true;

  // ✅ managers can write tickets in their department
  if (role === "manager") {
    const myDept = getUserDeptId(req);
    const ticketDept = normalizeId(ticket.departmentId);
    if (!!myDept && !!ticketDept && String(myDept) === String(ticketDept)) return true;
  }

  // ✅ watcher write
  const perm = getWatcherPermission(ticket, uid);
  return perm === "write";
}

function ensureTicketAccess(req: any, ticket: any) {
  const role = getUserRole(req);
  const uid = getUserId(req);

  if (role === "admin") return true;

  const createdById = normalizeId(ticket.createdBy);
  const assigneeId = normalizeId(ticket.assignee);

  // ✅ creator/assignee can always view
  if (createdById === uid || assigneeId === uid) return true;

  // ✅ managers can view tickets in their department
  if (role === "manager") {
    const myDept = getUserDeptId(req);
    const ticketDept = normalizeId(ticket.departmentId);
    if (!!myDept && !!ticketDept && String(myDept) === String(ticketDept)) return true;
  }

  // ✅ watchers can view
  const perm = getWatcherPermission(ticket, uid);
  return perm === "read" || perm === "write";
}

async function createNotification(params: {
  userId: string;
  type: "ticket_assigned" | "ticket_updated" | "comment_added" | "ticket_overdue" | "system";
  title: string;
  message: string;
  link?: string;
}) {
  try {
    if (!params.userId) return;

    await Notification.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      isRead: false,
    });
  } catch (err) {
    console.error("❌ Notification create failed:", err);
  }
}

/* =========================
   Validation Schemas
========================= */
const createTicketSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  category: z.enum(["Technical", "Security", "Feature", "Account", "Bug"]),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["open", "in-progress", "pending", "resolved", "closed"]).optional(),
  assignee: z.string().optional(), // manager id only on create (optional)
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  departmentId: z.string().min(1),
});

const updateTicketSchema = createTicketSchema.partial();

const smartTriageSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
});

function tokenizeSmartText(...parts: string[]) {
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function includesAny(tokens: string[], words: string[]) {
  return words.some((word) => tokens.includes(word) || tokens.some((token) => token.includes(word)));
}

function inferCategory(tokens: string[]): TicketCategory {
  if (includesAny(tokens, ["mfa", "security", "password", "access", "phishing", "breach", "permission"])) return "Security";
  if (includesAny(tokens, ["invoice", "billing", "payment", "account", "subscription", "plan"])) return "Account";
  if (includesAny(tokens, ["feature", "enhancement", "add", "request", "improve"])) return "Feature";
  if (includesAny(tokens, ["bug", "error", "crash", "broken", "failed", "exception"])) return "Bug";
  return "Technical";
}

function inferPriority(tokens: string[]): TicketPriority {
  if (includesAny(tokens, ["urgent", "critical", "down", "outage", "breach", "blocked", "production"])) return "urgent";
  if (includesAny(tokens, ["cannot", "failed", "security", "many", "all", "important"])) return "high";
  if (includesAny(tokens, ["request", "question", "update", "change"])) return "medium";
  return "low";
}

function scoreText(tokens: string[], text: string) {
  const normalized = String(text || "").toLowerCase();
  return tokens.reduce((score, token) => score + (normalized.includes(token) ? 1 : 0), 0);
}

/* =========================
   Routes
========================= */

/**
 * ✅ Manager Inbox
 */
router.post("/smart-triage", async (req: any, res) => {
  try {
    const data = smartTriageSchema.parse(req.body);
    const tokens = tokenizeSmartText(data.title, data.description);

    const category = inferCategory(tokens);
    const priority = inferPriority(tokens);

    const [departments, users, activeTickets] = await Promise.all([
      Department.find().populate("managerId", "name email role departmentId department expertise status").lean(),
      User.find({ role: { $in: ["agent", "manager"] } })
        .select("_id name email role departmentId department expertise status")
        .lean(),
      Ticket.find({ deletedAt: null, archivedAt: null, status: { $in: ["open", "in-progress", "pending"] } })
        .select("assignee departmentId")
        .lean(),
    ]);

    const categoryHints: Record<TicketCategory, string[]> = {
      Technical: ["it", "technical", "support", "network", "vpn", "email", "system"],
      Security: ["security", "access", "mfa", "permission", "phishing", "audit"],
      Feature: ["product", "development", "feature", "enhancement", "reports", "dashboard"],
      Account: ["billing", "account", "invoice", "payment", "subscription", "plan"],
      Bug: ["it", "technical", "bug", "error", "crash", "issue"],
    };

    const deptScores = departments.map((dept: any) => {
      const deptText = `${dept.name || ""} ${dept.description || ""}`;
      const hintScore = scoreText(categoryHints[category], deptText) * 3;
      const contentScore = scoreText(tokens, deptText);
      return { dept, score: hintScore + contentScore };
    });

    deptScores.sort((a, b) => b.score - a.score || String(a.dept.name).localeCompare(String(b.dept.name)));
    const selectedDept = deptScores[0]?.dept || departments[0] || null;
    const selectedDeptId = selectedDept?._id?.toString?.() || "";

    const workload = new Map<string, number>();
    for (const ticket of activeTickets as any[]) {
      const id = normalizeId(ticket.assignee);
      if (id) workload.set(id, (workload.get(id) || 0) + 1);
    }

    const deptUsers = users.filter((user: any) => normalizeId(user.departmentId) === selectedDeptId);
    const agentCandidates = deptUsers.length ? deptUsers : users;

    const rankedAssignees = agentCandidates
      .map((user: any) => {
        const expertiseScore = Array.isArray(user.expertise)
          ? user.expertise.reduce((sum: number, item: string) => sum + scoreText(tokens, item) * 4, 0)
          : 0;
        const roleScore = user.role === "agent" ? 4 : 2;
        const statusScore = user.status === "available" ? 3 : user.status === "busy" ? 1 : 0;
        const loadPenalty = workload.get(user._id.toString()) || 0;
        const deptScore = normalizeId(user.departmentId) === selectedDeptId ? 5 : 0;
        return { user, score: expertiseScore + roleScore + statusScore + deptScore - loadPenalty, activeTickets: loadPenalty };
      })
      .sort((a, b) => b.score - a.score || a.activeTickets - b.activeTickets);

    const bestAssignee = rankedAssignees[0]?.user || (selectedDept as any)?.managerId || null;

    return res.json({
      category,
      priority,
      department: selectedDept
        ? { _id: selectedDept._id, name: selectedDept.name, managerId: selectedDept.managerId || null }
        : null,
      assignee: bestAssignee
        ? {
            _id: bestAssignee._id,
            name: bestAssignee.name,
            email: bestAssignee.email,
            role: bestAssignee.role,
            activeTickets: workload.get(bestAssignee._id.toString()) || 0,
          }
        : null,
      reasons: [
        `Detected ${category} category from ticket keywords.`,
        `Suggested ${priority} priority based on urgency and impact words.`,
        selectedDept ? `Matched department "${selectedDept.name}".` : "No department was available.",
        bestAssignee ? "Suggested assignee from expertise, availability, and workload." : "No assignee candidate was available.",
      ],
    });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

router.get("/inbox", requireRole("manager", "admin"), async (req: any, res) => {
  const deptId = getUserDeptId(req);

  if (!deptId || !isValidObjectId(deptId)) {
    return res.status(400).json({ message: "Manager has no departmentId configured" });
  }

  const tickets = await Ticket.find({ departmentId: deptId })
    .populate("createdBy", "name email role departmentId department")
    .populate("assignee", "name email role departmentId department")
    .populate("departmentId", "name managerId")
    .populate("watchers.userId", "name email role departmentId department")
    .sort({ createdAt: -1 });

  // keep unassigned on top
  const sorted = tickets.sort((a: any, b: any) => {
    const aUn = !a.assignee;
    const bUn = !b.assignee;
    if (aUn === bUn) return 0;
    return aUn ? -1 : 1;
  });

  res.json(sorted);
});

/**
 * ✅ GET /api/tickets/stats
 * Returns aggregated statistics for the current user
 */
router.get("/stats", async (req: any, res) => {
  const role = getUserRole(req);
  const uid = getUserId(req);
  const myDeptId = getUserDeptId(req);

  if (!uid || !isValidObjectId(uid)) {
    return res.status(401).json({ message: "Invalid auth user id" });
  }

  const filter: any = { deletedAt: null, archivedAt: null };

  // Apply role-based filtering
  if (role === "admin") {
    // no extra filter - see all tickets
  } else if (role === "manager") {
    if (myDeptId) filter.departmentId = myDeptId;
  } else {
    filter.$or = [{ createdBy: uid }, { assignee: uid }, { "watchers.userId": uid }];
  }

  const tickets = await Ticket.find(filter);

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    inProgress: tickets.filter((t) => t.status === "in-progress").length,
    pending: tickets.filter((t) => t.status === "pending").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    closed: tickets.filter((t) => t.status === "closed").length,
    urgent: tickets.filter((t) => t.priority === "urgent").length,
    high: tickets.filter((t) => t.priority === "high").length,
    medium: tickets.filter((t) => t.priority === "medium").length,
    low: tickets.filter((t) => t.priority === "low").length,
  };

  res.json(stats);
});

/**
 * ✅ Assign / Reassign
 * ✅ AUTO-WATCH:
 *  - adds assignee as watcher (addedBy = actor)
 *  - adds actor (manager/admin) as watcher to keep tracking
 */
router.patch("/:id/assign", requireRole("manager", "admin"), async (req: any, res) => {
  const schema = z.object({ assigneeId: z.string().min(1) });

  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ticket id" });

    const { assigneeId } = schema.parse(req.body);
    if (!isValidObjectId(assigneeId)) return res.status(400).json({ message: "Invalid assigneeId" });

    const role = getUserRole(req);
    const managerDeptId = getUserDeptId(req);
    const actorId = getUserId(req);

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (role === "manager") {
      if (!managerDeptId || !isValidObjectId(managerDeptId)) {
        return res.status(400).json({ message: "Manager has no departmentId configured" });
      }

      const ticketDept = normalizeId(ticket.departmentId);
      if (!ticketDept || ticketDept !== String(managerDeptId)) {
        return res.status(403).json({ message: "Forbidden: Ticket is not in your department" });
      }

      const assigneeUser = await User.findById(assigneeId).select("name role departmentId");
      if (!assigneeUser) return res.status(404).json({ message: "Assignee not found" });

      const assigneeDept = normalizeId(assigneeUser.departmentId);
      if (!assigneeDept || assigneeDept !== String(managerDeptId)) {
        return res.status(400).json({ message: "Assignee must be in the same department" });
      }

      if (!["user", "agent"].includes(String(assigneeUser.role))) {
        return res.status(400).json({ message: "Assignee must be user or agent" });
      }
    }

    // ✅ assign
    ticket.assignee = new mongoose.Types.ObjectId(assigneeId);

    // ✅ auto-watchers
    const watchers = ((ticket as any).watchers || []) as any[];

    // add assignee watcher
    const existsAssignee = watchers.some((w: any) => normalizeId(w.userId) === String(assigneeId));
    if (!existsAssignee) {
      watchers.push({
        userId: new mongoose.Types.ObjectId(assigneeId),
        permission: "read",
        addedBy: isValidObjectId(actorId) ? new mongoose.Types.ObjectId(actorId) : undefined,
        addedAt: new Date(),
      });
    }

    // add actor watcher (manager/admin) so they keep tracking
    const existsActor = watchers.some((w: any) => normalizeId(w.userId) === String(actorId));
    if (!existsActor && isValidObjectId(actorId)) {
      watchers.push({
        userId: new mongoose.Types.ObjectId(actorId),
        permission: "read",
        addedBy: new mongoose.Types.ObjectId(actorId),
        addedAt: new Date(),
      });
    }

    (ticket as any).watchers = watchers;

    await ticket.save();

    const full = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email role departmentId department")
      .populate("assignee", "name email role departmentId department")
      .populate("departmentId", "name managerId")
      .populate("watchers.userId", "name email role departmentId department");

    await createNotification({
      userId: assigneeId,
      type: "ticket_assigned",
      title: "New Ticket Assigned",
      message: `You were assigned: "${ticket.title}"`,
      link: `/tickets/${ticket._id}`,
    });

    return res.json(full);
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

/**
 * ✅ Watchers
 */
router.post("/:id/watchers", requireRole("manager", "admin"), async (req: any, res) => {
  const schema = z.object({
    userId: z.string().min(1),
    permission: z.enum(["read", "write"]).default("read"),
  });

  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ticket id" });

    const { userId, permission } = schema.parse(req.body);
    if (!isValidObjectId(userId)) return res.status(400).json({ message: "Invalid userId" });

    const role = getUserRole(req);
    const myDeptId = getUserDeptId(req);

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (role === "manager") {
      const tDept = normalizeId(ticket.departmentId);
      if (!myDeptId || !tDept || String(tDept) !== String(myDeptId)) {
        return res.status(403).json({ message: "Forbidden: Ticket is not in your department" });
      }

      const u = await User.findById(userId).select("departmentId role");
      if (!u) return res.status(404).json({ message: "User not found" });

      const uDept = normalizeId(u.departmentId);
      if (!uDept || String(uDept) !== String(myDeptId)) {
        return res.status(400).json({ message: "Watcher must be in the same department" });
      }
    }

    const watchers = ((ticket as any).watchers || []) as any[];
    const exists = watchers.some((w: any) => normalizeId(w.userId) === String(userId));

    if (!exists) {
      watchers.push({
        userId: new mongoose.Types.ObjectId(userId),
        permission,
        addedBy: new mongoose.Types.ObjectId(getUserId(req)),
        addedAt: new Date(),
      });
    } else {
      for (const w of watchers) {
        if (normalizeId(w.userId) === String(userId)) w.permission = permission;
      }
    }

    (ticket as any).watchers = watchers;
    await ticket.save();

    await createNotification({
      userId,
      type: "ticket_updated",
      title: "You were added as a watcher",
      message: `You can now watch ticket "${ticket.title}" (${permission === "write" ? "read & write" : "read-only"}).`,
      link: `/tickets/${ticket._id}`,
    });

    const full = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email role departmentId department")
      .populate("assignee", "name email role departmentId department")
      .populate("departmentId", "name managerId")
      .populate("watchers.userId", "name email role departmentId department");

    return res.json(full);
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

router.delete("/:id/watchers/:userId", requireRole("manager", "admin"), async (req: any, res) => {
  try {
    const { id, userId } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ticket id" });
    if (!isValidObjectId(userId)) return res.status(400).json({ message: "Invalid userId" });

    const role = getUserRole(req);
    const myDeptId = getUserDeptId(req);

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (role === "manager") {
      const tDept = normalizeId(ticket.departmentId);
      if (!myDeptId || !tDept || String(tDept) !== String(myDeptId)) {
        return res.status(403).json({ message: "Forbidden: Ticket is not in your department" });
      }
    }

    const watchers = ((ticket as any).watchers || []) as any[];
    (ticket as any).watchers = watchers.filter((w: any) => normalizeId(w.userId) !== String(userId));
    await ticket.save();

    const full = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email role departmentId department")
      .populate("assignee", "name email role departmentId department")
      .populate("departmentId", "name managerId")
      .populate("watchers.userId", "name email role departmentId department");

    return res.json(full);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

/**
 * ✅ GET /api/tickets
 * ✅ Supports view=created|assigned|watching
 * ✅ Supports deleted=true to show deleted tickets
 */
router.get("/", async (req: any, res) => {
  const {
    status,
    priority,
    category,
    assignee,
    createdBy,
    departmentId,
    view,
    deleted,
    archived,
    favorited,
  } = req.query;

  const role = getUserRole(req);
  const uid = getUserId(req);
  const myDeptId = getUserDeptId(req);

  const viewStr = String(view || "").trim();
  const needsUid = ["created", "assigned", "watching"].includes(viewStr);

  if (needsUid) {
    if (!uid || !isValidObjectId(uid)) {
      return res.status(401).json({ message: "Invalid auth user id (uid missing in token)" });
    }
  } else {
    if (!["admin", "manager"].includes(role)) {
      if (!uid || !isValidObjectId(uid)) {
        return res.status(401).json({ message: "Invalid auth user id (uid missing in token)" });
      }
    }
  }

  const filter: any = {};

  // ✅ Deleted tickets filter
  if (deleted === "true") {
    filter.deletedAt = { $ne: null };
  } else {
    filter.deletedAt = null; // exclude deleted by default
  }

  const statusValues = parseCsvParam(status);
  if (statusValues.length === 1) filter.status = statusValues[0];
  if (statusValues.length > 1) filter.status = { $in: statusValues };

  const priorityValues = parseCsvParam(priority);
  if (priorityValues.length === 1) filter.priority = priorityValues[0];
  if (priorityValues.length > 1) filter.priority = { $in: priorityValues };

  const categoryValues = parseCsvParam(category);
  if (categoryValues.length === 1) filter.category = categoryValues[0];
  if (categoryValues.length > 1) filter.category = { $in: categoryValues };

  if (assignee) filter.assignee = assignee;
  if (createdBy) filter.createdBy = createdBy;
  if (favorited === "true") filter.favoritedBy = uid;

  if (departmentId && isValidObjectId(String(departmentId)) && role === "admin") {
    filter.departmentId = departmentId;
  }

  if (archived === "true") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { archivedAt: { $ne: null } },
          { status: { $in: ["resolved", "closed"] }, closedAt: { $lt: thirtyDaysAgo } },
        ],
      },
    ];
  } else {
    filter.archivedAt = null;
  }

  // ✅ view overrides role default scope
  if (viewStr === "created") {
    filter.createdBy = uid;
  } else if (viewStr === "assigned") {
    filter.assignee = uid;
  } else if (viewStr === "watching") {
    filter["watchers.userId"] = uid;
  } else {
    if (role === "admin") {
      // no extra filter
    } else if (role === "manager") {
      if (myDeptId) filter.departmentId = myDeptId;
    } else {
      filter.$or = [{ createdBy: uid }, { assignee: uid }, { "watchers.userId": uid }];
    }
  }

  const tickets = await Ticket.find(filter)
    .populate("createdBy", "name email role departmentId department")
    .populate("assignee", "name email role departmentId department")
    .populate("departmentId", "name managerId")
    .populate("watchers.userId", "name email role departmentId department")
    .sort({ createdAt: -1 });

  res.json(tickets);
});

/**
 * ✅ POST /api/tickets
 */
router.post("/", async (req: any, res) => {
  try {
    const data = createTicketSchema.parse(req.body);

    const deptId = String(data.departmentId || "");
    if (!deptId || !isValidObjectId(deptId)) {
      return res.status(400).json({ message: "departmentId is required and must be valid" });
    }

    const dept = await Department.findById(deptId).select("_id name managerId");
    if (!dept) return res.status(404).json({ message: "Department not found" });

    const creatorId = getUserId(req);
    if (!creatorId || !isValidObjectId(creatorId)) {
      return res.status(401).json({ message: "Invalid auth user id (creatorId missing)" });
    }

    let finalAssignee: mongoose.Types.ObjectId | undefined = undefined;

    if (data.assignee) {
      if (!isValidObjectId(data.assignee)) return res.status(400).json({ message: "Invalid assignee id" });

      const managerId = dept.managerId?.toString?.() || "";
      if (!managerId || managerId !== String(data.assignee)) {
        return res.status(400).json({ message: "Assignee must be the selected department manager" });
      }

      finalAssignee = new mongoose.Types.ObjectId(String(data.assignee));
    } else {
      const managerId = dept.managerId?.toString?.() || "";
      if (managerId && isValidObjectId(managerId)) {
        finalAssignee = new mongoose.Types.ObjectId(managerId);
      } else {
        return res.status(400).json({
          message: "Selected department has no manager assigned. Please assign a manager before creating a ticket.",
        });
      }
    }

    const ticket = await Ticket.create({
      title: data.title.trim(),
      description: data.description.trim(),
      category: data.category,
      priority: data.priority || "medium",
      status: data.status || "open",
      tags: data.tags || [],

      departmentId: new mongoose.Types.ObjectId(deptId),
      createdBy: new mongoose.Types.ObjectId(creatorId),
      assignee: finalAssignee,

      watchers: [],
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    });

    const full = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email role departmentId department")
      .populate("assignee", "name email role departmentId department")
      .populate("departmentId", "name managerId")
      .populate("watchers.userId", "name email role departmentId department");

    if (!full) return res.status(500).json({ message: "Failed to load created ticket" });

    const assigneeId = (full as any).assignee?._id?.toString?.() || "";
    if (assigneeId) {
      await createNotification({
        userId: assigneeId,
        type: "ticket_assigned",
        title: "New Ticket Assigned",
        message: `A new ticket "${full.title}" has been assigned to you.`,
        link: `/tickets/${full._id}`,
      });
    }

    return res.status(201).json(full);
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

router.get("/:id", async (req: any, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ticket id" });

  const ticket = await Ticket.findById(id)
    .populate("createdBy", "name email role departmentId department")
    .populate("assignee", "name email role departmentId department")
    .populate("departmentId", "name managerId")
    .populate("watchers.userId", "name email role departmentId department");

  if (!ticket) return res.status(404).json({ message: "Ticket not found" });
  if (!ensureTicketAccess(req, ticket)) return res.status(403).json({ message: "Forbidden" });

  const comments = await Comment.find({ ticketId: ticket._id, deletedAt: null })
    .populate("userId", "name email role departmentId department")
    .sort({ createdAt: 1 });

  res.json({ ticket, comments });
});

router.post("/:id/comments", async (req: any, res) => {
  const schema = z.object({ text: z.string().min(1).max(5000) });

  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ticket id" });

    const { text } = schema.parse(req.body);

    const ticket = await Ticket.findById(id)
      .populate("createdBy", "name email role departmentId department")
      .populate("assignee", "name email role departmentId department")
      .populate("departmentId", "name managerId")
      .populate("watchers.userId", "name email role departmentId department");

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (!ensureTicketAccess(req, ticket)) return res.status(403).json({ message: "Forbidden" });

    if (!canWriteTicket(req, ticket)) {
      return res.status(403).json({ message: "Forbidden: read-only access" });
    }

    const created = await Comment.create({
      ticketId: ticket._id,
      userId: getUserId(req),
      content: text.trim(),
      attachments: [],
      deletedAt: null,
    });

    const fullComment = await Comment.findById(created._id).populate(
      "userId",
      "name email role departmentId department"
    );

    const commenterId = getUserId(req);
    const assigneeId = normalizeId((ticket as any).assignee);
    const createdById = normalizeId((ticket as any).createdBy);

    const watcherIds = ((ticket as any).watchers || []).map((w: any) => normalizeId(w.userId));
    const targets = Array.from(new Set([assigneeId, createdById, ...watcherIds].filter(Boolean))).filter(
      (uid) => uid !== commenterId
    );

    const commenterName = (fullComment as any)?.userId?.name || "Someone";

    await Promise.all(
      targets.map((uid) =>
        createNotification({
          userId: uid,
          type: "comment_added",
          title: "New Comment Added",
          message: `${commenterName} commented on: "${ticket.title}"`,
          link: `/tickets/${ticket._id}`,
        })
      )
    );

    return res.status(201).json({ comment: fullComment });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

router.put("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ticket id" });

    const data = updateTicketSchema.parse(req.body);

    const before = await Ticket.findById(id);
    if (!before) return res.status(404).json({ message: "Ticket not found" });
    if (!ensureTicketAccess(req, before)) return res.status(403).json({ message: "Forbidden" });

    const role = getUserRole(req);
    const uid = getUserId(req);
    const assigneeId = normalizeId(before.assignee);
    const createdById = normalizeId(before.createdBy);

    const canEdit =
      role === "admin" ||
      (role === "manager" && normalizeId(before.departmentId) === getUserDeptId(req)) ||
      uid === assigneeId ||
      uid === createdById;

    if (!canEdit) {
      return res.status(403).json({ message: "Forbidden: you cannot edit ticket fields" });
    }

    const updated = await Ticket.findByIdAndUpdate(
      id,
      { ...data, dueDate: data.dueDate ? new Date(data.dueDate) : undefined },
      { new: true }
    )
      .populate("createdBy", "name email role departmentId department")
      .populate("assignee", "name email role departmentId department")
      .populate("departmentId", "name managerId")
      .populate("watchers.userId", "name email role departmentId department");

    if (!updated) return res.status(404).json({ message: "Ticket not found" });

    res.json(updated);
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

router.patch("/:id/status", async (req: any, res) => {
  const schema = z.object({
    status: z.enum(["open", "in-progress", "pending", "resolved", "closed"]),
  });

  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ticket id" });

    const { status } = schema.parse(req.body);

    const ticket = await Ticket.findById(id)
      .populate("createdBy", "name email role departmentId department")
      .populate("assignee", "name email role departmentId department")
      .populate("departmentId", "name managerId")
      .populate("watchers.userId", "name email role departmentId department");

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (!ensureTicketAccess(req, ticket)) return res.status(403).json({ message: "Forbidden" });

    if (!canWriteTicket(req, ticket)) {
      return res.status(403).json({ message: "Forbidden: read-only access" });
    }

    ticket.status = status;
    await ticket.save();

    const changerId = getUserId(req);
    const assigneeId = normalizeId((ticket as any).assignee);
    const createdById = normalizeId((ticket as any).createdBy);
    const watcherIds = ((ticket as any).watchers || []).map((w: any) => normalizeId(w.userId));

    const targets = Array.from(new Set([assigneeId, createdById, ...watcherIds].filter(Boolean))).filter(
      (uid) => uid !== changerId
    );

    await Promise.all(
      targets.map((uid) =>
        createNotification({
          userId: uid,
          type: "ticket_updated",
          title: "Ticket Status Updated",
          message: `Ticket "${ticket.title}" status changed to "${status}".`,
          link: `/tickets/${ticket._id}`,
        })
      )
    );

    const full = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email role departmentId department")
      .populate("assignee", "name email role departmentId department")
      .populate("departmentId", "name managerId")
      .populate("watchers.userId", "name email role departmentId department");

    res.json(full);
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

/**
 * ✅ POST /api/tickets/:id/favorite
 * Toggle favorite status for a ticket
 */
router.post("/:id/favorite", async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ticket id" });

    const uid = getUserId(req);
    if (!uid || !isValidObjectId(uid)) {
      return res.status(401).json({ message: "Invalid auth user id" });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (!ensureTicketAccess(req, ticket)) return res.status(403).json({ message: "Forbidden" });

    const favoritedBy = ((ticket as any).favoritedBy || []) as any[];
    const isFavorited = favoritedBy.some((fid: any) => normalizeId(fid) === String(uid));

    if (isFavorited) {
      // Remove from favorites
      (ticket as any).favoritedBy = favoritedBy.filter((fid: any) => normalizeId(fid) !== String(uid));
    } else {
      // Add to favorites
      favoritedBy.push(new mongoose.Types.ObjectId(uid));
      (ticket as any).favoritedBy = favoritedBy;
    }

    await ticket.save();

    const full = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email role departmentId department")
      .populate("assignee", "name email role departmentId department")
      .populate("departmentId", "name managerId")
      .populate("watchers.userId", "name email role departmentId department");

    res.json({ ticket: full, isFavorited: !isFavorited });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

/**
 * ✅ POST /api/tickets/:id/archive
 * Archive a ticket without deleting it.
 */
router.post("/:id/archive", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ticket id" });

    const uid = getUserId(req);
    if (!uid || !isValidObjectId(uid)) {
      return res.status(401).json({ message: "Invalid auth user id" });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    (ticket as any).archivedAt = new Date();
    (ticket as any).archivedBy = new mongoose.Types.ObjectId(uid);
    await ticket.save();

    const full = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email role departmentId department")
      .populate("assignee", "name email role departmentId department")
      .populate("departmentId", "name managerId")
      .populate("watchers.userId", "name email role departmentId department");

    return res.json({ message: "Ticket archived", ticket: full });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

/**
 * ✅ POST /api/tickets/:id/unarchive
 */
router.post("/:id/unarchive", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ticket id" });

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    (ticket as any).archivedAt = null;
    (ticket as any).archivedBy = null;
    await ticket.save();

    const full = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email role departmentId department")
      .populate("assignee", "name email role departmentId department")
      .populate("departmentId", "name managerId")
      .populate("watchers.userId", "name email role departmentId department");

    return res.json({ message: "Ticket unarchived", ticket: full });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

/**
 * ✅ DELETE /api/tickets/:id (Soft Delete)
 * Move ticket to recycle bin
 */
router.delete("/:id", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ticket id" });

    const uid = getUserId(req);
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Soft delete
    (ticket as any).deletedAt = new Date();
    (ticket as any).deletedBy = new mongoose.Types.ObjectId(uid);
    await ticket.save();

    res.json({ message: "Ticket moved to recycle bin", ticketId: id });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

/**
 * ✅ POST /api/tickets/:id/restore
 * Restore ticket from recycle bin
 */
router.post("/:id/restore", requireRole("admin", "manager"), async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid ticket id" });

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    if (!(ticket as any).deletedAt) {
      return res.status(400).json({ message: "Ticket is not deleted" });
    }

    // Restore
    (ticket as any).deletedAt = null;
    (ticket as any).deletedBy = null;
    await ticket.save();

    const full = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email role departmentId department")
      .populate("assignee", "name email role departmentId department")
      .populate("departmentId", "name managerId")
      .populate("watchers.userId", "name email role departmentId department");

    res.json({ message: "Ticket restored", ticket: full });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

/**
 * ✅ DELETE /api/tickets/:id/permanent
 * Permanently delete ticket from recycle bin
 */
router.delete("/:id/permanent", requireRole("admin", "manager"), async (req: any, res) => {
  const deleted = await Ticket.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Ticket not found" });
  res.json({ message: "Ticket permanently deleted" });
});

export default router;
