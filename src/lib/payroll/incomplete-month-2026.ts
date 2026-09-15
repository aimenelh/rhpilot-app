export const INCOMPLETE_MONTH_RULE_VERSION = "FR-INCOMPLETE-MONTH-ACTUAL-HOURS-2026-01";

export type IncompleteMonthProrationResult = {
  monthScheduledHours: number;
  payableScheduledHours: number;
  missingScheduledHours: number;
  payableSalaryAmount: number;
  grossDeduction: number;
  ruleVersionId: string;
  sourceReference: string;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundHours(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function assertValidDate(date: Date | null | undefined, label: string): void {
  if (date && (!(date instanceof Date) || Number.isNaN(date.getTime()))) throw new Error(`${label} est invalide.`);
}

/**
 * Proratisation d'un mois incomplet sur les heures réelles programmées dans le
 * mois. Le planning hebdomadaire doit être explicitement fourni ; RH Pilot ne
 * suppose jamais qu'un salarié travaille du lundi au vendredi.
 */
export function calculateIncompleteMonthActualHours2026(input: {
  year: number;
  month: number;
  monthlySalaryAmount: number;
  hireDate?: Date | null;
  contractEndDate?: Date | null;
  workingWeekdays: readonly number[];
  hoursByWeekday: Readonly<Partial<Record<number, number>>>;
  nonWorkedDates?: readonly string[];
}): IncompleteMonthProrationResult {
  if (!Number.isInteger(input.year) || input.year < 2000 || input.year > 2100 || !Number.isInteger(input.month) || input.month < 1 || input.month > 12) throw new Error("La période du mois incomplet est invalide.");
  if (!Number.isFinite(input.monthlySalaryAmount) || input.monthlySalaryAmount < 0) throw new Error("Le salaire mensuel est invalide.");
  assertValidDate(input.hireDate, "La date d'entrée");
  assertValidDate(input.contractEndDate, "La date de sortie");
  if (input.workingWeekdays.length === 0) throw new Error("Le planning hebdomadaire est obligatoire pour proratiser un mois incomplet.");

  const uniqueWeekdays = [...new Set(input.workingWeekdays)];
  for (const weekday of uniqueWeekdays) {
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new Error("Un jour du planning hebdomadaire est invalide.");
    const hours = input.hoursByWeekday[weekday];
    if (!Number.isFinite(hours) || (hours ?? 0) <= 0 || (hours ?? 0) > 24) throw new Error(`Le nombre d'heures programmé pour le jour ${weekday} est invalide.`);
  }

  const monthStart = utcDate(input.year, input.month - 1, 1);
  const monthEnd = utcDate(input.year, input.month, 0);
  const hire = input.hireDate && input.hireDate > monthStart ? utcDate(input.hireDate.getUTCFullYear(), input.hireDate.getUTCMonth(), input.hireDate.getUTCDate()) : monthStart;
  const exit = input.contractEndDate && input.contractEndDate < monthEnd ? utcDate(input.contractEndDate.getUTCFullYear(), input.contractEndDate.getUTCMonth(), input.contractEndDate.getUTCDate()) : monthEnd;
  if (exit < monthStart || hire > monthEnd || exit < hire) throw new Error("Le contrat ne couvre aucun jour payable de la période.");

  const nonWorked = new Set(input.nonWorkedDates ?? []);
  let monthScheduledHours = 0;
  let payableScheduledHours = 0;

  for (let day = 1; day <= monthEnd.getUTCDate(); day += 1) {
    const date = utcDate(input.year, input.month - 1, day);
    const weekday = date.getUTCDay();
    if (!uniqueWeekdays.includes(weekday) || nonWorked.has(dateKey(date))) continue;
    const hours = input.hoursByWeekday[weekday] ?? 0;
    monthScheduledHours += hours;
    if (date >= hire && date <= exit) payableScheduledHours += hours;
  }

  if (monthScheduledHours <= 0) throw new Error("Aucune heure réelle de travail n'est programmée dans le mois.");
  const missingScheduledHours = monthScheduledHours - payableScheduledHours;
  const payableSalaryAmount = roundMoney(input.monthlySalaryAmount * payableScheduledHours / monthScheduledHours);
  const grossDeduction = roundMoney(input.monthlySalaryAmount - payableSalaryAmount);

  return {
    monthScheduledHours: roundHours(monthScheduledHours),
    payableScheduledHours: roundHours(payableScheduledHours),
    missingScheduledHours: roundHours(missingScheduledHours),
    payableSalaryAmount,
    grossDeduction,
    ruleVersionId: INCOMPLETE_MONTH_RULE_VERSION,
    sourceReference: "Méthode de l'horaire réel du mois : salaire mensuel × heures réellement payables / heures réellement programmées",
  };
}
