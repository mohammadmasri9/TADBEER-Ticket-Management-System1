import { MongoClient } from "mongodb";
import "dotenv/config";

async function run() {
  const uri = process.env.MONGO_URI;

  console.log("Using URI:", uri ? uri.replace(/:\/\/(.*):.*@/, "://$1:*****@") : uri);

  if (!uri) {
    console.error("❌ MONGODB_URI missing");
    return;
  }

  try {
    console.log("🔌 Trying to connect...");
    const client = new MongoClient(uri);
    await client.connect();
    console.log("✅ Connected!");
    await client.close();
  } catch (err) {
    console.error("❌ Test connection failed:");
    console.error(err);
  }
}

run();
