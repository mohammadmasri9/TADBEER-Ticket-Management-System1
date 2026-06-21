import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/health", (_req, res) => {
  const state = mongoose.connection.readyState;

  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const status = ["Disconnected", "Connected", "Connecting", "Disconnecting"];

  res.json({
    status: status[state],
    code: state
  });
});

export default router;
