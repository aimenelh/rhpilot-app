import type { CollectiveMinimumSalaryResult } from "./collective-agreement-rule-engine";
import type { SmicMinimumResult } from "./minimum-wage";

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
      code: "INVALID_SMIC" | "INVALID_MONTHLY_HOURS" | "COLLECTIVE_MINIMUM_UNRESOLVED";
      message: string;
    };

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Compare le SMIC proratisé à la durée mensuelle du salarié et, lorsqu'il est
 * applicable, au minimum conventionnel. Le maximum des deux constitue le
 * minimum salarial à respecter.
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
      code: "INVALID_MONTHLY_HOURS",
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

  const smicMonthlyMinimumCents = Math.round(
    input.smic.monthlyGrossCentsAt35Hours *
      (input.monthlyHours / input.smic.monthlyHoursAt35Hours),
  );

  let collectiveMonthlyMinimumCents: number | null = null;
  let collectiveRuleVersionId = input.collectiveRuleVersionId;

  if (input.collectiveMinimum?.status === "UNRESOLVED") {
    return {
      status: "UNRESOLVED",
      code: "COLLECTIVE_MINIMUM_UNRESOLVED",
      message: `Le minimum conventionnel n'est pas déterminable : ${input.collectiveMinimum.message}`,
    };
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
