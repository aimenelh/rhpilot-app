export const WORKING_TIME_RULE_VERSION = "FR-WORKING-TIME-2026-01";

export type OvertimeRateBands = {
  firstBandHours: number;
  firstBandPremiumRate: number;
  secondBandPremiumRate: number;
  sourceReference: string;
};

export type OvertimeWeekInput = {
  weekLabel: string;
  overtimeHours: number;
  rates?: OvertimeRateBands;
};

export type WorkingTimeLine = {
  code: "OVERTIME_HOURS" | "ADDITIONAL_HOURS";
  label: string;
  hours: number;
  baseHourlyRate: number;
  premiumRate: number;
  amount: number;
  ruleVersionId: string;
  sourceReference: string;
};

export type WorkingTimePayResult = {
  totalHours: number;
  totalAmount: number;
  lines: WorkingTimeLine[];
};

const DEFAULT_OVERTIME: OvertimeRateBands = {
  firstBandHours: 8,
  firstBandPremiumRate: 0.25,
  secondBandPremiumRate: 0.5,
  sourceReference: "Code du travail, art. L3121-36",
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundHours(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function assertPositiveFinite(value: number, label: string, allowZero = false): void {
  if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) {
    throw new Error(`${label} doit être ${allowZero ? "positif ou nul" : "strictement positif"}.`);
  }
}

export function calculateBaseHourlyRate(baseSalaryAmount: number, monthlyHours: number): number {
  assertPositiveFinite(baseSalaryAmount, "Le salaire mensuel", true);
  assertPositiveFinite(monthlyHours, "Le volume mensuel d'heures");
  return roundMoney(baseSalaryAmount / monthlyHours);
}

export function calculateOvertimePay(input: {
  baseSalaryAmount: number;
  monthlyHours: number;
  weeks: readonly OvertimeWeekInput[];
  ruleVersionId?: string;
}): WorkingTimePayResult {
  const baseHourlyRate = calculateBaseHourlyRate(input.baseSalaryAmount, input.monthlyHours);
  const lines: WorkingTimeLine[] = [];

  for (const week of input.weeks) {
    assertPositiveFinite(week.overtimeHours, `Les heures supplémentaires (${week.weekLabel})`, true);
    const rates = week.rates ?? DEFAULT_OVERTIME;
    assertPositiveFinite(rates.firstBandHours, "La première tranche d'heures supplémentaires");
    if (!Number.isFinite(rates.firstBandPremiumRate) || rates.firstBandPremiumRate < 0.1) {
      throw new Error("Le taux conventionnel de majoration des heures supplémentaires ne peut pas être inférieur à 10 %.");
    }
    if (!Number.isFinite(rates.secondBandPremiumRate) || rates.secondBandPremiumRate < 0.1) {
      throw new Error("Le taux de majoration de la seconde tranche d'heures supplémentaires est invalide.");
    }

    const firstBand = Math.min(week.overtimeHours, rates.firstBandHours);
    const secondBand = Math.max(0, week.overtimeHours - firstBand);
    const ruleVersionId = input.ruleVersionId ?? WORKING_TIME_RULE_VERSION;

    if (firstBand > 0) {
      lines.push({
        code: "OVERTIME_HOURS",
        label: `Heures supplémentaires ${week.weekLabel} — tranche 1`,
        hours: roundHours(firstBand),
        baseHourlyRate,
        premiumRate: rates.firstBandPremiumRate,
        amount: roundMoney(firstBand * baseHourlyRate * (1 + rates.firstBandPremiumRate)),
        ruleVersionId,
        sourceReference: rates.sourceReference,
      });
    }
    if (secondBand > 0) {
      lines.push({
        code: "OVERTIME_HOURS",
        label: `Heures supplémentaires ${week.weekLabel} — tranche 2`,
        hours: roundHours(secondBand),
        baseHourlyRate,
        premiumRate: rates.secondBandPremiumRate,
        amount: roundMoney(secondBand * baseHourlyRate * (1 + rates.secondBandPremiumRate)),
        ruleVersionId,
        sourceReference: rates.sourceReference,
      });
    }
  }

  return {
    totalHours: roundHours(lines.reduce((sum, line) => sum + line.hours, 0)),
    totalAmount: roundMoney(lines.reduce((sum, line) => sum + line.amount, 0)),
    lines,
  };
}

export function calculateComplementaryHoursPay(input: {
  baseSalaryAmount: number;
  monthlyHours: number;
  complementaryHours: number;
  contractualMonthlyHours: number;
  agreementAllowsOneThird?: boolean;
  firstBandPremiumRate?: number;
  secondBandPremiumRate?: number;
  ruleVersionId?: string;
  sourceReference?: string;
}): WorkingTimePayResult {
  const baseHourlyRate = calculateBaseHourlyRate(input.baseSalaryAmount, input.monthlyHours);
  assertPositiveFinite(input.complementaryHours, "Les heures complémentaires", true);
  assertPositiveFinite(input.contractualMonthlyHours, "La durée mensuelle contractuelle");

  const firstRate = input.firstBandPremiumRate ?? 0.1;
  const secondRate = input.secondBandPremiumRate ?? 0.25;
  if (!Number.isFinite(firstRate) || firstRate < 0.1 || !Number.isFinite(secondRate) || secondRate < 0.1) {
    throw new Error("Le taux de majoration des heures complémentaires est invalide.");
  }

  const firstLimit = input.contractualMonthlyHours / 10;
  const absoluteLimit = input.agreementAllowsOneThird
    ? input.contractualMonthlyHours / 3
    : firstLimit;
  if (input.complementaryHours > absoluteLimit + 1e-9) {
    throw new Error("Le nombre d'heures complémentaires dépasse la limite applicable au contrat.");
  }

  const firstBand = Math.min(input.complementaryHours, firstLimit);
  const secondBand = Math.max(0, input.complementaryHours - firstBand);
  const sourceReference = input.sourceReference ?? "Code du travail, art. L3123-29";
  const ruleVersionId = input.ruleVersionId ?? WORKING_TIME_RULE_VERSION;
  const lines: WorkingTimeLine[] = [];

  if (firstBand > 0) {
    lines.push({
      code: "ADDITIONAL_HOURS",
      label: "Heures complémentaires — dans la limite du dixième",
      hours: roundHours(firstBand),
      baseHourlyRate,
      premiumRate: firstRate,
      amount: roundMoney(firstBand * baseHourlyRate * (1 + firstRate)),
      ruleVersionId,
      sourceReference,
    });
  }
  if (secondBand > 0) {
    lines.push({
      code: "ADDITIONAL_HOURS",
      label: "Heures complémentaires — au-delà du dixième",
      hours: roundHours(secondBand),
      baseHourlyRate,
      premiumRate: secondRate,
      amount: roundMoney(secondBand * baseHourlyRate * (1 + secondRate)),
      ruleVersionId,
      sourceReference,
    });
  }

  return {
    totalHours: roundHours(input.complementaryHours),
    totalAmount: roundMoney(lines.reduce((sum, line) => sum + line.amount, 0)),
    lines,
  };
}
