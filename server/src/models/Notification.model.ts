// server/src/models/Notification.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type NotificationType =
  | "ticket_assigned"
  | "ticket_updated"
  | "comment_added"
  | "ticket_overdue"
  | "system";

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["ticket_assigned", "ticket_updated", "comment_added", "ticket_overdue", "system"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema, "Notifications");
  

export default Notification;
