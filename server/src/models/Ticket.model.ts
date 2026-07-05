// server/src/models/Ticket.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type TicketCategory = "Technical" | "Security" | "Feature" | "Account" | "Bug";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in-progress" | "pending" | "resolved" | "closed";

// ✅ Watcher permission
export type WatcherPermission = "read" | "write";

export interface ITicketAttachment {
  filename: string;
  url: string;
  mimetype?: string;
  size?: number;
  uploadedAt?: Date;
}

export interface ITicketWatcher {
  userId: Types.ObjectId;
  permission: WatcherPermission; // read | write
  addedBy?: Types.ObjectId;
  addedAt?: Date;
}

export interface ITicket extends Document {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;

  createdBy: Types.ObjectId;
  assignee?: Types.ObjectId;

  departmentId: Types.ObjectId;

  dueDate?: Date;
  attachments?: ITicketAttachment[];
  tags?: string[];

  // ✅ Watchers
  watchers?: ITicketWatcher[];

  estimatedTime?: number;
  actualTime?: number;

  embedding?: number[];
  resolution?: string;
  satisfactionRating?: number;

  closedAt?: Date;

  // ✅ SLA escalation guards (set once per breach cycle, cleared on manual priority change)
  slaWarnedAt?: Date | null;
  slaEscalatedAt?: Date | null;

  // ✅ Soft delete for recycle bin
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;

  archivedAt?: Date;
  archivedBy?: Types.ObjectId;

  // ✅ Favorites tracking (array of user IDs who favorited this ticket)
  favoritedBy?: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<ITicketAttachment>(
  {
    filename: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    mimetype: { type: String, trim: true },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const WatcherSchema = new Schema<ITicketWatcher>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    permission: { type: String, enum: ["read", "write"], default: "read" },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TicketSchema = new Schema<ITicket>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 5000 },

    category: {
      type: String,
      required: true,
      enum: ["Technical", "Security", "Feature", "Account", "Bug"],
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["open", "in-progress", "pending", "resolved", "closed"],
      default: "open",
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignee: { type: Schema.Types.ObjectId, ref: "User", default: null },

    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true },

    dueDate: { type: Date },
    attachments: { type: [AttachmentSchema], default: [] },
    tags: { type: [String], default: [] },

    // ✅ Watchers
    watchers: { type: [WatcherSchema], default: [] },

    estimatedTime: { type: Number },
    actualTime: { type: Number },

    embedding: { type: [Number], default: undefined },
    resolution: { type: String, trim: true },
    satisfactionRating: { type: Number, min: 1, max: 5 },

    closedAt: { type: Date },

    // ✅ SLA escalation guards
    slaWarnedAt: { type: Date, default: null },
    slaEscalatedAt: { type: Date, default: null },

    // ✅ Soft delete for recycle bin
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    archivedAt: { type: Date, default: null },
    archivedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    // ✅ Favorites tracking
    favoritedBy: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
  },
  { timestamps: true }
);

// Indexes
TicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
TicketSchema.index({ assignee: 1, status: 1 });
TicketSchema.index({ createdBy: 1, status: 1 });
TicketSchema.index({ category: 1, createdAt: -1 });

// Department routing
TicketSchema.index({ departmentId: 1, assignee: 1, status: 1, createdAt: -1 });
TicketSchema.index({ departmentId: 1, createdAt: -1 });

// ✅ Watchers index
TicketSchema.index({ "watchers.userId": 1, createdAt: -1 });

// ✅ Soft delete and favorites indexes
TicketSchema.index({ deletedAt: 1, deletedBy: 1 });
TicketSchema.index({ archivedAt: 1, archivedBy: 1 });
TicketSchema.index({ favoritedBy: 1 });

// Force collection name "Tickets"
const Ticket: Model<ITicket> =
  mongoose.models.Ticket || mongoose.model<ITicket>("Ticket", TicketSchema, "Tickets");

export default Ticket;
