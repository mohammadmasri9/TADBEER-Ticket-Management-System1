// server/src/models/User.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

/* =========================
   Types
========================= */
export type UserRole = "user" | "agent" | "manager" | "admin";
export type UserStatus = "available" | "busy" | "offline";

/* =========================
   Interface
========================= */
export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;

  role: UserRole;
  status: UserStatus;

  avatar?: string;

  // Legacy / display only (can be removed later)
  department?: string;

  // ✅ MAIN RELATION FIELD
  departmentId?: Types.ObjectId;

  phone?: string;
  expertise?: string[];

  createdAt: Date;
  updatedAt: Date;
}

/* =========================
   Schema
========================= */
const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "agent", "manager", "admin"],
      default: "user",
      index: true,
    },

    status: {
      type: String,
      enum: ["available", "busy", "offline"],
      default: "offline",
      index: true,
    },

    avatar: {
      type: String,
    },

    // ⚠️ Legacy field (string)
    department: {
      type: String,
      trim: true,
    },

    // ✅ Proper relation
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      index: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    expertise: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

/* =========================
   Indexes
========================= */
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });
UserSchema.index({ departmentId: 1 });

/* =========================
   Model
========================= */
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
