// server/src/models/Department.model.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  description?: string;
  managerId?: Types.ObjectId; // User who manages this department
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: 2,
      maxlength: 80,
    },
    description: { type: String, trim: true, maxlength: 500 },
    managerId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

DepartmentSchema.index({ name: 1 }, { unique: true });
DepartmentSchema.index({ managerId: 1 });

const Department: Model<IDepartment> =
  mongoose.models.Department ||
  mongoose.model<IDepartment>("Department", DepartmentSchema, "Departments"); // ✅ collection name

export default Department;
