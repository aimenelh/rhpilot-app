import { prisma } from "@/lib/prisma";
import { calculateAnnualCumuls, calculateRegularization, type PayrollAnnualCumuls, type SourceTrace } from "./advanced-payroll-calculators";

export type LockedAnnualCumuls = PayrollAnnualCumuls & {
  year: number;
  employeeId: string;
  lockedPeriodIds: string[];
  calculationIds: string[];
};

export async function resolveLockedAnnualCumuls(input: {
  organizationId: string;
  employeeId: string;
  year: number;
  beforeMonth?: number;
}): Promise<LockedAnnualCumuls> {
  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100) throw new Error("L'année de cumul est invalide.");
  if (input.beforeMonth !== undefined && (!Number.isInteger(input.beforeMonth) || input.beforeMonth < 1 || input.beforeMonth > 13)) throw new Error("Le mois limite de cumul est invalide.");

  const periods = await prisma.payrollPeriod.findMany({
    where: {
      organizationId: input.organizationId,
      year: input.year,
      status: "LOCKED",
      ...(input.beforeMonth !== undefined ? { month: { lt: input.beforeMonth } } : {}),
    },
    select: { id: true, month: true },
    orderBy: { month: "asc" },
  });
  const periodIds = periods.map((period) => period.id);
  const calculations = periodIds.length === 0 ? [] : await prisma.payrollCalculation.findMany({
    where: {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      payrollPeriodId: { in: periodIds },
    },
    select: {
      id: true,
      payrollPeriodId: true,
      grossAmount: true,
      netTaxableAmount: true,
      netSocialAmount: true,
      withholdingTax: true,
      netPaid: true,
      employeeContributions: true,
      employerContributions: true,
    },
  });

  const totals = calculateAnnualCumuls(calculations.map((calculation) => ({
    grossAmount: Number(calculation.grossAmount),
    netTaxableAmount: Number(calculation.netTaxableAmount ?? 0),
    netSocialAmount: Number(calculation.netSocialAmount ?? 0),
    withholdingTax: Number(calculation.withholdingTax),
    netPaid: Number(calculation.netPaid),
    employeeContributions: Number(calculation.employeeContributions),
    employerContributions: Number(calculation.employerContributions),
  })));

  return {
    ...totals,
    year: input.year,
    employeeId: input.employeeId,
    lockedPeriodIds: periodIds,
    calculationIds: calculations.map((calculation) => calculation.id),
  };
}

export type PayrollRegularizationInstruction = {
  code: string;
  label: string;
  referencePayrollPeriodId: string;
  previousAmount: number;
  correctedAmount: number;
  delta: number;
  variableAmount: number;
  variableGrossEffect: "ADD_TO_GROSS" | "SUBTRACT_FROM_GROSS" | "EXCLUDE_FROM_GROSS";
  source: SourceTrace;
};

/**
 * Prépare une régularisation différentielle. Le moteur ne réécrit jamais le
 * calcul verrouillé d'origine : seul l'écart est porté sur la période courante.
 */
export function buildPayrollRegularizationInstruction(input: {
  code: string;
  label: string;
  referencePayrollPeriodId: string;
  previousAmount: number;
  correctedAmount: number;
  source: SourceTrace;
  grossImpact: boolean;
}): PayrollRegularizationInstruction {
  if (!input.code.trim() || !input.label.trim() || !input.referencePayrollPeriodId.trim()) throw new Error("La régularisation doit identifier son code, son libellé et sa période d'origine.");
  const result = calculateRegularization({ previousAmount: input.previousAmount, correctedAmount: input.correctedAmount, source: input.source });
  return {
    code: input.code.trim().toUpperCase(),
    label: input.label.trim(),
    referencePayrollPeriodId: input.referencePayrollPeriodId,
    previousAmount: result.previousAmount,
    correctedAmount: result.correctedAmount,
    delta: result.delta,
    variableAmount: Math.abs(result.delta),
    variableGrossEffect: !input.grossImpact || result.direction === "NONE"
      ? "EXCLUDE_FROM_GROSS"
      : result.direction === "ADD"
        ? "ADD_TO_GROSS"
        : "SUBTRACT_FROM_GROSS",
    source: input.source,
  };
}
