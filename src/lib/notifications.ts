import { prisma } from "@/lib/prisma";
import { sendEmail, renderNotificationEmail } from "@/lib/email";
import { formatRelativeDueDate, isOverdue, daysUntil } from "@/lib/urgency";
import { getUserDisplayName } from "@/lib/displayName";

const DIGEST_ITEMS_LIMIT = 10;

function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

/**
 * Tâches ouvertes assignées à un membre précis, en retard ou à
 * échéance dans les 7 jours — le même calcul que "Votre attention est
 * requise" sur le tableau de bord, mais filtré sur une seule personne
 * plutôt que sur toute l'organisation. Une seule source de vérité pour
 * "qu'est-ce qui est urgent" (src/lib/urgency.ts), réutilisée ici.
 */
async function getAttentionTasksForMembership(organizationId: string, membershipId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      organizationId,
      assignedMembershipId: membershipId,
      status: { notIn: ["DONE", "CANCELLED"] },
    },
    include: { employeeEvent: { include: { employee: true } } },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  return tasks.filter((task) => {
    if (isOverdue(task.dueDate, task.status, now)) return true;
    const diff = Math.round(
      (task.dueDate.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
    );
    return diff >= 0 && diff <= 7;
  });
}

/**
 * Envoie un rappel immédiat pour UNE tâche précise, à la personne qui
 * lui est assignée — le "un clic pour relancer" demandé. Enregistre la
 * notification dans le journal quel que soit le résultat de l'envoi
 * (utile même en cas d'échec, pour comprendre ce qui a été tenté).
 */
export async function sendManualReminder({
  taskId,
  organizationId,
  actorUserId,
}: {
  taskId: string;
  organizationId: string;
  actorUserId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId },
    include: {
      employeeEvent: { include: { employee: true } },
      assignedMembership: { include: { user: true } },
    },
  });

  if (!task) return { ok: false, error: "Tâche introuvable dans cette organisation." };
  if (!task.assignedMembership) {
    return { ok: false, error: "Cette tâche n'est assignée à personne : assignez-la d'abord." };
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

/**
 * Envoie le résumé personnel d'un membre (ses tâches urgentes), et
 * journalise l'envoi. Ne envoie rien si sa liste est vide — un résumé
 * vide serait du bruit, pas de l'aide.
 */
async function sendDigestToMembership(
  organizationId: string,
  membership: { id: string; user: { email: string; firstName: string | null; lastName: string | null } },
  type: "digest_daily" | "digest_weekly"
): Promise<"sent" | "skipped_empty" | "failed"> {
  const tasks = await getAttentionTasksForMembership(organizationId, membership.id);
  if (tasks.length === 0) return "skipped_empty";

  const appUrl = getAppUrl();
  const frequencyLabel = type === "digest_daily" ? "quotidien" : "hebdomadaire";
  const subject = `RH Pilot : ${tasks.length} action${tasks.length > 1 ? "s" : ""} à surveiller`;

  const toItem = (task: (typeof tasks)[number]) => ({
    label: `${task.label} (${task.employeeEvent.employee.firstName} ${task.employeeEvent.employee.lastName})`,
    meta: formatRelativeDueDate(task.dueDate),
    url: `${appUrl}/dashboard/events/${task.employeeEventId}#task-${task.id}`,
  });

  // Regroupement par urgence plutôt qu'une liste plate — reste lisible
  // même avec beaucoup de salariés (même logique que la vue "Par
  // salarié" du tableau de bord, transposée à l'email).
  const overdue = tasks.filter((task) => isOverdue(task.dueDate, task.status));
  const today = tasks.filter(
    (task) => !isOverdue(task.dueDate, task.status) && daysUntil(task.dueDate) === 0
  );
  const thisWeek = tasks.filter(
    (task) => !isOverdue(task.dueDate, task.status) && daysUntil(task.dueDate) > 0
  );

  // Plafond global : on garde les plus urgentes en premier (retard,
  // puis aujourd'hui, puis le reste de la semaine), le surplus est
  // résumé par un lien plutôt que d'allonger l'email indéfiniment.
  const ordered = [...overdue, ...today, ...thisWeek];
  const visible = new Set(ordered.slice(0, DIGEST_ITEMS_LIMIT).map((task) => task.id));
  const moreCount = Math.max(0, tasks.length - DIGEST_ITEMS_LIMIT);

  const html = renderNotificationEmail({
    greeting: `Bonjour ${getUserDisplayName(membership.user)},`,
    intro: `Voici votre résumé ${frequencyLabel} des actions qui vous sont assignées et qui méritent votre attention :`,
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
      organizationId,
      recipientMembershipId: membership.id,
      type,
      subject,
      sentByUserId: null, // envoi automatique
      delivered: result.ok,
    },
  });

  return result.ok ? "sent" : "failed";
}

/**
 * Envoie les résumés à tous les membres actifs de l'organisation dont
 * la préférence correspond (hors "OFF"). Déclenché manuellement pour
 * l'instant via un bouton ("Envoyer maintenant") — le vrai
 * déclenchement automatique quotidien/hebdomadaire nécessite un cron,
 * qui ne peut fonctionner correctement qu'une fois RH Pilot déployé.
 */
export async function sendDueDigests(organizationId: string) {
  const memberships = await prisma.membership.findMany({
    where: {
      organizationId,
      deletedAt: null,
      notificationFrequency: { in: ["DAILY", "WEEKLY"] },
    },
    include: { user: true },
  });

  const results = { sent: 0, skippedEmpty: 0, failed: 0 };

  for (const membership of memberships) {
    const type = membership.notificationFrequency === "DAILY" ? "digest_daily" : "digest_weekly";
    const outcome = await sendDigestToMembership(organizationId, membership, type);
    if (outcome === "sent") results.sent += 1;
    else if (outcome === "skipped_empty") results.skippedEmpty += 1;
    else results.failed += 1;
  }

  return results;
}
