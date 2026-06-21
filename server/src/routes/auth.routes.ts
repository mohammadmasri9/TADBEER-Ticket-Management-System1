// server/src/routes/auth.routes.ts
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.model";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),

  // ✅ include manager (you use it everywhere else)
  role: z.enum(["user", "agent", "manager", "admin"]).optional(),

  // Legacy / display only
  department: z.string().optional(),

  // ✅ preferred
  departmentId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

function signToken(payload: { userId: string; role: string }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is missing in .env");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

function isValidObjectId(id: any) {
  return typeof id === "string" && mongoose.isValidObjectId(id);
}

function shapeUser(user: any) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,

    // ✅ include both (frontend uses departmentId mainly)
    department: user.department || undefined,
    departmentId: user.departmentId ? user.departmentId.toString() : undefined,

    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const exists = await User.findOne({ email: data.email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already exists" });

    const passwordHash = await bcrypt.hash(data.password, 10);

    const departmentId =
      data.departmentId && isValidObjectId(data.departmentId)
        ? new mongoose.Types.ObjectId(data.departmentId)
        : undefined;

    const user = await User.create({
      name: data.name.trim(),
      email: data.email.toLowerCase(),
      passwordHash,
      role: data.role || "user",
      department: data.department,
      departmentId,
      status: "available",
    });

    const token = signToken({ userId: user._id.toString(), role: user.role });

    return res.status(201).json({
      token,
      user: shapeUser(user),
    });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await User.findOne({ email: data.email.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(data.password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken({ userId: user._id.toString(), role: user.role });

    return res.json({
      token,
      user: shapeUser(user),
    });
  } catch (err: any) {
    if (err?.name === "ZodError") return res.status(400).json({ message: err.errors });
    return res.status(500).json({ message: err.message || "Server error" });
  }
});

// GET /api/auth/me (requires Authorization: Bearer <token>)
router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ message: "Missing token" });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ message: "JWT_SECRET missing" });

    const decoded = jwt.verify(token, secret) as { userId: string; role: string };

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ user: shapeUser(user) });
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
});

export default router;
