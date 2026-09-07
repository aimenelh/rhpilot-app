import { prisma } from "@/lib/prisma";

export type ValidatedAbsencePayrollImpact = {
  absenceId: string;
  employeeId: string;
  type: string;
  startDate: Date;
  endDate: Date;
  periodStart: Date;
  periodEnd: Date;
  calendarDaysInPeriod: number;
  status: "READY";
};

function periodBounds(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 0, 0, 0, 0));
  return { start, end };
}

function clampToPeriod(date: Date, start: Date, end: Date): Date {
  if (date < start) return start;
  if (date > end) return end;
  return date;
}

function inclusiveCalendarDays(start: Date, end: Date): number {
  const startMs = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endMs = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

/**
 * Retourne les absences RH validées qui couvrent tout ou partie d'une période
 * de paie et qui sont prêtes à être interprétées par le moteur.
 *
 * La durée calculée ici est strictement une durée calendaire de chevauchement.
 * Elle ne représente ni des jours travaillés, ni des jours ouvrés, ni des jours
 * ouvrables et ne produit aucun montant de paie. Ces éléments seront déterminés
 * plus tard par le calendrier salarié et les règles légales/conventionnelles.
 */
export async function resolveValidatedAbsencesForPayrollPeriod(input: {
  organizationId: string;
  year: number;
  month: number;
}): Promise<ValidatedAbsencePayrollImpact[]> {
  const { start: periodStart, end: periodEnd } = periodBounds(input.year, input.month);

  const absences = await prisma.absence.findMany({
    where: {
      organizationId: input.organizationId,
      status: "VALIDATED",
      payrollImpactStatus: "READY",
      startDate: { lte: periodEnd },
      endDate: { gte: periodStart },
    },
    select: {
      id: true,
      employeeId: true,
      type: true,
      startDate: true,
      endDate: true,
    },
    orderBy: [{ employeeId: "asc" }, { startDate: "asc" }],
  });

  return absences.map((absence) => {
    const overlapStart = clampToPeriod(absence.startDate, periodStart, periodEnd);
    const overlapEnd = clampToPeriod(absence.endDate, periodStart, periodEnd);

    return {
      absenceId: absence.id,
      employeeId: absence.employeeId,
      type: absence.type,
      startDate: absence.startDate,
      endDate: absence.endDate,
      periodStart: overlapStart,
      periodEnd: overlapEnd,
      calendarDaysInPeriod: inclusiveCalendarDays(overlapStart, overlapEnd),
      status: "READY",
    };
  });
}
