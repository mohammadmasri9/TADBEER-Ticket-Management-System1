// server/src/models/Comment.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICommentAttachment {
  filename: string;
  url: string;
  mimetype?: string;
  size?: number;
  uploadedAt?: Date;
}

export interface IComment extends Document {
  ticketId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  attachments?: ICommentAttachment[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CommentAttachmentSchema = new Schema<ICommentAttachment>(
  {
    filename: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    mimetype: { type: String, trim: true },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CommentSchema = new Schema<IComment>(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: "Ticket", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: { type: [CommentAttachmentSchema], default: [] },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

CommentSchema.index({ ticketId: 1, createdAt: 1 });
CommentSchema.index({ userId: 1, createdAt: -1 });

const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);

export default Comment;
