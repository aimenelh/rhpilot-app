import type { CollectiveMinimumSalaryResult } from "./collective-agreement-rule-engine";
import type { SmicMinimumResult } from "./minimum-wage";
import { resolveMinimumSalary, type MinimumSalaryResolution } from "./minimum-salary-resolver";

export type MinimumSalaryControlSnapshot = {
  status: MinimumSalaryResolution["status"];
  source?: MinimumSalaryResolution extends infer T
    ? T extends { status: "APPLICABLE" }
      ? T["source"]
      : never
    : never;
  appliedMonthlyMinimumCents?: number;
  smicMonthlyMinimumCents?: number;
  collectiveMonthlyMinimumCents?: number | null;
  compliant?: boolean;
  differenceCents?: number;
  smicRuleCode?: string;
  smicRuleVersionId?: string;
  collectiveRuleVersionId?: string;
  explanation: string;
  code?: string;
};

/**
 * Transforme la résolution du salaire minimum en donnée stable destinée au
 * snapshot de calcul. Le calcul du brut reste inchangé : ce contrôle ne
 * modifie jamais le salaire saisi.
 */
export function buildMinimumSalaryControlSnapshot(input: {
  smic: SmicMinimumResult;
  collectiveMinimum?: CollectiveMinimumSalaryResult;
  monthlyHours: number;
  collectiveRuleVersionId?: string;
  monthlyGrossCents: number;
}): MinimumSalaryControlSnapshot {
  const resolution = resolveMinimumSalary(input);

  if (resolution.status === "UNRESOLVED") {
    return {
      status: "UNRESOLVED",
      explanation: resolution.message,
      code: resolution.code,
    };
  }

  return {
    status: "APPLICABLE",
    source: resolution.source,
    appliedMonthlyMinimumCents: resolution.appliedMonthlyMinimumCents,
    smicMonthlyMinimumCents: resolution.smicMonthlyMinimumCents,
    collectiveMonthlyMinimumCents: resolution.collectiveMonthlyMinimumCents,
    compliant: resolution.compliant,
    differenceCents: resolution.differenceCents,
    smicRuleCode: resolution.smicRuleCode,
    smicRuleVersionId: resolution.smicRuleVersionId,
    ...(resolution.collectiveRuleVersionId
      ? { collectiveRuleVersionId: resolution.collectiveRuleVersionId }
      : {}),
    explanation: resolution.explanation,
  };
}
