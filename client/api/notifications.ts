// client/api/notifications.ts
import api from "./api";

export type NotificationType =
  | "ticket_assigned"
  | "ticket_updated"
  | "comment_added"
  | "ticket_overdue"
  | "system";

export interface NotificationDTO {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function getNotifications() {
  const res = await api.get<NotificationDTO[]>("/api/notifications");
  return res.data;
}

export async function markNotificationAsRead(id: string) {
  const res = await api.patch<NotificationDTO>(`/api/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsAsRead() {
  const res = await api.patch<{ message: string }>("/api/notifications/read-all");
  return res.data;
}

// ✅ NEW
export async function deleteNotification(id: string) {
  const res = await api.delete<{ message: string }>(`/api/notifications/${id}`);
  return res.data;
}
