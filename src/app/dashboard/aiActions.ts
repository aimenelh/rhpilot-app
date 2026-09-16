"use server";

import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnomalies } from "@/lib/anomalies";
import { askAboutOrganization } from "@/lib/ai";
import { formatDate, addDuration } from "@/lib/format";
import { daysUntil } from "@/lib/urgency";

// Plafonds volontaires, indépendants de la taille réelle de
// l'organisation — jamais laisser le contexte (donc le coût et le
// temps de réponse) grandir sans limite avec le nombre de salariés.
const MAX_EMPLOYEES_IN_CONTEXT = 60;
const MAX_UPCOMING_TASKS_IN_CONTEXT = 30;

function taskTemporalStatus(dueDate: Date, today = new Date()): string {
  const diff = daysUntil(dueDate, today);
  if (diff < 0) return `EN RETARD de ${Math.abs(diff)} jour${Math.abs(diff) > 1 ? "s" : ""}`;
  if (diff === 0) return "ÉCHÉANCE AUJOURD'HUI — pas encore en retard";
  if (diff === 1) return "ÉCHÉANCE DEMAIN";
  return `ÉCHÉANCE DANS ${diff} JOURS`;
}

async function buildContext(organizationId: string): Promise<string> {
  const now = new Date();
  const [employees, anomalies, upcomingTasks] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { hireDate: "desc" },
      take: MAX_EMPLOYEES_IN_CONTEXT,
    }),
    getAnomalies(organizationId),
    prisma.task.findMany({
      where: {
        organizationId,
        status: { notIn: ["DONE", "CANCELLED"] },
        dueDate: { lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        employeeEvent: { employee: { deletedAt: null } },
      },
      include: { employeeEvent: { include: { employee: true } } },
      orderBy: { dueDate: "asc" },
      take: MAX_UPCOMING_TASKS_IN_CONTEXT,
    }),
  ]);

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

  const taskLines = upcomingTasks.map((t) => {
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
    `FAITS ENREGISTRÉS — TÂCHES OUVERTES : RETARDS ET 30 PROCHAINS JOURS (${upcomingTasks.length}) :`,
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

  try {
    const context = await buildContext(membership.organizationId);
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
