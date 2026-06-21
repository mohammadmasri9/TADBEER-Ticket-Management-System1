// server/src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.model"; // ✅ FIX PATH

/* =========================
   Types
========================= */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: "user" | "agent" | "manager" | "admin";
    departmentId?: string;
  };
}

/* =========================
   Require Authentication
========================= */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({ message: "JWT_SECRET not configured" });
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string;
      role: "user" | "agent" | "manager" | "admin";
    };

    // ✅ Get role + departmentId from DB
    const dbUser = await User.findById(decoded.userId).select("role departmentId");

    if (!dbUser) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    req.user = {
      userId: decoded.userId,
      role: (dbUser.role as any) || decoded.role,
      departmentId: dbUser.departmentId ? dbUser.departmentId.toString() : undefined,
    };

    next();
  } catch (_error) {
    return res.status(401).json({ message: "Unauthorized: Invalid token" });
  }
};

/* =========================
   Require Role (RBAC)
========================= */
export const requireRole =
  (...allowedRoles: Array<"user" | "agent" | "manager" | "admin">) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: You do not have permission" });
    }

    next();
  };
