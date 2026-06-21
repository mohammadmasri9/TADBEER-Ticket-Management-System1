import { Router } from "express";
import ticketRoutes from "./ticket.routes";
import healthRoutes from "./health.routes";

const router = Router();

// Health check route
router.use("/", healthRoutes);

// Tickets routes
router.use("/tickets", ticketRoutes);

export default router;
