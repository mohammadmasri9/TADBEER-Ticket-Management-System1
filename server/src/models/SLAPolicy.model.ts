// server/src/models/SLAPolicy.model.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type SLAPriority = "low" | "medium" | "high" | "urgent";

export interface ISLAPolicy extends Document {
  name: string;
  description?: string;
  priority: SLAPriority;
  responseTime: number; // minutes
  resolutionTime: number; // minutes
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SLAPolicySchema = new Schema<ISLAPolicy>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    priority: {
      type: String,
      required: true,
      unique: true,
      enum: ["low", "medium", "high", "urgent"],
    },
    responseTime: { type: Number, required: true, min: 1 },
    resolutionTime: { type: Number, required: true, min: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const SLAPolicy: Model<ISLAPolicy> =
  mongoose.models.SLAPolicy || mongoose.model<ISLAPolicy>("SLAPolicy", SLAPolicySchema, "SLAPolicies");

export default SLAPolicy;
