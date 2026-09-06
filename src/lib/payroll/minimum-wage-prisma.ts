import { prisma } from "@/lib/prisma";
import { resolveSmicMinimum, type SmicMinimumResult } from "./minimum-wage";

const SMIC_RULE_CODE = "FR.SMIC.MONTHLY_GROSS";

type SmicScope = "FRANCE_HORS_MAYOTTE" | "MAYOTTE";

function normalizeStatus(value: string): "DRAFT" | "VALIDATED" | "ARCHIVED" {
  if (value === "VALIDATED") return "VALIDATED";
  if (value === "ARCHIVED") return "ARCHIVED";
  return "DRAFT";
}

export async function resolveSmicMinimumFromPrisma(input: {
  periodDate: Date;
  scope: SmicScope;
}): Promise<SmicMinimumResult | null> {
  const rule = await prisma.payrollRuleVersion.findFirst({
    where: {
      code: SMIC_RULE_CODE,
      scope: input.scope,
      status: "VALIDATED",
      validFrom: { lte: input.periodDate },
      OR: [
        { validUntil: null },
        { validUntil: { gte: input.periodDate } },
      ],
    },
    orderBy: [
      { validFrom: "desc" },
      { version: "desc" },
    ],
  });

  if (!rule || normalizeStatus(rule.status) !== "VALIDATED") {
    return null;
  }

  return resolveSmicMinimum({
    ruleCode: rule.code,
    ruleVersionId: rule.id,
    parameters: rule.parameters,
  });
}
