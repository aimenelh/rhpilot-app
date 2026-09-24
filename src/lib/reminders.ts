import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, renderNotificationEmail } from "@/lib/email";
import { getUserDisplayName } from "@/lib/displayName";
import { formatDate } from "@/lib/format";
import { ACTIVE_TASK_SCOPE } from "@/lib/activeTaskScope";
import { getAppUrl } from "@/lib/appUrl";

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Parcourt toutes les organisations ayant configuré au moins une règle
 * de relance. Une relance est considérée comme déjà faite uniquement
 * lorsqu'un email a réellement été délivré : un échec reste visible
 * dans l'historique et peut être retenté si le cron est relancé le même jour.
 */
export async function sendConfiguredReminders(): Promise<{
  sent: number;
  skipped: number;
  failed: number;
}> {
  const rules = await prisma.reminderRule.findMany({
    where: { organization: { deletedAt: null } },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const appUrl = getAppUrl();

  for (const rule of rules) {
    const targetDate = startOfDay(new Date());
    targetDate.setDate(targetDate.getDate() + rule.daysBeforeDue);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const tasks = await prisma.task.findMany({
      where: {
        organizationId: rule.organizationId,
        status: { notIn: ["DONE", "CANCELLED"] },
        dueDate: { gte: targetDate, lt: nextDay },
        ...ACTIVE_TASK_SCOPE,
      },
      include: {
        assignedMembership: { include: { user: true } },
        employeeEvent: {
          include: {
            employee: { include: { managerMembership: { include: { user: true } } } },
          },
        },
      },
    });

    for (const task of tasks) {
      const recipients: {
        membershipId: string;
        user: {
          firstName: string | null;
          lastName: string | null;
          email: string;
          deletedAt: Date | null;
        };
      }[] = [];

      if (
        rule.notifyAssignee &&
        task.assignedMembership &&
        !task.assignedMembership.deletedAt &&
        !task.assignedMembership.user.deletedAt
      ) {
        recipients.push({
          membershipId: task.assignedMembership.id,
          user: task.assignedMembership.user,
        });
      }

      if (rule.notifyManager) {
        const managerMembership = task.employeeEvent.employee.managerMembership;
        if (
          managerMembership &&
          !managerMembership.deletedAt &&
          !managerMembership.user.deletedAt &&
          managerMembership.id !== task.assignedMembershipId
        ) {
          recipients.push({ membershipId: managerMembership.id, user: managerMembership.user });
        }
      }

      for (const recipient of recipients) {
        const alreadyDelivered = await prisma.notification.findFirst({
          where: {
            organizationId: rule.organizationId,
            recipientMembershipId: recipient.membershipId,
            taskId: task.id,
            type: `reminder_rule_${rule.id}`,
            delivered: true,
          },
          select: { id: true },
        });

        if (alreadyDelivered) {
          skipped++;
          continue;
        }

        const subject = `RH Pilot : échéance dans ${rule.daysBeforeDue} jour${rule.daysBeforeDue > 1 ? "s" : ""}`;
        const html = renderNotificationEmail({
          greeting: `Bonjour ${getUserDisplayName(recipient.user)},`,
          intro: `Une échéance approche, dans ${rule.daysBeforeDue} jour${rule.daysBeforeDue > 1 ? "s" : ""} :`,
          sections: [
            {
              title: "Échéance à venir",
              items: [
                {
                  label: `${task.label} (${task.employeeEvent.employee.firstName} ${task.employeeEvent.employee.lastName})`,
                  meta: `Échéance le ${formatDate(task.dueDate)}`,
                  url: `${appUrl}/dashboard/events/${task.employeeEventId}#task-${task.id}`,
                },
              ],
            },
          ],
        });

        const result = await sendEmail({ to: recipient.user.email, subject, html });

        await prisma.notification.create({
          data: {
            id: randomUUID(),
            organizationId: rule.organizationId,
            recipientMembershipId: recipient.membershipId,
            type: `reminder_rule_${rule.id}`,
            subject,
            taskId: task.id,
            employeeEventId: task.employeeEventId,
            sentByUserId: null,
            delivered: result.ok,
          },
        });

        if (result.ok) sent++;
        else failed++;
      }
    }
  }

  return { sent, skipped, failed };
}
