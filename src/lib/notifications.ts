import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, renderNotificationEmail } from "@/lib/email";
import { formatRelativeDueDate, isOverdue, daysUntil } from "@/lib/urgency";
import { getUserDisplayName } from "@/lib/displayName";
import { ACTIVE_TASK_SCOPE } from "@/lib/activeTaskScope";
import { taskAccessWhere, type MembershipAccess } from "@/lib/accessPolicy";
import { getAppUrl } from "@/lib/appUrl";
import {
  scheduledDigestPeriodStart,
  scheduledDigestType,
  type DigestType,
} from "@/lib/notificationSchedule";

const DIGEST_ITEMS_LIMIT = 10;

async function getAttentionTasksForMembership(membership: DigestMembership) {
  const tasks = await prisma.task.findMany({
    where: {
      organizationId: membership.organizationId,
      status: { notIn: ["DONE", "CANCELLED"] },
      AND: [ACTIVE_TASK_SCOPE, taskAccessWhere(membership)],
    },
    include: { employeeEvent: { include: { employee: true } } },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  return tasks.filter((task) => {
    if (isOverdue(task.dueDate, task.status, now)) return true;
    const diff = daysUntil(task.dueDate, now);
    return diff >= 0 && diff <= 7;
  });
}

export async function sendManualReminder({
  taskId,
  organizationId,
  actorUserId,
  requester,
}: {
  taskId: string;
  organizationId: string;
  actorUserId: string;
  requester: MembershipAccess;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      organizationId,
      status: { notIn: ["DONE", "CANCELLED"] },
      AND: [ACTIVE_TASK_SCOPE, taskAccessWhere(requester)],
    },
    include: {
      employeeEvent: { include: { employee: true } },
      assignedMembership: { include: { user: true } },
    },
  });

  if (!task) {
    return { ok: false, error: "Cette tâche n'est plus active dans cette organisation." };
  }
  if (
    !task.assignedMembership ||
    task.assignedMembership.deletedAt ||
    task.assignedMembership.user.deletedAt
  ) {
    return { ok: false, error: "Cette tâche n'est assignée à aucun membre actif : assignez-la d'abord." };
  }

  const appUrl = getAppUrl();
  const taskUrl = `${appUrl}/dashboard/events/${task.employeeEventId}#task-${task.id}`;
  const html = renderNotificationEmail({
    greeting: `Bonjour ${getUserDisplayName(task.assignedMembership.user)},`,
    intro: `Un rappel concernant une action à réaliser pour ${task.employeeEvent.employee.firstName} ${task.employeeEvent.employee.lastName} :`,
    sections: [
      {
        title: "",
        items: [
          {
            label: task.label,
            meta: formatRelativeDueDate(task.dueDate),
            url: taskUrl,
          },
        ],
      },
    ],
    ctaLabel: "Voir la tâche",
    ctaUrl: taskUrl,
  });

  const subject = `Rappel : ${task.label}`;
  const result = await sendEmail({
    to: task.assignedMembership.user.email,
    subject,
    html,
  });

  await prisma.notification.create({
    data: {
      id: randomUUID(),
      organizationId,
      recipientMembershipId: task.assignedMembership.id,
      type: "manual_reminder",
      subject,
      taskId: task.id,
      employeeEventId: task.employeeEventId,
      sentByUserId: actorUserId,
      delivered: result.ok,
    },
  });

  return result;
}

type DigestMembership = MembershipAccess & {
  user: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
};

type DigestOutcome = "sent" | "skipped_empty" | "skipped_already_sent" | "failed";

async function sendDigestToMembership(
  membership: DigestMembership,
  type: DigestType,
  options?: { dedupeSince?: Date }
): Promise<DigestOutcome> {
  if (options?.dedupeSince) {
    const alreadyDelivered = await prisma.notification.findFirst({
      where: {
        organizationId: membership.organizationId,
        recipientMembershipId: membership.id,
        type,
        delivered: true,
        sentAt: { gte: options.dedupeSince },
      },
      select: { id: true },
    });
    if (alreadyDelivered) return "skipped_already_sent";
  }

  const tasks = await getAttentionTasksForMembership(membership);
  if (tasks.length === 0) return "skipped_empty";

  const appUrl = getAppUrl();
  const frequencyLabel = type === "digest_daily" ? "quotidien" : "hebdomadaire";
  const organizationWide =
    membership.accessRole === "OWNER" || membership.accessRole === "ADMIN";
  const subject = `RH Pilot : ${tasks.length} action${tasks.length > 1 ? "s" : ""} à surveiller`;

  const toItem = (task: (typeof tasks)[number]) => ({
    label: `${task.label} (${task.employeeEvent.employee.firstName} ${task.employeeEvent.employee.lastName})`,
    meta: formatRelativeDueDate(task.dueDate),
    url: `${appUrl}/dashboard/events/${task.employeeEventId}#task-${task.id}`,
  });

  const overdue = tasks.filter((task) => isOverdue(task.dueDate, task.status));
  const today = tasks.filter(
    (task) => !isOverdue(task.dueDate, task.status) && daysUntil(task.dueDate) === 0
  );
  const thisWeek = tasks.filter(
    (task) => !isOverdue(task.dueDate, task.status) && daysUntil(task.dueDate) > 0
  );

  const ordered = [...overdue, ...today, ...thisWeek];
  const visible = new Set(ordered.slice(0, DIGEST_ITEMS_LIMIT).map((task) => task.id));
  const moreCount = Math.max(0, tasks.length - DIGEST_ITEMS_LIMIT);

  const html = renderNotificationEmail({
    greeting: `Bonjour ${getUserDisplayName(membership.user)},`,
    intro: organizationWide
      ? `Voici votre résumé ${frequencyLabel} des actions de l'organisation qui méritent votre attention :`
      : `Voici votre résumé ${frequencyLabel} des actions de votre périmètre qui méritent votre attention :`,
    summary: {
      overdueCount: overdue.length,
      todayCount: today.length,
      thisWeekCount: thisWeek.length,
    },
    sections: [
      { title: "En retard", items: overdue.filter((t) => visible.has(t.id)).map(toItem) },
      { title: "Aujourd'hui", items: today.filter((t) => visible.has(t.id)).map(toItem) },
      { title: "Cette semaine", items: thisWeek.filter((t) => visible.has(t.id)).map(toItem) },
    ],
    moreCount,
    moreUrl: `${appUrl}/dashboard?view=tasks`,
    ctaLabel: "Ouvrir RH Pilot",
    ctaUrl: `${appUrl}/dashboard`,
  });

  const result = await sendEmail({ to: membership.user.email, subject, html });

  await prisma.notification.create({
    data: {
      id: randomUUID(),
      organizationId: membership.organizationId,
      recipientMembershipId: membership.id,
      type,
      subject,
      sentByUserId: null,
      delivered: result.ok,
    },
  });

  return result.ok ? "sent" : "failed";
}

function emptyDigestResults() {
  return { sent: 0, skippedEmpty: 0, skippedAlreadySent: 0, failed: 0 };
}

function addOutcome(
  results: ReturnType<typeof emptyDigestResults>,
  outcome: DigestOutcome
) {
  if (outcome === "sent") results.sent += 1;
  else if (outcome === "skipped_empty") results.skippedEmpty += 1;
  else if (outcome === "skipped_already_sent") results.skippedAlreadySent += 1;
  else results.failed += 1;
}

/**
 * Envoi manuel depuis l'interface : uniquement pour le membre courant.
 * Il reste disponible même si sa fréquence automatique est désactivée.
 */
export async function sendDueDigestNow(organizationId: string, membershipId: string) {
  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId,
      deletedAt: null,
      user: { deletedAt: null },
    },
    include: { user: true },
  });

  const results = emptyDigestResults();
  if (!membership) {
    results.failed = 1;
    return results;
  }

  const type: DigestType =
    membership.notificationFrequency === "WEEKLY" ? "digest_weekly" : "digest_daily";
  addOutcome(results, await sendDigestToMembership(membership, type));
  return results;
}

/**
 * Envoi appelé par le cron quotidien. Les DAILY partent chaque jour,
 * les WEEKLY le lundi (heure de Paris), et un second appel accidentel
 * le même jour ne renvoie jamais un digest déjà délivré.
 */
export async function sendScheduledDigests(now: Date = new Date()) {
  const memberships = await prisma.membership.findMany({
    where: {
      deletedAt: null,
      notificationFrequency: { in: ["DAILY", "WEEKLY"] },
      user: { deletedAt: null },
      organization: { deletedAt: null },
    },
    include: { user: true },
  });

  const results = emptyDigestResults();

  for (const membership of memberships) {
    const type = scheduledDigestType(membership.notificationFrequency, now);
    if (!type) continue;

    const dedupeSince = scheduledDigestPeriodStart(membership.notificationFrequency, now);
    const outcome = await sendDigestToMembership(membership, type, { dedupeSince });
    addOutcome(results, outcome);
  }

  return results;
}
