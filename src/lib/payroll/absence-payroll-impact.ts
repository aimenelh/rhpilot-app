import { prisma } from "@/lib/prisma";
import {
  resolveAbsencePayrollTreatment,
  type AbsencePayrollImpactResolution,
  type AbsencePayrollTreatmentRule,
} from "./absence-payroll-treatment";

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

export function getCalendarOverlapDays(startDate: Date, endDate: Date, periodStart: Date, periodEnd: Date): number {
  if (endDate < startDate || periodEnd < periodStart) return 0;

  const overlapStart = clampToPeriod(startDate, periodStart, periodEnd);
  const overlapEnd = clampToPeriod(endDate, periodStart, periodEnd);
  if (overlapEnd < overlapStart) return 0;

  const startMs = Date.UTC(overlapStart.getUTCFullYear(), overlapStart.getUTCMonth(), overlapStart.getUTCDate());
  const endMs = Date.UTC(overlapEnd.getUTCFullYear(), overlapEnd.getUTCMonth(), overlapEnd.getUTCDate());
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

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

  return absences.map((absence) => ({
    absenceId: absence.id,
    employeeId: absence.employeeId,
    type: absence.type,
    startDate: absence.startDate,
    endDate: absence.endDate,
    periodStart: clampToPeriod(absence.startDate, periodStart, periodEnd),
    periodEnd: clampToPeriod(absence.endDate, periodStart, periodEnd),
    calendarDaysInPeriod: getCalendarOverlapDays(absence.startDate, absence.endDate, periodStart, periodEnd),
    status: "READY",
  }));
}

export function resolveValidatedAbsencePayrollImpacts(input: {
  absences: ValidatedAbsencePayrollImpact[];
  rules: AbsencePayrollTreatmentRule[];
}): AbsencePayrollImpactResolution[] {
  return input.absences.map((absence) =>
    resolveAbsencePayrollTreatment({
      absence: {
        absenceId: absence.absenceId,
        type: absence.type,
        calendarDaysInPeriod: absence.calendarDaysInPeriod,
      },
      rules: input.rules,
    }),
  );
}
