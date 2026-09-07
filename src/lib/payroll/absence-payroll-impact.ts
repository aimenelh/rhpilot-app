import { prisma } from "@/lib/prisma";

export type ValidatedAbsencePayrollImpact = {
  absenceId: string;
  employeeId: string;
  type: string;
  startDate: Date;
  endDate: Date;
  status: "READY";
};

function periodBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Retourne les absences RH validées qui couvrent tout ou partie d'une période
 * de paie et qui sont prêtes à être interprétées par le moteur.
 *
 * Cette étape ne calcule volontairement aucun montant et aucun nombre de jours
 * indemnisés/non indemnisés : ces éléments dépendent du calendrier de travail,
 * du droit applicable et des règles conventionnelles versionnées.
 */
export async function resolveValidatedAbsencesForPayrollPeriod(input: {
  organizationId: string;
  year: number;
  month: number;
}): Promise<ValidatedAbsencePayrollImpact[]> {
  const { start, end } = periodBounds(input.year, input.month);

  const absences = await prisma.absence.findMany({
    where: {
      organizationId: input.organizationId,
      status: "VALIDATED",
      payrollImpactStatus: "READY",
      startDate: { lte: end },
      endDate: { gte: start },
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
    status: "READY",
  }));
}
