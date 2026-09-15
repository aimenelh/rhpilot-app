import { calculatePaidLeaveCompensationAtTermination2026 } from "./paid-leave-2026";

export const TERMINATION_2026_RULE_VERSION = "FR-TERMINATION-2026-01";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} doit être positif ou nul.`);
}

export function selectLegalSeveranceReferenceSalary(input: {
  last12GrossSalaries: readonly number[];
  last3GrossSalaries: readonly number[];
  annualOrExceptionalPrimesAllocatedToLast3?: number;
}): { twelveMonthAverage: number; threeMonthAverage: number; selected: number } {
  if (input.last12GrossSalaries.length === 0 || input.last3GrossSalaries.length === 0) throw new Error("Les historiques de salaire nécessaires à l'indemnité de licenciement sont absents.");
  input.last12GrossSalaries.forEach((amount) => assertNonNegative(amount, "Un salaire des 12 derniers mois"));
  input.last3GrossSalaries.forEach((amount) => assertNonNegative(amount, "Un salaire des 3 derniers mois"));
  const primeAllocation = input.annualOrExceptionalPrimesAllocatedToLast3 ?? 0;
  assertNonNegative(primeAllocation, "La quote-part de primes des 3 derniers mois");
  const twelveMonthAverage = roundMoney(input.last12GrossSalaries.reduce((sum, amount) => sum + amount, 0) / input.last12GrossSalaries.length);
  const threeMonthAverage = roundMoney((input.last3GrossSalaries.reduce((sum, amount) => sum + amount, 0) + primeAllocation) / input.last3GrossSalaries.length);
  return { twelveMonthAverage, threeMonthAverage, selected: Math.max(twelveMonthAverage, threeMonthAverage) };
}

export function calculateLegalSeveranceMinimum2026(input: {
  referenceMonthlySalary: number;
  completeYearsOfSeniority: number;
  additionalCompleteMonths: number;
}): { amount: number; seniorityYears: number; ruleVersionId: string; sourceReference: string } {
  assertNonNegative(input.referenceMonthlySalary, "Le salaire mensuel de référence");
  if (!Number.isInteger(input.completeYearsOfSeniority) || input.completeYearsOfSeniority < 0) throw new Error("Les années complètes d'ancienneté sont invalides.");
  if (!Number.isInteger(input.additionalCompleteMonths) || input.additionalCompleteMonths < 0 || input.additionalCompleteMonths > 11) throw new Error("Les mois complets supplémentaires d'ancienneté sont invalides.");

  const seniorityYears = input.completeYearsOfSeniority + input.additionalCompleteMonths / 12;
  const firstTenYears = Math.min(seniorityYears, 10);
  const beyondTen = Math.max(0, seniorityYears - 10);
  const amount = roundMoney(input.referenceMonthlySalary * (firstTenYears / 4 + beyondTen / 3));
  return {
    amount,
    seniorityYears: Math.round(seniorityYears * 10000) / 10000,
    ruleVersionId: TERMINATION_2026_RULE_VERSION,
    sourceReference: "Service-Public / Code du travail : 1/4 mois par année jusqu'à 10 ans puis 1/3 mois par année au-delà, prorata des mois complets",
  };
}

export function calculateCddEndAllowance2026(input: {
  totalEligibleGrossRemuneration: number;
  eligible: boolean;
  conventionalReducedRate?: 0.06 | null;
}): { amount: number; rate: number; eligible: boolean; ruleVersionId: string; sourceReference: string } {
  assertNonNegative(input.totalEligibleGrossRemuneration, "La rémunération brute totale du CDD");
  if (!input.eligible) return {
    amount: 0,
    rate: 0,
    eligible: false,
    ruleVersionId: TERMINATION_2026_RULE_VERSION,
    sourceReference: "Service-Public — indemnité de fin de CDD : exceptions d'éligibilité à qualifier avant calcul",
  };
  const rate = input.conventionalReducedRate === 0.06 ? 0.06 : 0.1;
  return {
    amount: roundMoney(input.totalEligibleGrossRemuneration * rate),
    rate,
    eligible: true,
    ruleVersionId: TERMINATION_2026_RULE_VERSION,
    sourceReference: rate === 0.06
      ? "Service-Public — indemnité de fin de CDD ramenée à 6 % uniquement si une convention collective le prévoit avec contreparties"
      : "Service-Public — indemnité de fin de CDD au minimum égale à 10 % de la rémunération brute totale",
  };
}

export function calculateNoticeCompensation(input: {
  salaryAndBenefitsThatWouldHaveBeenPaid: number;
  employerDispensedNotice: boolean;
}): { amount: number; ruleVersionId: string } {
  assertNonNegative(input.salaryAndBenefitsThatWouldHaveBeenPaid, "Les salaires et avantages du préavis");
  return {
    amount: input.employerDispensedNotice ? roundMoney(input.salaryAndBenefitsThatWouldHaveBeenPaid) : 0,
    ruleVersionId: TERMINATION_2026_RULE_VERSION,
  };
}

export type FinalSettlement2026Input = {
  finalSalaryGross: number;
  finalSalaryNetPayable: number;
  referencePeriodGrossForPaidLeave: number;
  remainingPaidLeaveDays: number;
  paidLeaveDenominator: 25 | 30;
  equivalentPaidLeaveMaintenanceAmount: number;
  cdd?: { totalEligibleGrossRemuneration: number; eligible: boolean; conventionalReducedRate?: 0.06 | null } | null;
  severance?: { legalMinimum: number; conventionalOrNegotiatedAmount?: number | null } | null;
  noticeCompensation?: number;
  expenseReimbursements?: number;
  otherNetAdjustments?: number;
};

export type FinalSettlement2026Result = {
  finalSalaryGross: number;
  finalSalaryNetPayable: number;
  paidLeaveCompensation: number;
  cddEndAllowance: number;
  severanceAmount: number;
  noticeCompensation: number;
  expenseReimbursements: number;
  otherNetAdjustments: number;
  grossTerminationItemsBeforeSocialRecalculation: number;
  nonGrossCashItems: number;
  ruleVersionId: string;
  warnings: string[];
};

/**
 * Assemble le solde de tout compte sans prétendre recalculer ici les cotisations
 * sociales des indemnités de rupture. Les éléments bruts retournés doivent être
 * repassés dans le moteur social avant établissement du bulletin final.
 */
export function calculateFinalSettlement2026(input: FinalSettlement2026Input): FinalSettlement2026Result {
  assertNonNegative(input.finalSalaryGross, "Le dernier salaire brut");
  assertNonNegative(input.finalSalaryNetPayable, "Le dernier net à payer");
  const cp = calculatePaidLeaveCompensationAtTermination2026({
    referencePeriodGrossAmount: input.referencePeriodGrossForPaidLeave,
    remainingLeaveDays: input.remainingPaidLeaveDays,
    leaveDayDenominator: input.paidLeaveDenominator,
    equivalentSalaryMaintenanceAmount: input.equivalentPaidLeaveMaintenanceAmount,
  });
  const cdd = input.cdd ? calculateCddEndAllowance2026(input.cdd) : { amount: 0 };
  const legalSeverance = input.severance?.legalMinimum ?? 0;
  const negotiated = input.severance?.conventionalOrNegotiatedAmount ?? 0;
  assertNonNegative(legalSeverance, "L'indemnité légale de rupture");
  assertNonNegative(negotiated, "L'indemnité conventionnelle ou négociée");
  const severanceAmount = Math.max(legalSeverance, negotiated);
  const noticeCompensation = input.noticeCompensation ?? 0;
  const expenseReimbursements = input.expenseReimbursements ?? 0;
  const otherNetAdjustments = input.otherNetAdjustments ?? 0;
  assertNonNegative(noticeCompensation, "L'indemnité compensatrice de préavis");
  assertNonNegative(expenseReimbursements, "Les remboursements de frais");
  if (!Number.isFinite(otherNetAdjustments)) throw new Error("Les autres ajustements nets sont invalides.");

  const warnings: string[] = [];
  if (severanceAmount > 0) warnings.push("Le régime social et fiscal de l'indemnité de rupture doit être résolu selon le motif de rupture et les plafonds applicables avant calcul social final.");
  return {
    finalSalaryGross: roundMoney(input.finalSalaryGross),
    finalSalaryNetPayable: roundMoney(input.finalSalaryNetPayable),
    paidLeaveCompensation: cp.amount,
    cddEndAllowance: cdd.amount,
    severanceAmount: roundMoney(severanceAmount),
    noticeCompensation: roundMoney(noticeCompensation),
    expenseReimbursements: roundMoney(expenseReimbursements),
    otherNetAdjustments: roundMoney(otherNetAdjustments),
    grossTerminationItemsBeforeSocialRecalculation: roundMoney(cp.amount + cdd.amount + noticeCompensation),
    nonGrossCashItems: roundMoney(expenseReimbursements + otherNetAdjustments),
    ruleVersionId: TERMINATION_2026_RULE_VERSION,
    warnings,
  };
}
