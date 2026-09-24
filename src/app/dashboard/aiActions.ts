"use server";

import { randomUUID } from "node:crypto";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnomalies } from "@/lib/anomalies";
import { askAboutOrganization } from "@/lib/ai";
import { formatDate, addDuration } from "@/lib/format";
import { daysUntil } from "@/lib/urgency";
import { ACTIVE_TASK_SCOPE } from "@/lib/activeTaskScope";
import { employeeAccessWhere, isOrganizationAdmin, taskAccessWhere, type MembershipAccess } from "@/lib/accessPolicy";
import {
  COPILOT_REQUESTS_PER_HOUR,
  isCopilotRateLimited,
} from "@/lib/copilotPolicy";

// Plafonds volontaires, indépendants de la taille réelle de
// l'organisation — jamais laisser le contexte (donc le coût et le
// temps de réponse) grandir sans limite avec le nombre de salariés.
const MAX_EMPLOYEES_IN_CONTEXT = 60;
const MAX_OVERDUE_TASKS_IN_CONTEXT = 15;
const MAX_UPCOMING_TASKS_IN_CONTEXT = 15;

function taskTemporalStatus(dueDate: Date, today = new Date()): string {
  const diff = daysUntil(dueDate, today);
  if (diff < 0) return `EN RETARD de ${Math.abs(diff)} jour${Math.abs(diff) > 1 ? "s" : ""}`;
  if (diff === 0) return "ÉCHÉANCE AUJOURD'HUI — pas encore en retard";
  if (diff === 1) return "ÉCHÉANCE DEMAIN";
  return `ÉCHÉANCE DANS ${diff} JOURS`;
}

async function buildContext(membership: MembershipAccess): Promise<string> {
  const organizationId = membership.organizationId;
  const now = new Date();
  // Requêtes séquentielles : le pool PostgreSQL de production est petit.
  // Le Copilote privilégie la fiabilité à quelques millisecondes gagnées
  // par une rafale de requêtes simultanées.
  const employees = await prisma.employee.findMany({
    where: { organizationId, deletedAt: null, ...employeeAccessWhere(membership) },
    orderBy: { hireDate: "desc" },
    take: MAX_EMPLOYEES_IN_CONTEXT,
  });

  const anomalies = isOrganizationAdmin(membership)
    ? await getAnomalies(organizationId)
    : [];

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const overdueTasks = await prisma.task.findMany({
    where: {
      organizationId,
      status: { notIn: ["DONE", "CANCELLED"] },
      dueDate: { lt: todayStart },
      AND: [ACTIVE_TASK_SCOPE, taskAccessWhere(membership)],
    },
    include: { employeeEvent: { include: { employee: true } } },
    orderBy: { dueDate: "desc" },
    take: MAX_OVERDUE_TASKS_IN_CONTEXT,
  });

  const upcomingTasks = await prisma.task.findMany({
    where: {
      organizationId,
      status: { notIn: ["DONE", "CANCELLED"] },
      dueDate: { gte: todayStart, lte: horizon },
      AND: [ACTIVE_TASK_SCOPE, taskAccessWhere(membership)],
    },
    include: { employeeEvent: { include: { employee: true } } },
    orderBy: { dueDate: "asc" },
    take: MAX_UPCOMING_TASKS_IN_CONTEXT,
  });

  const contextTasks = [...overdueTasks, ...upcomingTasks];

  const employeeLines = employees.map((e) => {
    const parts = [`${e.firstName} ${e.lastName}`, `embauché·e le ${formatDate(e.hireDate)}`];
    if (e.contractType) parts.push(`contrat : ${e.contractType}`);
    if (e.probationDuration && e.probationDurationUnit) {
      const end = addDuration(e.hireDate, e.probationDuration, e.probationDurationUnit);
      parts.push(`période d'essai jusqu'au ${formatDate(end)}`);
    }
    if (e.contractEndDate) parts.push(`fin de contrat le ${formatDate(e.contractEndDate)}`);
    if (e.nextMedicalVisitDate) {
      parts.push(`prochaine visite médicale enregistrée : ${formatDate(e.nextMedicalVisitDate)}`);
    } else {
      // Important : l'absence de date dans la fiche courante ne prouve jamais
      // qu'aucune visite n'a eu lieu auparavant.
      parts.push("aucune prochaine date de visite médicale enregistrée dans cette fiche");
    }
    return `- ${parts.join(", ")}`;
  });

  const anomalyLines = anomalies.map(
    (a) => `- [SUGGESTION ${a.severity}] ${a.message} — ceci est un signal calculé, pas un fait historique supplémentaire.`
  );

  const taskLines = contextTasks.map((t) => {
    const employeeName = `${t.employeeEvent.employee.firstName} ${t.employeeEvent.employee.lastName}`;
    return `- [TÂCHE ENREGISTRÉE] ${t.label} pour ${employeeName}, échéance le ${formatDate(t.dueDate)}, ${taskTemporalStatus(t.dueDate, now)}, statut applicatif : ${t.status}`;
  });

  return [
    "RÈGLE DE LECTURE DU CONTEXTE : une donnée absente n'est pas un événement non réalisé. Les lignes marquées SUGGESTION sont des signaux à vérifier, pas des faits supplémentaires.",
    "",
    `FAITS ENREGISTRÉS — SALARIÉS (${employees.length}${employees.length === MAX_EMPLOYEES_IN_CONTEXT ? "+, liste limitée aux plus récents" : ""}) :`,
    employeeLines.join("\n") || "Aucun salarié enregistré.",
    "",
    `SUGGESTIONS / SIGNAUX À VÉRIFIER (${anomalies.length}) :`,
    anomalyLines.join("\n") || "Aucune suggestion active.",
    "",
    `FAITS ENREGISTRÉS — TÂCHES OUVERTES : RETARDS RÉCENTS ET 30 PROCHAINS JOURS (${contextTasks.length}) :`,
    taskLines.join("\n") || "Aucune tâche à échéance proche.",
  ].join("\n");
}

export type AskAboutOrganizationState = { answer: string; error: string; question: string } | undefined;

export async function askAboutOrganizationAction(
  _prevState: AskAboutOrganizationState,
  formData: FormData
): Promise<AskAboutOrganizationState> {
  const membership = await getCurrentMembership();
  const question = String(formData.get("question") ?? "").trim();

  if (!membership) {
    return { answer: "", error: "Non authentifié ou aucune organisation active.", question };
  }
  if (!question) return { answer: "", error: "Veuillez poser une question.", question };
  if (question.length > 500) {
    return { answer: "", error: "Question trop longue (500 caractères maximum).", question };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentRequests = await prisma.auditLog.count({
    where: {
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      action: "copilot.question",
      createdAt: { gte: oneHourAgo },
    },
  });

  if (isCopilotRateLimited(recentRequests)) {
    return {
      answer: "",
      question,
      error: `Le Copilote a atteint sa limite de ${COPILOT_REQUESTS_PER_HOUR} questions par heure pour votre compte. Réessayez un peu plus tard.`,
    };
  }

  try {
    const context = await buildContext(membership);

    // Journaliser l'usage sans stocker le texte de la question : on
    // protège le budget IA sans conserver de contenu potentiellement sensible.
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: membership.userId,
        action: "copilot.question",
        entityType: "Membership",
        entityId: membership.id,
        metadata: { questionLength: question.length },
      },
    });

    const answer = await askAboutOrganization(question, context);
    return { answer, error: "", question };
  } catch (err) {
    // Ne jamais renvoyer le message d'erreur brut de l'API à
    // l'écran — un vrai souci de clé/quota ne doit jamais s'afficher
    // en anglais technique à un utilisateur RH.
    console.error("Erreur askAboutOrganizationAction:", err);
    return {
      answer: "",
      question,
      error:
        err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")
          ? "Cette fonctionnalité n'est pas encore activée."
          : "Une erreur est survenue, veuillez réessayer.",
    };
  }
}
