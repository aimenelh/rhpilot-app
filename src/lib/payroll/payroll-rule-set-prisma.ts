import { prisma } from "@/lib/prisma";
import type { PayrollContributionRule, PayrollRuleSet } from "./domain";
import type { AbsencePayrollTreatmentRule } from "./absence-payroll-treatment";

type PersistedPayrollRuleSetParameters = {
  withholdingTaxRate?: unknown;
  rules?: unknown;
  variableTreatments?: unknown;
  absenceTreatments?: unknown;
};

type PersistedVariableTreatment = {
  code: string;
  grossEffect: "ADD_TO_GROSS" | "SUBTRACT_FROM_GROSS" | "EXCLUDE_FROM_GROSS";
  supportedUnits: Array<"EUR">;
};

export type PayrollRuleSetResolution =
  | {
      status: "RESOLVED";
      ruleVersionId: string;
      ruleSet: PayrollRuleSet;
      withholdingTaxRate: number;
      variableTreatments: PersistedVariableTreatment[];
      absenceTreatments: AbsencePayrollTreatmentRule[];
      source: {
        sourceName: string;
        sourceUrl: string | null;
        validFrom: Date;
        validUntil: Date | null;
      };
    }
  | {
      status: "UNRESOLVED";
      code: "NO_VALIDATED_RULE_VERSION" | "INVALID_RULE_VERSION";
      message: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseParameters(parameters: unknown, ruleVersionId: string): {
  ruleSet: PayrollRuleSet;
  withholdingTaxRate: number;
  variableTreatments: PersistedVariableTreatment[];
  absenceTreatments: AbsencePayrollTreatmentRule[];
} | null {
  if (!isRecord(parameters)) return null;
  const value = parameters as PersistedPayrollRuleSetParameters;
  if (!Array.isArray(value.rules)) return null;

  const rules: PayrollContributionRule[] = [];
  for (const candidate of value.rules) {
    if (!isRecord(candidate)) return null;

    const code = typeof candidate.code === "string" ? candidate.code.trim() : "";
    const label = typeof candidate.label === "string" ? candidate.label.trim() : "";
    const side = candidate.side === "EMPLOYEE" || candidate.side === "EMPLOYER" ? candidate.side : null;
    const base = candidate.base === "GROSS" ? "GROSS" : null;
    const rate = typeof candidate.rate === "number" ? candidate.rate : null;
    const candidateRuleVersionId =
      typeof candidate.ruleVersionId === "string" && candidate.ruleVersionId.trim()
        ? candidate.ruleVersionId.trim()
        : ruleVersionId;

    if (!code || !label || !side || !base || rate === null || !Number.isFinite(rate) || rate < 0 || rate > 1) {
      return null;
    }

    rules.push({ code, label, side, rate, base, ruleVersionId: candidateRuleVersionId });
  }

  const withholdingTaxRate = value.withholdingTaxRate ?? 0;
  if (
    typeof withholdingTaxRate !== "number" ||
    !Number.isFinite(withholdingTaxRate) ||
    withholdingTaxRate < 0 ||
    withholdingTaxRate > 1
  ) {
    return null;
  }

  const variableTreatments: PersistedVariableTreatment[] = [];
  if (Array.isArray(value.variableTreatments)) {
    for (const candidate of value.variableTreatments) {
      if (!isRecord(candidate)) return null;
      const code = typeof candidate.code === "string" ? candidate.code.trim() : "";
      const grossEffect =
        candidate.grossEffect === "ADD_TO_GROSS" ||
        candidate.grossEffect === "SUBTRACT_FROM_GROSS" ||
        candidate.grossEffect === "EXCLUDE_FROM_GROSS"
          ? candidate.grossEffect
          : null;
      const supportedUnits = Array.isArray(candidate.supportedUnits)
        ? candidate.supportedUnits.filter((unit): unit is "EUR" => unit === "EUR")
        : [];
      if (!code || !grossEffect || supportedUnits.length === 0) return null;
      variableTreatments.push({ code, grossEffect, supportedUnits });
    }
  }

  const absenceTreatments: AbsencePayrollTreatmentRule[] = [];
  if (Array.isArray(value.absenceTreatments)) {
    for (const candidate of value.absenceTreatments) {
      if (!isRecord(candidate)) return null;

      const absenceType = typeof candidate.absenceType === "string" ? candidate.absenceType.trim() : "";
      const effect =
        candidate.effect === "ADD_TO_GROSS" ||
        candidate.effect === "SUBTRACT_FROM_GROSS" ||
        candidate.effect === "EXCLUDE_FROM_GROSS"
          ? candidate.effect
          : null;
      const basis =
        candidate.basis === "NONE" ||
        candidate.basis === "CALENDAR_DAYS" ||
        candidate.basis === "WORKING_DAYS" ||
        candidate.basis === "WORKED_HOURS" ||
        candidate.basis === "RULE_DEFINED"
          ? candidate.basis
          : null;
      const candidateRuleVersionId =
        typeof candidate.ruleVersionId === "string" && candidate.ruleVersionId.trim()
          ? candidate.ruleVersionId.trim()
          : ruleVersionId;
      const divisor = candidate.divisor === undefined ? undefined : typeof candidate.divisor === "number" ? candidate.divisor : null;
      const rate = candidate.rate === undefined ? undefined : typeof candidate.rate === "number" ? candidate.rate : null;

      if (!absenceType || !effect || !basis || divisor === null || rate === null) return null;
      if (divisor !== undefined && (!Number.isFinite(divisor) || divisor <= 0)) return null;
      if (rate !== undefined && (!Number.isFinite(rate) || rate < 0 || rate > 1)) return null;

      absenceTreatments.push({
        absenceType,
        effect,
        basis,
        ruleVersionId: candidateRuleVersionId,
        ...(divisor !== undefined ? { divisor } : {}),
        ...(rate !== undefined ? { rate } : {}),
      });
    }
  }

  return { ruleSet: { version: ruleVersionId, rules }, withholdingTaxRate, variableTreatments, absenceTreatments };
}

export async function resolvePayrollRuleSetFromPrisma(input: {
  code: string;
  scope: string;
  periodDate: Date;
}): Promise<PayrollRuleSetResolution> {
  const ruleVersion = await prisma.payrollRuleVersion.findFirst({
    where: {
      code: input.code,
      scope: input.scope,
      status: "VALIDATED",
      validFrom: { lte: input.periodDate },
      OR: [{ validUntil: null }, { validUntil: { gte: input.periodDate } }],
    },
    orderBy: { version: "desc" },
  });

  if (!ruleVersion) {
    return {
      status: "UNRESOLVED",
      code: "NO_VALIDATED_RULE_VERSION",
      message: `Aucune version validée de la règle ${input.code} n'est applicable à la date de paie.`,
    };
  }

  const parsed = parseParameters(ruleVersion.parameters, ruleVersion.id);
  if (!parsed) {
    return {
      status: "UNRESOLVED",
      code: "INVALID_RULE_VERSION",
      message: `La version ${ruleVersion.version} de la règle ${input.code} possède des paramètres invalides.`,
    };
  }

  return {
    status: "RESOLVED",
    ruleVersionId: ruleVersion.id,
    ruleSet: parsed.ruleSet,
    withholdingTaxRate: parsed.withholdingTaxRate,
    variableTreatments: parsed.variableTreatments,
    absenceTreatments: parsed.absenceTreatments,
    source: {
      sourceName: ruleVersion.sourceName,
      sourceUrl: ruleVersion.sourceUrl,
      validFrom: ruleVersion.validFrom,
      validUntil: ruleVersion.validUntil,
    },
  };
}
