// server/src/routes/users.routes.ts
import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import bcrypt from "bcryptjs";

import User from "../models/User.model";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();
router.use(requireAuth);

/* =========================
   Helpers
========================= */
const isValidObjectId = (id: string) => mongoose.isValidObjectId(id);

function normalizeId(val: any): string {
  return val?._id?.toString?.() ?? val?.toString?.() ?? "";
}

function getUserId(req: any): string {
  return String(req.user?.userId || req.user?._id || req.user?.id || "");
}

function getUserRole(req: any): string {
  return String(req.user?.role || "");
}

function getUserDeptId(req: any): string {
  return String(req.user?.departmentId || "");
}

function shapeUser(u: any) {
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    department: u.department,
    departmentId: u.departmentId,
    status: u.status,
    phone: u.phone,
    expertise: u.expertise || [],
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

/* =========================
   Routes
========================= */

/**
 * ✅ GET /api/users/department-employees
 * manager: users + agents in same department
 * admin: pass ?departmentId=
 */
router.get(
  "/department-employees",
  requireRole("manager", "admin"),
  async (req: any, res) => {
    try {
      const role = getUserRole(req);
      const myDeptId = getUserDeptId(req);
      const deptFromQuery = String(req.query?.departmentId || "");

      const deptId = role === "manager" ? myDeptId : deptFromQuery || "";

      if (!deptId || !isValidObjectId(deptId)) {
        return res.status(400).json({
          message:
            role === "manager"
              ? "Manager has no departmentId configured"
              : "departmentId query is required for admin",
        });
      }

      const users = await User.find({
        departmentId: new mongoose.Types.ObjectId(deptId),
        role: { $in: ["agent", "user"] }, // ✅ BOTH
      })
        .select("_id name email role departmentId department status phone expertise createdAt updatedAt")
        .sort({ name: 1 });

      return res.json(users.map(shapeUser));
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Server error" });
    }
  }
);

/**
 * ✅ GET /api/users
 * Admin only
 */
router.get("/", requireRole("admin"), async (_req, res) => {
  const users = await User.find()
    .select("_id name email role departmentId department status phone expertise createdAt updatedAt")
    .sort({ createdAt: -1 });

  res.json(users.map(shapeUser));
});

/**
 * ✅ GET /api/users/:id
 * admin: any
 * self: allowed
 * manager: can read users in same department
 */
router.get("/:id", async (req: any, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });

  const role = getUserRole(req);
  const me = getUserId(req);
  const myDeptId = getUserDeptId(req);

  // self
  if (id === me) {
    const self = await User.findById(id).select("-passwordHash");
    if (!self) return res.status(404).json({ message: "User not found" });
    return res.json(shapeUser(self));
  }

  // admin
  if (role === "admin") {
    const u = await User.findById(id).select("-passwordHash");
    if (!u) return res.status(404).json({ message: "User not found" });
    return res.json(shapeUser(u));
  }

  // manager can read users inside same dept
  if (role === "manager") {
    if (!myDeptId || !isValidObjectId(myDeptId)) {
      return res.status(403).json({ message: "Forbidden: manager has no departmentId" });
    }

    const u = await User.findById(id).select("-passwordHash");
    if (!u) return res.status(404).json({ message: "User not found" });

    const uDept = normalizeId(u.departmentId);
    if (!uDept || uDept !== String(myDeptId)) {
      return res.status(403).json({ message: "Forbidden: not in your department" });
    }

    return res.json(shapeUser(u));
  }

  return res.status(403).json({ message: "Forbidden" });
});

/**
 * ✅ POST /api/users
 * Admin only
 */
router.post("/", requireRole("admin"), async (req, res) => {
  const schema = z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["user", "agent", "manager", "admin"]).default("user"),
    status: z.enum(["available", "busy", "offline"]).optional(),
    department: z.string().optional(),
    departmentId: z.string().optional(),
    phone: z.string().optional(),
    expertise: z.array(z.string()).optional(),
  });

  try {
    const data = schema.parse(req.body);

    const exists = await User.findOne({ email: data.email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const passwordHash = await bcrypt.hash(data.password, 10);

    const depId =
      data.departmentId && isValidObjectId(data.departmentId)
        ? new mongoose.Types.ObjectId(data.departmentId)
        : undefined;

    const created = await User.create({
      name: data.name.trim(),
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role,
      status: data.status || "offline",
      department: data.department,
      departmentId: depId,
      phone: data.phone,
      expertise: data.expertise || [],
    });

    return res.status(201).json(shapeUser(created));
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

/**
 * ✅ PUT /api/users/:id
 * admin: update any user
 * self: limited update (name/phone)
 */
router.put("/:id", async (req: any, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });

  const role = getUserRole(req);
  const me = getUserId(req);

  const adminSchema = z.object({
    name: z.string().min(2).max(120).optional(),
    role: z.enum(["user", "agent", "manager", "admin"]).optional(),
    status: z.enum(["available", "busy", "offline"]).optional(),
    department: z.string().optional(),
    departmentId: z.string().optional(),
    phone: z.string().optional(),
    expertise: z.array(z.string()).optional(),
  });

  const selfSchema = z.object({
    name: z.string().min(2).max(120).optional(),
    phone: z.string().optional(),
  });

  try {
    const parsed = role === "admin" ? adminSchema.parse(req.body) : selfSchema.parse(req.body);

    if (role !== "admin" && id !== me) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const update: any = { ...parsed };

    // ✅ TS-safe: read departmentId only from req.body in admin mode
    if (role === "admin") {
      const depIdRaw = req.body?.departmentId;

      if (depIdRaw !== undefined) {
        if (depIdRaw && !isValidObjectId(String(depIdRaw))) {
          return res.status(400).json({ message: "Invalid departmentId" });
        }

        update.departmentId = depIdRaw
          ? new mongoose.Types.ObjectId(String(depIdRaw))
          : undefined;
      }
    }

    const updated = await User.findByIdAndUpdate(id, update, { new: true }).select(
      "-passwordHash"
    );

    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json(shapeUser(updated));
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

/**
 * ✅ DELETE /api/users/:id
 * Admin only
 */
router.delete("/:id", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid user id" });

  const deleted = await User.findByIdAndDelete(id);
  if (!deleted) return res.status(404).json({ message: "User not found" });

  res.json({ message: "User deleted" });
});

export default router;
