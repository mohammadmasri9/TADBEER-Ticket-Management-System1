// server/src/server.ts
import "dotenv/config";
import app from "./app";
import { connectDB } from "./config/db";
import { startSlaMonitor } from "./jobs/slaMonitor.job";

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  await connectDB();
  if (process.env.NODE_ENV !== "test") {
    startSlaMonitor();
  }
  app.listen(PORT, () => {
    console.log(`✅ API running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
