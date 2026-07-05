// server/src/jobs/slaMonitor.job.ts
import Ticket from "../models/Ticket.model";
import SLAPolicy from "../models/SLAPolicy.model";
import { escalatePriority } from "../utils/priorityEscalation";
import { createNotification } from "../utils/notify";

let isRunning = false;

async function checkSlaBreaches() {
  if (isRunning) return; // skip overlapping ticks
  isRunning = true;

  try {
    const policies = await SLAPolicy.find({ isActive: true });
    const policyByPriority = new Map(policies.map((p) => [p.priority, p]));
    if (!policyByPriority.size) return;

    const tickets = await Ticket.find({
      deletedAt: null,
      status: { $in: ["open", "in-progress", "pending"] },
    })
      .populate("assignee", "_id")
      .populate({ path: "departmentId", select: "managerId", populate: { path: "managerId", select: "_id" } });

    const now = Date.now();

    for (const ticket of tickets as any[]) {
      const policy = policyByPriority.get(ticket.priority);
      if (!policy) continue;

      const elapsedMinutes = (now - new Date(ticket.createdAt).getTime()) / 60000;

      if (elapsedMinutes >= policy.resolutionTime && !ticket.slaEscalatedAt) {
        await escalatePriority({
          ticketId: String(ticket._id),
          currentPriority: ticket.priority,
          guardField: "slaEscalatedAt",
          reason: `resolution SLA of ${policy.resolutionTime}m exceeded`,
        });
        continue;
      }

      if (elapsedMinutes >= policy.resolutionTime * 0.8 && !ticket.slaWarnedAt) {
        const warned = await Ticket.findOneAndUpdate(
          { _id: ticket._id, slaWarnedAt: null },
          { $set: { slaWarnedAt: new Date() } },
          { new: true }
        );
        if (!warned) continue;

        const assigneeId = ticket.assignee?._id?.toString?.();
        if (assigneeId) {
          await createNotification({
            userId: assigneeId,
            type: "ticket_overdue",
            title: "SLA Approaching Breach",
            message: `Ticket "${ticket.title}" is approaching its SLA resolution target (${policy.resolutionTime}m).`,
            link: `/tickets/${ticket._id}`,
          });
        }
      }
    }
  } catch (err) {
    console.error("❌ SLA monitor tick failed:", err);
  } finally {
    isRunning = false;
  }
}

export function startSlaMonitor() {
  const intervalMinutes = Number(process.env.SLA_CHECK_INTERVAL_MINUTES || 5);
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

  console.log(`🕒 SLA monitor started (every ${intervalMinutes}m)`);
  setInterval(checkSlaBreaches, intervalMs);
  // Also run once shortly after startup so breaches aren't only caught on the first full interval.
  setTimeout(checkSlaBreaches, 10_000);
}
