import { Prisma } from "@prisma/client";
import { isAbsenceNeededForPayrollMonth } from "./absence-payroll-impact";

/** Sérialise reprise, enregistrement du calcul et validation dans l'entreprise. */
export async function lockPayrollAbsenceChanges(tx: Prisma.TransactionClient, organizationId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`payroll-absence:${organizationId}`}, 0))`;
}

const DATE_FIELDS = ["startDate", "endDate", "lastWorkedDate", "subrogationStartDate", "subrogationEndDate", "workAccidentDate", "returnDate"] as const;

function canonicalAbsence(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Les absences du calcul sont incomplètes. Recalculez la période avant validation.");
  const row = value as Record<string, unknown>;
  const id = row.absenceId ?? row.id;
  if (typeof id !== "string" || typeof row.type !== "string") throw new Error("Les absences du calcul sont incomplètes. Recalculez la période avant validation.");
  const days = DATE_FIELDS.map((field) => {
    const date = row[field];
    if (date == null) {
      if (field === "startDate" || field === "endDate") throw new Error("Les dates des absences du calcul sont incomplètes. Recalculez la période.");
      return null;
    }
    const iso = date instanceof Date ? date.toISOString() : date;
    if (typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(iso)) throw new Error("Les dates des absences du calcul sont invalides. Recalculez la période.");
    return iso.slice(0, 10);
  });
  return JSON.stringify([id, row.type, ...days, row.returnReasonCode ?? null]);
}

/** Vérifie les faits RH avant de conserver ou valider un calcul fait plus tôt. */
export async function assertCurrentPayrollAbsences(tx: Prisma.TransactionClient, input: {
  organizationId: string; year: number; month: number;
  calculations: Array<{ employeeId: string; absences: unknown }>;
}): Promise<string[]> {
  const start = new Date(Date.UTC(input.year, input.month - 1, 1));
  const end = new Date(Date.UTC(input.year, input.month, 0));
  const employeeIds = input.calculations.map((item) => item.employeeId);
  if (employeeIds.length > 0) await tx.$queryRaw`SELECT "id" FROM "absences" WHERE "organizationId" = ${input.organizationId} AND "employeeId" IN (${Prisma.join(employeeIds)}) ORDER BY "id" FOR UPDATE`;
  const rows = await tx.absence.findMany({
    where: { organizationId: input.organizationId, employeeId: { in: employeeIds }, status: "VALIDATED", startDate: { lte: end },
      OR: [{ endDate: { gte: start } }, { type: { in: ["SICK_LEAVE", "WORK_ACCIDENT", "MATERNITY", "PATERNITY"] }, returnDate: { gte: start, lte: end } }, { type: "PAID_LEAVE", endDate: { gte: new Date(start.getTime() - 31 * 86400000) } }] },
    select: { id: true, employeeId: true, type: true, startDate: true, endDate: true, lastWorkedDate: true,
      subrogationStartDate: true, subrogationEndDate: true, workAccidentDate: true, returnDate: true, returnReasonCode: true, payrollImpactStatus: true },
  });
  const active = rows.filter((row) => isAbsenceNeededForPayrollMonth(row, start, end));
  if (active.some((row) => !["READY", "INTEGRATED"].includes(row.payrollImpactStatus))) throw new Error("Des absences ne sont plus prêtes pour la paie. Recalculez la période après traitement RH.");
  for (const calculation of input.calculations) {
    if (!Array.isArray(calculation.absences)) throw new Error("Les absences du calcul ne sont pas vérifiables. Recalculez la période avant validation.");
    const frozen = calculation.absences.map(canonicalAbsence).sort();
    const current = active.filter((row) => row.employeeId === calculation.employeeId).map(canonicalAbsence).sort();
    if (JSON.stringify(frozen) !== JSON.stringify(current)) throw new Error("Une absence ou une reprise a changé depuis le calcul. Recalculez la période avant validation.");
  }
  return active.map((row) => row.id);
}

export async function assertPayrollPeriodStatus(tx: Prisma.TransactionClient, organizationId: string, periodId: string, expected: string) {
  const period = await tx.payrollPeriod.findFirst({ where: { id: periodId, organizationId }, select: { status: true } });
  if (period?.status !== expected) throw new Error("L'état de la période a changé. Rechargez la page et recalculez la paie si nécessaire.");
}

export async function assertAbsenceStartsAfterClosedPayroll(tx: Prisma.TransactionClient, organizationId: string, employeeId: string, startDate: Date) {
  const closed = await tx.payrollPeriod.findFirst({ where: { organizationId, status: { in: ["VALIDATED", "LOCKED"] }, payroll_calculations: { some: { employeeId } } }, orderBy: [{ year: "desc" }, { month: "desc" }], select: { year: true, month: true } });
  if (closed && startDate <= new Date(Date.UTC(closed.year, closed.month, 0))) throw new Error("Cette nouvelle absence concerne une paie déjà validée ou clôturée. Elle nécessite une régularisation avant transmission à la paie.");
}

export async function invalidateOpenPayrollFrom(tx: Prisma.TransactionClient, organizationId: string, employeeId: string, date: Date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return tx.payrollPeriod.updateMany({ where: { organizationId, status: { in: ["CALCULATED", "REVIEW"] }, payroll_calculations: { some: { employeeId } }, OR: [{ year: { gt: year } }, { year, month: { gte: month } }] }, data: { status: "DRAFT", calculatedAt: null } });
}
