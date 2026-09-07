import type {
  AbsencePayrollBasis,
  AbsencePayrollEffect,
  AbsencePayrollTreatmentRule,
} from "./absence-payroll-treatment";

export type AbsencePayrollGrossImpact =
  | {
      status: "RESOLVED";
      grossDelta: number;
      basis: AbsencePayrollBasis;
      effect: AbsencePayrollEffect;
      ruleVersionId: string;
      derivedVariableCode: string;
      derivedVariableLabel: string;
    }
  | {
      status: "RULE_REQUIRED" | "UNSUPPORTED_BASIS";
    };

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateAbsenceGrossImpact(input: {
  baseSalaryAmount: number;
  monthlyCalendarDays: number;
  absenceDays: number;
  rule: AbsencePayrollTreatmentRule;
}): AbsencePayrollGrossImpact {
  if (!Number.isFinite(input.baseSalaryAmount) || input.baseSalaryAmount < 0) {
    throw new Error("Le salaire de base doit être un montant positif ou nul.");
  }
  if (!Number.isInteger(input.monthlyCalendarDays) || input.monthlyCalendarDays <= 0) {
    throw new Error("Le nombre de jours calendaires du mois est invalide.");
  }
  if (!Number.isInteger(input.absenceDays) || input.absenceDays < 0) {
    throw new Error("Le nombre de jours d'absence est invalide.");
  }

  if (input.rule.basis === "NONE" || input.rule.effect === "EXCLUDE_FROM_GROSS") {
    return {
      status: "RESOLVED",
      grossDelta: 0,
      basis: input.rule.basis,
      effect: input.rule.effect,
      ruleVersionId: input.rule.ruleVersionId,
      derivedVariableCode: `ABSENCE_${input.rule.absenceType}`,
      derivedVariableLabel: `Impact paie — ${input.rule.absenceType}`,
    };
  }

  if (input.rule.basis !== "CALENDAR_DAYS") return { status: "UNSUPPORTED_BASIS" };

  const divisor = input.rule.divisor;
  const rate = input.rule.rate ?? 1;
  if (typeof divisor !== "number" || !Number.isFinite(divisor) || divisor <= 0 || !Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error(`La règle ${input.rule.absenceType} possède une base de valorisation invalide.`);
  }

  const rawImpact = (input.baseSalaryAmount / divisor) * input.absenceDays * rate;
  const signedImpact = input.rule.effect === "ADD_TO_GROSS" ? rawImpact : -rawImpact;

  return {
    status: "RESOLVED",
    grossDelta: roundMoney(signedImpact),
    basis: input.rule.basis,
    effect: input.rule.effect,
    ruleVersionId: input.rule.ruleVersionId,
    derivedVariableCode: `ABSENCE_${input.rule.absenceType}`,
    derivedVariableLabel: `Impact paie — ${input.rule.absenceType}`,
  };
}
