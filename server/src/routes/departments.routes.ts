// server/src/routes/departments.routes.ts
import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";

import Department from "../models/departments.model"; // ✅ FIXED import
import User from "../models/User.model"; // ✅ ensure this path matches your user model file

import { requireAuth, requireRole } from "../middlewares/auth.middleware";

const router = Router();
router.use(requireAuth);

const isValidObjectId = (id: string) => mongoose.isValidObjectId(id);

const createDepartmentSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  managerId: z.string().optional(),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

type TUserAny = any;

/**
 * ✅ Helper:
 * When setting a department manager -> ensure:
 * - user.role = "manager"
 * - user.departmentId = dept._id
 * - user.department = dept.name (optional but helpful)
 */
async function applyManagerRoleAndDepartment(managerId: string, deptId: string, deptName: string) {
  if (!managerId) return;

  if (!isValidObjectId(managerId)) throw new Error("Invalid managerId");

  const user = (await User.findById(managerId)) as TUserAny;
  if (!user) throw new Error("Manager user not found");

  user.role = "manager";
  user.departmentId = new mongoose.Types.ObjectId(deptId);
  user.department = deptName;

  await user.save();
}

/**
 * ✅ Optional cleanup:
 * If manager changes -> remove department link from OLD manager (only if it points to this dept)
 */
async function cleanupOldManager(oldManagerId?: string, deptId?: string) {
  if (!oldManagerId || !deptId) return;
  if (!isValidObjectId(oldManagerId)) return;

  const oldManager = (await User.findById(oldManagerId)) as TUserAny;
  if (!oldManager) return;

  const oldDeptId = oldManager.departmentId?.toString?.() || String(oldManager.departmentId || "");
  if (oldDeptId === deptId) {
    // we don't force role back (could be manager elsewhere) — just unlink this dept
    oldManager.departmentId = undefined;
    oldManager.department = undefined;
    await oldManager.save();
  }
}

/* =========================
   GET /api/departments
   - authenticated users
========================= */
router.get("/", async (_req, res) => {
  try {
    const departments = await Department.find()
      .populate("managerId", "name email role departmentId department")
      .sort({ name: 1 });

    return res.json(departments);
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

/* =========================
   GET /api/departments/:id
========================= */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid department id" });

    const department = await Department.findById(id).populate("managerId", "name email role departmentId department");
    if (!department) return res.status(404).json({ message: "Department not found" });

    return res.json(department);
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

/* =========================
   POST /api/departments
   - admin only
========================= */
router.post("/", requireRole("admin"), async (req, res) => {
  try {
    const data = createDepartmentSchema.parse(req.body);

    if (data.managerId && !isValidObjectId(data.managerId)) {
      return res.status(400).json({ message: "Invalid managerId" });
    }

    const dept = await Department.create({
      name: data.name.trim(),
      description: data.description?.trim(),
      managerId: data.managerId ? new mongoose.Types.ObjectId(data.managerId) : undefined,
    });

    if (data.managerId) {
      await applyManagerRoleAndDepartment(data.managerId, dept._id.toString(), dept.name);
    }

    const full = await Department.findById(dept._id).populate(
      "managerId",
      "name email role departmentId department"
    );
    return res.status(201).json(full);
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });

    // handle unique name collision nicely
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Department name already exists" });
    }

    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

/* =========================
   PUT /api/departments/:id
   - admin only
========================= */
router.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid department id" });

    const data = updateDepartmentSchema.parse(req.body);

    if (data.managerId && !isValidObjectId(data.managerId)) {
      return res.status(400).json({ message: "Invalid managerId" });
    }

    // grab old manager before update (for cleanup if manager changed)
    const before = await Department.findById(id).select("managerId name");
    if (!before) return res.status(404).json({ message: "Department not found" });

    const oldManagerId = before.managerId?.toString?.();

    const updated = await Department.findByIdAndUpdate(
      id,
      {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() } : {}),
        ...(data.managerId !== undefined
          ? { managerId: data.managerId ? new mongoose.Types.ObjectId(data.managerId) : undefined }
          : {}),
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Department not found" });

    const newManagerId = (data.managerId ?? undefined) as string | undefined;

    // if manager changed -> cleanup old manager link
    if (oldManagerId && newManagerId && oldManagerId !== newManagerId) {
      await cleanupOldManager(oldManagerId, updated._id.toString());
    }

    // if manager set -> force role manager + set departmentId
    if (newManagerId) {
      await applyManagerRoleAndDepartment(newManagerId, updated._id.toString(), updated.name);
    }

    // if name changed -> update users who point to this departmentId (optional but useful)
    if (data.name) {
      await User.updateMany(
        { departmentId: new mongoose.Types.ObjectId(updated._id.toString()) } as any,
        { $set: { department: updated.name } } as any
      );
    }

    const full = await Department.findById(updated._id).populate(
      "managerId",
      "name email role departmentId department"
    );
    return res.json(full);
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });

    if (err?.code === 11000) {
      return res.status(409).json({ message: "Department name already exists" });
    }

    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

/* =========================
   DELETE /api/departments/:id
   - admin only
========================= */
router.delete("/:id", requireRole("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid department id" });

    const deleted = await Department.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Department not found" });

    // optional cleanup: unset departmentId from users who were in that department
    await User.updateMany(
      { departmentId: new mongoose.Types.ObjectId(id) } as any,
      { $unset: { departmentId: "", department: "" } } as any
    );

    return res.json({ message: "Department deleted" });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
});

export default router;
