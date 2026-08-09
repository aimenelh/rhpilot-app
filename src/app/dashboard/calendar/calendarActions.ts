"use server";

import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { askAboutOrganization } from "@/lib/ai";
import { formatDate } from "@/lib/format";

// Même principe que pour l'assistant du tableau de bord : un plafond
// volontaire, indépendant de la taille réelle de l'organisation —
// jamais laisser le contexte (donc le coût) grandir sans limite avec
// le nombre de tâches d'un mois chargé.
const MAX_TASKS_IN_SUMMARY = 100;

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

export type SummarizeMonthState = { summary: string; error: string } | undefined;

export async function summarizeMonthAction(
  _prevState: SummarizeMonthState,
  formData: FormData
): Promise<SummarizeMonthState> {
  const membership = await getCurrentMembership();
  if (!membership) return { summary: "", error: "Non authentifié ou aucune organisation active." };

  const year = Number(formData.get("year"));
  const month = Number(formData.get("month")); // 0-indexé, comme le reste de la page calendrier
  if (Number.isNaN(year) || Number.isNaN(month)) {
    return { summary: "", error: "Mois invalide." };
  }

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  const [tasks, totalCount] = await Promise.all([
    prisma.task.findMany({
      where: {
        organizationId: membership.organizationId,
        status: { not: "CANCELLED" },
        dueDate: { gte: start, lt: end },
        employeeEvent: { deletedAt: null, employee: { deletedAt: null } },
      },
      include: { employeeEvent: { include: { employee: true, eventTemplate: true } } },
      orderBy: { dueDate: "asc" },
      take: MAX_TASKS_IN_SUMMARY,
    }),
    prisma.task.count({
      where: {
        organizationId: membership.organizationId,
        status: { not: "CANCELLED" },
        dueDate: { gte: start, lt: end },
        employeeEvent: { deletedAt: null, employee: { deletedAt: null } },
      },
    }),
  ]);

  if (tasks.length === 0) {
    return { summary: "Aucune tâche prévue sur ce mois — rien à signaler.", error: "" };
  }

  const lines = tasks.map(
    (t) =>
      `- ${formatDate(t.dueDate)} : ${t.label} (${t.employeeEvent.eventTemplate?.label ?? "Événement"}) pour ${t.employeeEvent.employee.firstName} ${t.employeeEvent.employee.lastName}, statut : ${STATUS_LABELS[t.status] ?? t.status}`
  );

  // Si le mois dépasse le plafond, l'IA doit le savoir explicitement —
  // jamais lui laisser croire qu'elle voit 100% des tâches du mois si
  // ce n'est pas vraiment le cas.
  if (totalCount > tasks.length) {
    lines.push(`(... et ${totalCount - tasks.length} autre(s) tâche(s) non détaillée(s) ici.)`);
  }

  try {
    const summary = await askAboutOrganization(
      "Fais un résumé synthétique et actionnable de ce mois, en 3 à 4 phrases maximum : la charge globale, la ou les semaines les plus chargées si tu peux le déduire des dates, et les points de vigilance particuliers.",
      lines.join("\n")
    );
    return { summary, error: "" };
  } catch (err) {
    console.error("Erreur summarizeMonthAction:", err);
    return {
      summary: "",
      error:
        err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")
          ? "Cette fonctionnalité n'est pas encore activée."
          : "Une erreur est survenue, veuillez réessayer.",
    };
  }
}
