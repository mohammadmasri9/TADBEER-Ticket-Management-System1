// src/config/db.ts
import mongoose from "mongoose";
import "dotenv/config";

export async function connectDB() {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    throw new Error("❌ Missing MONGO_URI in .env");
  }

  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI); // ✅ now it's type string
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}
