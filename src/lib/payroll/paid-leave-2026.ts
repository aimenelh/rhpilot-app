export const PAID_LEAVE_2026_RULE_VERSION = "FR-PAID-LEAVE-2026-01";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundDays(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function assertNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} doit être positif ou nul.`);
}

export type PaidLeaveAcquisitionResult = {
  workingMonthsEquivalent: number;
  nonProfessionalSicknessMonthsEquivalent: number;
  acquiredWorkingDays: number;
  acquiredSicknessDays: number;
  acquiredTotalBeforeRounding: number;
  acquiredTotalRounded: number;
  ruleVersionId: string;
  sourceReference: string;
};

/**
 * Acquisition en jours ouvrables. Les périodes AT/MP, maternité, paternité et
 * adoption doivent être intégrées dans `workingMonthsEquivalent`, car elles
 * sont assimilées à du travail effectif pour l'acquisition des congés.
 */
export function calculatePaidLeaveAcquisition2026(input: {
  workingMonthsEquivalent: number;
  nonProfessionalSicknessMonthsEquivalent?: number;
}): PaidLeaveAcquisitionResult {
  assertNonNegative(input.workingMonthsEquivalent, "Les mois équivalents de travail effectif");
  const sicknessMonths = input.nonProfessionalSicknessMonthsEquivalent ?? 0;
  assertNonNegative(sicknessMonths, "Les mois de maladie non professionnelle");

  const acquiredWorkingDays = input.workingMonthsEquivalent * 2.5;
  const acquiredSicknessDays = Math.min(sicknessMonths * 2, 24);
  const total = Math.min(30, acquiredWorkingDays + acquiredSicknessDays);
  return {
    workingMonthsEquivalent: roundDays(input.workingMonthsEquivalent),
    nonProfessionalSicknessMonthsEquivalent: roundDays(sicknessMonths),
    acquiredWorkingDays: roundDays(acquiredWorkingDays),
    acquiredSicknessDays: roundDays(acquiredSicknessDays),
    acquiredTotalBeforeRounding: roundDays(total),
    acquiredTotalRounded: Math.ceil(total - 1e-9),
    ruleVersionId: PAID_LEAVE_2026_RULE_VERSION,
    sourceReference: "Code du travail / Service-Public : 2,5 j ouvrables/mois ; maladie non professionnelle 2 j/mois dans la limite de 24 j/an",
  };
}

export type PaidLeaveIndemnity2026Result = {
  tenthMethodAmount: number;
  salaryMaintenanceAmount: number;
  selectedAmount: number;
  selectedMethod: "TENTH" | "SALARY_MAINTENANCE";
  grossDeductionForAbsence: number;
  grossIndemnity: number;
  netGrossDelta: number;
  leaveStartDate: string;
  leaveEndDate: string;
  ruleVersionId: string;
  sourceReference: string;
};

/**
 * Compare la règle du dixième et le maintien de salaire.
 * Le maintien utilise les heures réelles du mois, méthode reconnue par la
 * jurisprudence. La rémunération de référence du dixième doit être fournie par
 * le moteur de cumul de la période de référence, sans être recomposée ici.
 */
export function calculatePaidLeaveIndemnity2026(input: {
  referencePeriodGrossAmount: number;
  leaveDays: number;
  leaveDayDenominator: 25 | 30;
  monthlySalaryAmount: number;
  actualHoursInMonth: number;
  leaveHoursInMonth: number;
  leaveStartDate: Date;
  leaveEndDate: Date;
}): PaidLeaveIndemnity2026Result {
  assertNonNegative(input.referencePeriodGrossAmount, "La rémunération brute de référence");
  assertNonNegative(input.leaveDays, "Les jours de congés");
  assertNonNegative(input.monthlySalaryAmount, "Le salaire mensuel");
  if (!Number.isFinite(input.actualHoursInMonth) || input.actualHoursInMonth <= 0) throw new Error("Les heures réelles du mois doivent être strictement positives.");
  assertNonNegative(input.leaveHoursInMonth, "Les heures de congés du mois");
  if (input.leaveHoursInMonth > input.actualHoursInMonth + 1e-9) throw new Error("Les heures de congés dépassent les heures réelles du mois.");
  if (!(input.leaveStartDate instanceof Date) || Number.isNaN(input.leaveStartDate.getTime()) || !(input.leaveEndDate instanceof Date) || Number.isNaN(input.leaveEndDate.getTime())) throw new Error("Les dates de congés sont invalides.");
  if (input.leaveEndDate < input.leaveStartDate) throw new Error("La fin des congés précède leur début.");

  const tenthMethodAmount = roundMoney((input.referencePeriodGrossAmount / 10) * (input.leaveDays / input.leaveDayDenominator));
  const salaryMaintenanceAmount = roundMoney(input.monthlySalaryAmount * input.leaveHoursInMonth / input.actualHoursInMonth);
  const selectedMethod = tenthMethodAmount >= salaryMaintenanceAmount ? "TENTH" : "SALARY_MAINTENANCE";
  const selectedAmount = selectedMethod === "TENTH" ? tenthMethodAmount : salaryMaintenanceAmount;
  const grossDeductionForAbsence = salaryMaintenanceAmount;
  const grossIndemnity = selectedAmount;

  return {
    tenthMethodAmount,
    salaryMaintenanceAmount,
    selectedAmount,
    selectedMethod,
    grossDeductionForAbsence,
    grossIndemnity,
    netGrossDelta: roundMoney(grossIndemnity - grossDeductionForAbsence),
    leaveStartDate: input.leaveStartDate.toISOString().slice(0, 10),
    leaveEndDate: input.leaveEndDate.toISOString().slice(0, 10),
    ruleVersionId: PAID_LEAVE_2026_RULE_VERSION,
    sourceReference: "Service-Public — indemnité de congés payés : comparaison dixième / maintien ; horaire réel du mois admis",
  };
}

export function calculatePaidLeaveCompensationAtTermination2026(input: {
  referencePeriodGrossAmount: number;
  remainingLeaveDays: number;
  leaveDayDenominator: 25 | 30;
  equivalentSalaryMaintenanceAmount: number;
}): { amount: number; selectedMethod: "TENTH" | "SALARY_MAINTENANCE"; ruleVersionId: string } {
  assertNonNegative(input.referencePeriodGrossAmount, "La rémunération brute de référence");
  assertNonNegative(input.remainingLeaveDays, "Les congés restant dus");
  assertNonNegative(input.equivalentSalaryMaintenanceAmount, "Le maintien équivalent");
  const tenth = roundMoney((input.referencePeriodGrossAmount / 10) * (input.remainingLeaveDays / input.leaveDayDenominator));
  const maintenance = roundMoney(input.equivalentSalaryMaintenanceAmount);
  return {
    amount: Math.max(tenth, maintenance),
    selectedMethod: tenth >= maintenance ? "TENTH" : "SALARY_MAINTENANCE",
    ruleVersionId: PAID_LEAVE_2026_RULE_VERSION,
  };
}
