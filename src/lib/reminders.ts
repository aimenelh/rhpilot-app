import { prisma } from "@/lib/prisma";
import { sendEmail, renderNotificationEmail } from "@/lib/email";
import { getUserDisplayName } from "@/lib/displayName";
import { formatDate } from "@/lib/format";

function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Parcourt toutes les organisations ayant configuré au moins une
 * règle de relance, et envoie un email à chaque destinataire concerné
 * — jamais plus d'une fois pour la même tâche et la même règle,
 * jamais à quelqu'un qui n'a pas de vraie adresse (assigné ou
 * manager), jamais pour une tâche déjà terminée ou annulée.
 */
export async function sendConfiguredReminders(): Promise<{
  sent: number;
  skipped: number;
}> {
  const rules = await prisma.reminderRule.findMany({
    include: { organization: true },
  });

  let sent = 0;
  let skipped = 0;
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
        employeeEvent: { employee: { deletedAt: null } },
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
      const recipients: { membershipId: string; user: { firstName: string | null; lastName: string | null; email: string } }[] = [];

      if (rule.notifyAssignee && task.assignedMembership) {
        recipients.push({
          membershipId: task.assignedMembership.id,
          user: task.assignedMembership.user,
        });
      }
      if (rule.notifyManager) {
        const managerMembership = task.employeeEvent.employee.managerMembership;
        if (managerMembership && managerMembership.id !== task.assignedMembershipId) {
          recipients.push({ membershipId: managerMembership.id, user: managerMembership.user });
        }
      }

      for (const recipient of recipients) {
        // Une seule relance par règle et par tâche, jamais un doublon
        // si la tâche planifiée venait à se relancer le même jour.
        const alreadySent = await prisma.notification.findFirst({
          where: {
            organizationId: rule.organizationId,
            recipientMembershipId: recipient.membershipId,
            taskId: task.id,
            type: `reminder_rule_${rule.id}`,
          },
        });
        if (alreadySent) {
          skipped++;
          continue;
        }

        const subject = `RH Pilot : échéance dans ${rule.daysBeforeDue} jour${rule.daysBeforeDue > 1 ? "s" : ""}`;
        const html = renderNotificationEmail({
          greeting: `Bonjour ${getUserDisplayName(recipient.user)}`,
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
            organizationId: rule.organizationId,
            recipientMembershipId: recipient.membershipId,
            type: `reminder_rule_${rule.id}`,
            subject,
            taskId: task.id,
            employeeEventId: task.employeeEventId,
            sentByUserId: null, // envoi automatique
            delivered: result.ok,
          },
        });
        sent++;
      }
    }
  }

  return { sent, skipped };
}
