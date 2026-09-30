import { prisma } from "@/lib/prisma";

/**
 * Classifications proposées dans le profil de paie d'un salarié, lues dans la
 * grille de minima de sa convention collective (règles MINIMUM_SALARY_<code>).
 * Le code choisi dans la liste est exactement celui que le contrôle du salaire
 * minimum recherche : plus de saisie libre qui ne correspond à aucune grille.
 */
export type ClassificationOption = {
  code: string;
  label: string;
  coefficient: string | null;
  monthlyMinimumCents: number | null;
};

type RuleRow = { code: string; parameters: unknown; sourceReference: string | null };

const PREFIX = "MINIMUM_SALARY_";

function euros(cents: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);
}

export function classificationOptionFromRule(rule: RuleRow): ClassificationOption | null {
  if (!rule.code.startsWith(PREFIX)) return null;
  const parameters = (rule.parameters && typeof rule.parameters === "object" ? rule.parameters : {}) as Record<string, unknown>;
  const code = typeof parameters.classificationCode === "string" && parameters.classificationCode.trim()
    ? parameters.classificationCode.trim()
    : rule.code.slice(PREFIX.length);
  if (!code || code === "NON_CLASSE") return null;
  const minimum = typeof parameters.monthlyMinimumCents === "number" && Number.isFinite(parameters.monthlyMinimumCents) ? parameters.monthlyMinimumCents : null;
  const reference = [typeof parameters.sourceReference === "string" ? parameters.sourceReference : "", rule.sourceReference ?? ""].join(" ");
  const coefficient = reference.match(/coefficient\s+(\d+(?:[.,]\d+)?)/i)?.[1] ?? null;
  const parts = [code.replace(/_/g, " ")];
  if (coefficient) parts.push(`coefficient ${coefficient}`);
  if (minimum !== null) parts.push(`minimum ${euros(minimum)}`);
  return { code, label: parts.join(" · "), coefficient, monthlyMinimumCents: minimum };
}

/** Tri naturel : ETAM 1.1, 1.2, 2.1… puis IC 1.1… */
export function sortClassificationOptions(options: ClassificationOption[]): ClassificationOption[] {
  return [...options].sort((a, b) => a.code.localeCompare(b.code, "fr", { numeric: true }));
}

/** Grilles en vigueur à la date donnée, par identifiant de convention. */
export async function loadClassificationGrids(at: Date = new Date()): Promise<Record<string, ClassificationOption[]>> {
  const rules = await prisma.collectiveAgreementRule.findMany({
    where: {
      code: { startsWith: PREFIX },
      status: "VALIDATED",
      validFrom: { lte: at },
      OR: [{ validUntil: null }, { validUntil: { gte: at } }],
      version: { status: "VALIDATED", validFrom: { lte: at }, OR: [{ validUntil: null }, { validUntil: { gte: at } }] },
    },
    select: { code: true, parameters: true, sourceReference: true, version: { select: { collectiveAgreementId: true } } },
  });
  const grids: Record<string, ClassificationOption[]> = {};
  for (const rule of rules) {
    const option = classificationOptionFromRule(rule);
    if (!option) continue;
    const agreementId = rule.version.collectiveAgreementId;
    (grids[agreementId] ??= []).push(option);
  }
  for (const agreementId of Object.keys(grids)) grids[agreementId] = sortClassificationOptions(grids[agreementId]);
  return grids;
}
