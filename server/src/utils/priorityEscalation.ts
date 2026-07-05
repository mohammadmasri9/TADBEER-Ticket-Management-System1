// server/src/utils/priorityEscalation.ts
import Ticket, { TicketPriority } from "../models/Ticket.model";
import { createNotification } from "./notify";

const PRIORITY_ORDER: TicketPriority[] = ["low", "medium", "high", "urgent"];

export function nextPriorityTier(current: TicketPriority): TicketPriority | null {
  const idx = PRIORITY_ORDER.indexOf(current);
  if (idx === -1 || idx === PRIORITY_ORDER.length - 1) return null;
  return PRIORITY_ORDER[idx + 1];
}

/**
 * Atomically escalates a ticket's priority one tier, guarded by `guardField`
 * so concurrent callers (SLA job tick + sentiment detection) can't double-escalate
 * the same ticket. Returns null if already escalated (guard already set) or already
 * at the top tier (still notifies in that case, since it can't escalate further).
 */
export async function escalatePriority(params: {
  ticketId: string;
  currentPriority: TicketPriority;
  guardField: "slaWarnedAt" | "slaEscalatedAt";
  reason: string;
}) {
  const { ticketId, currentPriority, guardField, reason } = params;
  const next = nextPriorityTier(currentPriority);

  const update: Record<string, any> = { [guardField]: new Date() };
  if (next) update.priority = next;

  const updated = await Ticket.findOneAndUpdate(
    { _id: ticketId, [guardField]: null },
    { $set: update },
    { new: true }
  )
    .populate("assignee", "_id")
    .populate({ path: "departmentId", select: "managerId", populate: { path: "managerId", select: "_id" } });

  if (!updated) return null; // already handled by another path this cycle

  const assigneeId = (updated as any).assignee?._id?.toString?.();
  const managerId = (updated as any).departmentId?.managerId?._id?.toString?.();
  const recipients = Array.from(new Set([assigneeId, managerId].filter(Boolean)));

  const message = next
    ? `Ticket "${updated.title}" was auto-escalated to ${next} priority: ${reason}`
    : `Ticket "${updated.title}" (already urgent) needs attention: ${reason}`;

  await Promise.all(
    recipients.map((userId) =>
      createNotification({
        userId: userId as string,
        type: "ticket_overdue",
        title: next ? "Ticket Auto-Escalated" : "Urgent Ticket Needs Attention",
        message,
        link: `/tickets/${updated._id}`,
      })
    )
  );

  return updated;
}
