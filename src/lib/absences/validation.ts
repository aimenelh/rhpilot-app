import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { assertAbsenceStartsAfterClosedPayroll, invalidateOpenPayrollFrom, lockPayrollAbsenceChanges } from "@/lib/payroll/period-absence-safety";

/**
 * Validation d'une absence, partagée par le RH (tableau de bord) et par une
 * règle maison en validation automatique. Les garde-fous de paie sont les
 * mêmes dans les deux cas : une période clôturée n'est jamais touchée.
 */
export async function validateAbsenceInTransaction(
  tx: Prisma.TransactionClient,
  input: { organizationId: string; absenceId: string; actorUserId: string | null; auditMetadata?: Record<string, unknown> },
): Promise<{ invalidatedPeriods: number; alreadyValidated: boolean }> {
  await lockPayrollAbsenceChanges(tx, input.organizationId);
  await tx.$queryRaw`SELECT "id" FROM "absences" WHERE "id" = ${input.absenceId} AND "organizationId" = ${input.organizationId} FOR UPDATE`;
  const absence = await tx.absence.findFirst({
    where: { id: input.absenceId, organizationId: input.organizationId },
    include: { justifications: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!absence) throw new Error("Absence introuvable.");
  if (absence.status === "VALIDATED" && ["READY", "INTEGRATED"].includes(absence.payrollImpactStatus)) return { invalidatedPeriods: 0, alreadyValidated: true };
  if (absence.payrollImpactStatus === "INTEGRATED") throw new Error("Cette absence est déjà intégrée à la paie.");
  if (absence.justificationRequired && absence.justifications[0]?.status !== "VALIDATED") throw new Error("Le justificatif doit être vérifié avant de valider cette absence.");
  await assertAbsenceStartsAfterClosedPayroll(tx, input.organizationId, absence.employeeId, absence.startDate);
  await tx.absence.update({
    where: { id: absence.id },
    data: { status: "VALIDATED", payrollImpactStatus: "READY", validatedByUserId: input.actorUserId, validatedAt: new Date(), rejectedReason: null },
  });
  const invalidatedPeriods = (await invalidateOpenPayrollFrom(tx, input.organizationId, absence.employeeId, absence.startDate)).count;
  await tx.auditLog.create({
    data: {
      id: randomUUID(),
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "absence.validated",
      entityType: "Absence",
      entityId: absence.id,
      metadata: { payrollImpactStatus: "READY", invalidatedPeriods, ...(input.auditMetadata ?? {}) } as Prisma.InputJsonObject,
    },
  });
  return { invalidatedPeriods, alreadyValidated: false };
}
