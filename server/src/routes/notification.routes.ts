// server/src/routes/notification.routes.ts
import { Router } from "express";
import Notification from "../models/Notification.model"; // ✅ adjust if your file name differs
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();

// ✅ Let preflight pass without auth
router.options("*", (_req, res) => res.sendStatus(204));

// All notification routes require login
router.use(requireAuth);

// GET /api/notifications (current user)
router.get("/", async (req: any, res) => {
  const userId = req.user.userId;

  const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
  res.json(notifications);
});

// PATCH /api/notifications/read-all
router.patch("/read-all", async (req: any, res) => {
  const userId = req.user.userId;

  await Notification.updateMany({ userId, isRead: false }, { isRead: true });

  res.json({ message: "All notifications marked as read" });
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req: any, res) => {
  const userId = req.user.userId;

  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId },
    { isRead: true },
    { new: true }
  );

  if (!notif) {
    return res.status(404).json({ message: "Notification not found" });
  }

  res.json(notif);
});

// ✅ DELETE /api/notifications/:id
router.delete("/:id", async (req: any, res) => {
  const userId = req.user.userId;

  const deleted = await Notification.findOneAndDelete({
    _id: req.params.id,
    userId, // ✅ only owner can delete
  });

  if (!deleted) {
    return res.status(404).json({ message: "Notification not found" });
  }

  res.json({ message: "Notification deleted" });
});

export default router;
