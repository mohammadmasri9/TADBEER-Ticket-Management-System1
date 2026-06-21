// server/src/app.ts
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/user.routes"; // ✅ make sure the file name is user.routes.ts
import ticketsRoutes from "./routes/ticket.routes";
import notificationsRoutes from "./routes/notification.routes";
import departmentsRoutes from "./routes/departments.routes";
import aiRoutes from "./routes/ai.routes";




const app = express();



/* =========================
   Core Middleware
========================= */
app.set("trust proxy", 1); // ✅ important for rate-limit + proxies (render/vercel/nginx)

app.use(
  helmet({
    crossOriginResourcePolicy: false, // ✅ avoid blocking images/files if needed
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* =========================
   CORS (MUST be before routes)
========================= */
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin(origin, cb) {
      // ✅ allow tools like Postman / server-to-server calls
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Handle preflight for ALL endpoints (important for Authorization header)
app.options("*", cors());

/* =========================
   Rate Limit + Logs
========================= */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

/* =========================
   Health
========================= */
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/* =========================
   Routes
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/tickets", ticketsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/departments", departmentsRoutes);
app.use("/api/ai", aiRoutes);

/* =========================
   404
========================= */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

/* =========================
   Error Handler
========================= */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // ✅ if CORS throws, respond cleanly
  if (String(err?.message || "").toLowerCase().includes("cors")) {
    return res.status(403).json({ message: err.message });
  }

  res.status(err?.status || 500).json({
    message: err?.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? undefined : err?.stack,
  });
});

export default app;
