import type { WeeklySchedule } from "@/lib/payroll/bulletin/calendar";

const ROUND = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export type ContractWorkTime = {
  weeklyHours: number;
  monthlyHours: number;
  schedule: WeeklySchedule;
  structuralOvertimeMonthlyHours: number;
};

export function monthlyHoursFromWeekly(weeklyHours: number): number {
  return ROUND((weeklyHours * 52) / 12);
}

export function structuralOvertimeMonthlyHours(weeklyHours: number): number {
  return ROUND((Math.max(0, weeklyHours - 35) * 52) / 12);
}

/**
 * Répartition neutre quand seule la durée hebdomadaire est connue :
 * lundi à vendredi, avec correction du vendredi pour conserver exactement le total.
 * L'utilisateur peut ensuite remplacer cette proposition par son horaire réel.
 */
export function defaultScheduleForWeeklyHours(weeklyHours: number): WeeklySchedule {
  if (!Number.isFinite(weeklyHours) || weeklyHours <= 0 || weeklyHours > 84) {
    throw new Error("La durée hebdomadaire doit être comprise entre 0 et 84 heures.");
  }
  const daily = ROUND(weeklyHours / 5);
  const friday = ROUND(weeklyHours - daily * 4);
  return [daily, daily, daily, daily, friday, 0, 0];
}

export function buildContractWorkTime(
  weeklyHours: number,
  scheduleInput?: readonly number[] | null,
): ContractWorkTime {
  if (!Number.isFinite(weeklyHours) || weeklyHours <= 0 || weeklyHours > 84) {
    throw new Error("La durée hebdomadaire contractuelle est invalide.");
  }

  const rawSchedule = scheduleInput && scheduleInput.length === 7
    ? [...scheduleInput]
    : [...defaultScheduleForWeeklyHours(weeklyHours)];

  if (rawSchedule.length !== 7 || rawSchedule.some((hours) => !Number.isFinite(hours) || hours < 0 || hours > 12)) {
    throw new Error("Chaque journée de l'horaire doit contenir entre 0 et 12 heures.");
  }

  const total = ROUND(rawSchedule.reduce((sum, hours) => sum + hours, 0));
  if (Math.abs(total - weeklyHours) > 0.05) {
    throw new Error(
      `La répartition quotidienne totalise ${total.toLocaleString("fr-FR")} h, alors que le contrat prévoit ${weeklyHours.toLocaleString("fr-FR")} h par semaine.`,
    );
  }

  return {
    weeklyHours: ROUND(weeklyHours),
    monthlyHours: monthlyHoursFromWeekly(weeklyHours),
    schedule: rawSchedule as unknown as WeeklySchedule,
    structuralOvertimeMonthlyHours: structuralOvertimeMonthlyHours(weeklyHours),
  };
}

export function weeklyHoursFromMonthly(monthlyHours: number): number {
  if (!Number.isFinite(monthlyHours) || monthlyHours <= 0) return 0;
  return ROUND((monthlyHours * 12) / 52);
}
