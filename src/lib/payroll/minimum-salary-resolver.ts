import type { CollectiveMinimumSalaryResult } from "./collective-agreement-rule-engine";
import type { SmicMinimumResult } from "./minimum-wage";

/**
 * Les durées mensualisées sont saisies arrondies au centième : 151,67 h pour
 * 35 h × 52 / 12 = 151,666… h. On retrouve la durée exacte quand la valeur
 * correspond à un horaire hebdomadaire au centième près, sinon on garde la saisie.
 */
function exactMonthlyHours(monthlyHours: number): number {
  const weeklyHours = Math.round(((monthlyHours * 12) / 52) * 100) / 100;
  const mensualised = (weeklyHours * 52) / 12;
  return Math.abs(mensualised - monthlyHours) < 0.005 ? mensualised : monthlyHours;
}

export type MinimumSalaryResolution =
  | {
      status: "APPLICABLE";
      source: "SMIC" | "COLLECTIVE_AGREEMENT";
      appliedMonthlyMinimumCents: number;
      smicMonthlyMinimumCents: number;
      collectiveMonthlyMinimumCents: number | null;
      smicRuleCode: string;
      smicRuleVersionId: string;
      collectiveRuleVersionId?: string;
      compliant: boolean;
      differenceCents: number;
      explanation: string;
    }
  | {
      status: "UNRESOLVED";
      code: "INVALID_SMIC" | "INVALID_MONTHLY_HOURS" | "INVALID_GROSS_SALARY" | "COLLECTIVE_MINIMUM_UNRESOLVED";
      message: string;
    };

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Compare le SMIC proratisé à la durée mensuelle du salarié et, lorsqu'il est
 * applicable, au minimum conventionnel. Le maximum des deux constitue le
 * minimum salarial à respecter.
 *
 * Une absence de convention collective n'empêche pas le contrôle du SMIC.
 * En revanche, lorsqu'une convention est bien identifiée mais que son minimum
 * ne peut pas être déterminé, le contrôle reste explicitement non résolu.
 */
export function resolveMinimumSalary(input: {
  smic: SmicMinimumResult;
  collectiveMinimum?: CollectiveMinimumSalaryResult;
  monthlyHours: number;
  collectiveRuleVersionId?: string;
  monthlyGrossCents: number;
}): MinimumSalaryResolution {
  if (!isPositiveFinite(input.monthlyHours)) {
    return {
      status: "UNRESOLVED",
      code: "INVALID_MONTHLY_HOURS",
      message: "La durée mensuelle du salarié est invalide.",
    };
  }

  if (!Number.isInteger(input.monthlyGrossCents) || input.monthlyGrossCents < 0) {
    return {
      status: "UNRESOLVED",
      code: "INVALID_GROSS_SALARY",
      message: "Le salaire brut mensuel fourni est invalide.",
    };
  }

  if (
    !isPositiveFinite(input.smic.hourlyGrossCents) ||
    !isPositiveFinite(input.smic.monthlyGrossCentsAt35Hours) ||
    !isPositiveFinite(input.smic.monthlyHoursAt35Hours)
  ) {
    return {
      status: "UNRESOLVED",
      code: "INVALID_SMIC",
      message: "Les paramètres du SMIC ne permettent pas de déterminer un minimum salarial.",
    };
  }

  // Le Smic est un taux horaire : le minimum du mois est ce taux multiplié par
  // les heures du mois (12,31 € × 160 h = 1 969,60 €). Proratiser le montant
  // mensuel arrondi (1 867,02 € ÷ 151,67 h) donnait 12,3097 €/h et un minimum
  // trop bas de quelques centimes.
  const smicMonthlyMinimumCents = Math.round(
    input.smic.hourlyGrossCents * exactMonthlyHours(input.monthlyHours),
  );

  let collectiveMonthlyMinimumCents: number | null = null;
  let collectiveRuleVersionId = input.collectiveRuleVersionId;

  if (input.collectiveMinimum?.status === "UNRESOLVED") {
    if (input.collectiveMinimum.code !== "NO_COLLECTIVE_AGREEMENT") {
      return {
        status: "UNRESOLVED",
        code: "COLLECTIVE_MINIMUM_UNRESOLVED",
        message: `Le minimum conventionnel n'est pas déterminable : ${input.collectiveMinimum.message}`,
      };
    }
  }

  if (input.collectiveMinimum?.status === "APPLICABLE") {
    collectiveMonthlyMinimumCents = input.collectiveMinimum.monthlyMinimumCents;
  }

  const appliedMonthlyMinimumCents = Math.max(
    smicMonthlyMinimumCents,
    collectiveMonthlyMinimumCents ?? 0,
  );
  const useCollective =
    collectiveMonthlyMinimumCents !== null &&
    collectiveMonthlyMinimumCents >= smicMonthlyMinimumCents;
  const differenceCents = input.monthlyGrossCents - appliedMonthlyMinimumCents;

  if (!useCollective) collectiveRuleVersionId = undefined;

  return {
    status: "APPLICABLE",
    source: useCollective ? "COLLECTIVE_AGREEMENT" : "SMIC",
    appliedMonthlyMinimumCents,
    smicMonthlyMinimumCents,
    collectiveMonthlyMinimumCents,
    smicRuleCode: input.smic.ruleCode,
    smicRuleVersionId: input.smic.ruleVersionId,
    ...(collectiveRuleVersionId ? { collectiveRuleVersionId } : {}),
    compliant: differenceCents >= 0,
    differenceCents,
    explanation: useCollective
      ? "Le minimum conventionnel applicable est supérieur ou égal au SMIC proratisé."
      : collectiveMonthlyMinimumCents === null
        ? "Aucun minimum conventionnel applicable n'est résolu : le contrôle repose sur le SMIC proratisé."
        : "Le SMIC proratisé est supérieur au minimum conventionnel applicable.",
  };
}
