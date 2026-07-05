// server/src/utils/notify.ts
import Notification from "../models/Notification.model";

export type NotificationType =
  | "ticket_assigned"
  | "ticket_updated"
  | "comment_added"
  | "ticket_overdue"
  | "system";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    if (!params.userId) return;

    await Notification.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link,
      isRead: false,
    });
  } catch (err) {
    console.error("❌ Notification create failed:", err);
  }
}
