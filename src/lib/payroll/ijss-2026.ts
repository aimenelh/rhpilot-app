export const IJSS_2026_RULE_VERSION = "FR-IJSS-2026-01";

export type IjssResult = {
  dailyReferenceSalary: number;
  dailyBenefit: number;
  compensatedDays: number;
  waitingDays: number;
  grossBenefitTotal: number;
  ruleVersionId: string;
  sourceReference: string;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} doit être positif ou nul.`);
}

function assertDays(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} doit être un nombre entier positif ou nul.`);
}

function cappedSalarySum(salaries: readonly number[], monthlyCap: number): number {
  if (salaries.length === 0) throw new Error("Au moins un salaire de référence est nécessaire.");
  assertNonNegative(monthlyCap, "Le plafond mensuel de salaire");
  return salaries.reduce((sum, salary) => {
    assertNonNegative(salary, "Un salaire de référence");
    return sum + Math.min(salary, monthlyCap);
  }, 0);
}

export function calculateSicknessIjss2026(input: {
  previousGrossSalaries: readonly [number, number, number];
  prescribedCalendarDays: number;
  startDate: Date;
  monthlySalaryCap?: number;
  dailyBenefitCap?: number;
  waitingDays?: number;
}): IjssResult {
  assertDays(input.prescribedCalendarDays, "La durée prescrite");
  if (!(input.startDate instanceof Date) || Number.isNaN(input.startDate.getTime())) throw new Error("La date de début de l'arrêt maladie est invalide.");
  const july2026 = new Date(Date.UTC(2026, 6, 1));
  const defaultSalaryCap = input.startDate >= july2026 ? 2613.83 : 2522.52;
  const defaultDailyCap = input.startDate >= july2026 ? 42.97 : 41.95;
  const monthlyCap = input.monthlySalaryCap ?? defaultSalaryCap;
  const dailyCap = input.dailyBenefitCap ?? defaultDailyCap;
  const waitingDays = input.waitingDays ?? 3;
  assertDays(waitingDays, "Le délai de carence");
  assertNonNegative(dailyCap, "Le plafond journalier maladie");

  const sum = cappedSalarySum(input.previousGrossSalaries, monthlyCap);
  const dailyReferenceSalary = roundMoney(sum / 91.25);
  const dailyBenefit = roundMoney(Math.min(dailyReferenceSalary * 0.5, dailyCap));
  const compensatedDays = Math.max(0, input.prescribedCalendarDays - waitingDays);
  return {
    dailyReferenceSalary,
    dailyBenefit,
    compensatedDays,
    waitingDays,
    grossBenefitTotal: roundMoney(dailyBenefit * compensatedDays),
    ruleVersionId: IJSS_2026_RULE_VERSION,
    sourceReference: "Assurance Maladie — IJ maladie 2026 : 50 % du SJB, salaires plafonnés à 1,4 SMIC, carence 3 jours",
  };
}

export function calculateMaternityPaternityAdoptionIjss2026(input: {
  previousGrossSalaries: readonly [number, number, number];
  compensatedCalendarDays: number;
  monthlySocialSecurityCeiling?: number;
  flatEmployeeDeductionRate?: number;
  dailyBenefitCap?: number;
}): IjssResult {
  assertDays(input.compensatedCalendarDays, "La durée indemnisée");
  const monthlyCap = input.monthlySocialSecurityCeiling ?? 4005;
  const flatDeduction = input.flatEmployeeDeductionRate ?? 0.21;
  const dailyCap = input.dailyBenefitCap ?? 104.02;
  if (!Number.isFinite(flatDeduction) || flatDeduction < 0 || flatDeduction >= 1) throw new Error("Le taux forfaitaire de déduction maternité/paternité est invalide.");
  assertNonNegative(dailyCap, "Le plafond journalier maternité/paternité/adoption");

  const cappedNetReference = cappedSalarySum(input.previousGrossSalaries, monthlyCap) * (1 - flatDeduction);
  const dailyReferenceSalary = roundMoney(cappedNetReference / 91.25);
  const dailyBenefit = roundMoney(Math.min(dailyReferenceSalary, dailyCap));
  return {
    dailyReferenceSalary,
    dailyBenefit,
    compensatedDays: input.compensatedCalendarDays,
    waitingDays: 0,
    grossBenefitTotal: roundMoney(dailyBenefit * input.compensatedCalendarDays),
    ruleVersionId: IJSS_2026_RULE_VERSION,
    sourceReference: "Assurance Maladie — IJ maternité, paternité et adoption 2026 : 3 salaires plafonnés au PMSS, abattement forfaitaire 21 %, sans carence",
  };
}

export function calculateWorkAccidentIjss2026(input: {
  previousMonthGrossSalary: number;
  compensatedCalendarDays: number;
  daysAlreadyCompensatedBeforePeriod?: number;
  firstPeriodDailyCap?: number;
  secondPeriodDailyCap?: number;
  netSalaryReferenceRate?: number;
}): IjssResult & { firstPeriodDays: number; secondPeriodDays: number; dailyNetSalaryCap: number } {
  assertNonNegative(input.previousMonthGrossSalary, "Le salaire brut du mois précédant l'AT/MP");
  assertDays(input.compensatedCalendarDays, "La durée indemnisée AT/MP");
  const before = input.daysAlreadyCompensatedBeforePeriod ?? 0;
  assertDays(before, "Le nombre de jours déjà indemnisés");
  const cap60 = input.firstPeriodDailyCap ?? 240.49;
  const cap80 = input.secondPeriodDailyCap ?? 320.66;
  const netSalaryReferenceRate = input.netSalaryReferenceRate ?? 0.79;
  assertNonNegative(cap60, "Le plafond AT/MP des 28 premiers jours");
  assertNonNegative(cap80, "Le plafond AT/MP à compter du 29e jour");
  if (!Number.isFinite(netSalaryReferenceRate) || netSalaryReferenceRate <= 0 || netSalaryReferenceRate > 1) throw new Error("Le coefficient de salaire journalier net AT/MP est invalide.");

  const dailyReferenceSalary = roundMoney(input.previousMonthGrossSalary / 30.42);
  const dailyNetSalaryCap = roundMoney(dailyReferenceSalary * netSalaryReferenceRate);
  const firstPeriodRemaining = Math.max(0, 28 - before);
  const firstPeriodDays = Math.min(input.compensatedCalendarDays, firstPeriodRemaining);
  const secondPeriodDays = Math.max(0, input.compensatedCalendarDays - firstPeriodDays);
  const daily60 = roundMoney(Math.min(dailyReferenceSalary * 0.6, cap60, dailyNetSalaryCap));
  const daily80 = roundMoney(Math.min(dailyReferenceSalary * 0.8, cap80, dailyNetSalaryCap));
  const grossBenefitTotal = roundMoney(firstPeriodDays * daily60 + secondPeriodDays * daily80);

  return {
    dailyReferenceSalary,
    dailyBenefit: firstPeriodDays > 0 ? daily60 : daily80,
    dailyNetSalaryCap,
    compensatedDays: input.compensatedCalendarDays,
    waitingDays: 0,
    firstPeriodDays,
    secondPeriodDays,
    grossBenefitTotal,
    ruleVersionId: IJSS_2026_RULE_VERSION,
    sourceReference: "Assurance Maladie — AT/MP 2026 : salaire précédent / 30,42 ; 60 % pendant 28 jours puis 80 %, sans carence et sans dépasser le salaire journalier net",
  };
}

export function buildSubrogatedIjssNetFlow(input: {
  ijssGrossAmount: number;
  socialContributionRate?: number;
  subrogated: boolean;
}): { netIjssAmount: number; netAdjustment: number; subrogated: boolean; ruleVersionId: string } {
  assertNonNegative(input.ijssGrossAmount, "Le montant brut d'IJSS");
  const rate = input.socialContributionRate ?? 0.067;
  if (!Number.isFinite(rate) || rate < 0 || rate >= 1) throw new Error("Le taux de prélèvements sociaux sur IJSS est invalide.");
  const netIjssAmount = roundMoney(input.ijssGrossAmount * (1 - rate));
  return {
    netIjssAmount,
    netAdjustment: input.subrogated ? netIjssAmount : 0,
    subrogated: input.subrogated,
    ruleVersionId: IJSS_2026_RULE_VERSION,
  };
}
