"use server";

import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnomalies } from "@/lib/anomalies";
import { askAboutOrganization } from "@/lib/ai";
import { formatDate, formatDuration, addDuration } from "@/lib/format";

// Plafonds volontaires, indépendants de la taille réelle de
// l'organisation — jamais laisser le contexte (donc le coût et le
// temps de réponse) grandir sans limite avec le nombre de salariés.
const MAX_EMPLOYEES_IN_CONTEXT = 60;
const MAX_UPCOMING_TASKS_IN_CONTEXT = 30;

// Traduction des statuts techniques Prisma vers un français lisible —
// sans ça, l'IA répète les codes bruts ("TO_PREPARE") tels quels dans ses réponses.
const STATUS_LABELS: Record<string, string> = {
  TO_PREPARE: "à préparer",
  TODO: "à faire",
  IN_PROGRESS: "en cours",
  WAITING_EXTERNAL: "en attente d'un tiers externe",
  DONE: "terminée",
  CANCELLED: "annulée",
};

async function buildContext(organizationId: string): Promise<string> {
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
        dueDate: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
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
    if (e.nextMedicalVisitDate) parts.push(`prochaine visite médicale le ${formatDate(e.nextMedicalVisitDate)}`);
    return `- ${parts.join(", ")}`;
  });

  const anomalyLines = anomalies.map((a) => `- [${a.severity}] ${a.message}`);

  const taskLines = upcomingTasks.map(
    (t) => `- ${t.label} pour ${t.employeeEvent.employee.firstName} ${t.employeeEvent.employee.lastName}, échéance le ${formatDate(t.dueDate)} (statut : ${STATUS_LABELS[t.status] ?? t.status})`
  );

  return [
    `SALARIÉS (${employees.length}${employees.length === MAX_EMPLOYEES_IN_CONTEXT ? "+, liste limitée aux plus récents" : ""}) :`,
    employeeLines.join("\n") || "Aucun salarié.",
    "",
    `SUGGESTIONS ACTIVES (${anomalies.length}) :`,
    anomalyLines.join("\n") || "Aucune suggestion active.",
    "",
    `TÂCHES À ÉCHÉANCE DANS LES 30 PROCHAINS JOURS (${upcomingTasks.length}) :`,
    taskLines.join("\n") || "Aucune tâche à échéance proche.",
  ].join("\n");
}

export type AskAboutOrganizationState = { question: string; answer: string; error: string } | undefined;

export async function askAboutOrganizationAction(
  _prevState: AskAboutOrganizationState,
  formData: FormData
): Promise<AskAboutOrganizationState> {
  const membership = await getCurrentMembership();
  if (!membership) return { question: "", answer: "", error: "Non authentifié ou aucune organisation active." };

  const question = String(formData.get("question") ?? "").trim();
  if (!question) return { question: "", answer: "", error: "Veuillez poser une question." };
  if (question.length > 500) {
    return { question, answer: "", error: "Question trop longue (500 caractères maximum)." };
  }

  try {
    const context = await buildContext(membership.organizationId);
    const answer = await askAboutOrganization(question, context);
    return { question, answer, error: "" };
  } catch (err) {
    // Ne jamais renvoyer le message d'erreur brut de l'API à
    // l'écran — un vrai souci de clé/quota ne doit jamais s'afficher
    // en anglais technique à un utilisateur RH.
    console.error("Erreur askAboutOrganizationAction:", err);
    return {
      question,
      answer: "",
      error:
        err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")
          ? "Cette fonctionnalité n'est pas encore activée."
          : "Une erreur est survenue, veuillez réessayer.",
    };
  }
}
