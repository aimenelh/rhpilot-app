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
      code:
        | "INVALID_SMIC"
        | "INVALID_MONTHLY_HOURS"
        | "COLLECTIVE_MINIMUM_UNRESOLVED";
      message: string;
    };

function assertPositiveFinite(value: number, message: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(message);
}

/**
 * Compare le SMIC proratisé à la durée mensuelle du salarié et, lorsqu'elle
 * est disponible et applicable, au minimum conventionnel. Le maximum des
 * deux constitue le minimum salarial à respecter.
 */
export function resolveMinimumSalary(input: {
  smic: SmicMinimumResult;
  collectiveMinimum: CollectiveMinimumSalaryResult;
  monthlyHours: number;
  collectiveRuleVersionId?: string;
  monthlyGrossCents: number;
}): MinimumSalaryResolution {
  assertPositiveFinite(input.monthlyHours, "La durée mensuelle du salarié est invalide.");
  if (!Number.isInteger(input.monthlyGrossCents) || input.monthlyGrossCents < 0) {
    return { status: "UNRESOLVED", code: "INVALID_MONTHLY_HOURS", message: "Le salaire brut mensuel fourni est invalide." };
  }

  let smicMonthlyMinimumCents: number;
  try {
    assertPositiveFinite(input.smic.monthlyGrossCentsAt35Hours, "Le SMIC mensuel est invalide.");
    assertPositiveFinite(input.smic.monthlyHoursAt35Hours, "La durée mensuelle de référence du SMIC est invalide.");
    smicMonthlyMinimumCents = Math.round(
      (input.smic.hourlyGrossCents * input.monthlyHours) + Number.EPSILON,
    );
  } catch {
    return { status: "UNRESOLVED", code: "INVALID_SMIC", message: "Les paramètres du SMIC ne permettent pas de déterminer un minimum salarial." };
  }

  if (input.collectiveMinimum.status === "UNRESOLVED") {
    return {
      status: "UNRESOLVED",
      code: "COLLECTIVE_MINIMUM_UNRESOLVED",
      message: `Le minimum conventionnel n'est pas déterminable : ${input.collectiveMinimum.message}`,
    };
  }

  const collectiveMonthlyMinimumCents = input.collectiveMinimum.monthlyMinimumCents;
  const useCollective = collectiveMonthlyMinimumCents >= smicMonthlyMinimumCents;
  const appliedMonthlyMinimumCents = Math.max(smicMonthlyMinimumCents, collectiveMonthlyMinimumCents);
  const differenceCents = input.monthlyGrossCents - appliedMonthlyMinimumCents;

  const explanation = useCollective
    ? "Le minimum conventionnel applicable est supérieur ou égal au SMIC proratisé."
    : "Le SMIC proratisé est supérieur au minimum conventionnel applicable.";

  return {
    status: "APPLICABLE",
    source: useCollective ? "COLLECTIVE_AGREEMENT" : "SMIC",
    appliedMonthlyMinimumCents,
    smicMonthlyMinimumCents,
    collectiveMonthlyMinimumCents,
    smicRuleCode: input.smic.ruleCode,
    smicRuleVersionId: input.smic.ruleVersionId,
    ...(input.collectiveRuleVersionId ? { collectiveRuleVersionId: input.collectiveRuleVersionId } : {}),
    compliant: differenceCents >= 0,
    differenceCents,
    explanation,
  };
}
