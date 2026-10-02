import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseIsoDateOnly } from "@/lib/dateOnly";
import { WORK_STOPPAGE_KINDS } from "./work-stoppage";
import { invalidateOpenPayrollFrom, lockPayrollAbsenceChanges } from "./period-absence-safety";

export type WorkStoppageRecoveryInput = { organizationId: string; actorUserId: string; absenceId: string; returnDate: string; returnReasonCode: string; today?: Date };

/** Ajoute un fait nouveau sans rouvrir ni réécrire les bulletins clôturés. */
export async function recordWorkStoppageRecoveryInTransaction(tx: Prisma.TransactionClient, input: WorkStoppageRecoveryInput) {
  const date = parseIsoDateOnly(input.returnDate);
  if (!date) throw new Error("La date de reprise réelle est invalide.");
  const today = (input.today ?? new Date()).toISOString().slice(0, 10);
  if (input.returnDate > today) throw new Error("Une reprise réelle ne peut pas être enregistrée dans le futur.");
  if (!["01", "03"].includes(input.returnReasonCode)) throw new Error("La reprise thérapeutique nécessite un traitement spécifique encore non disponible. Sélectionnez un motif correspondant à la reprise effective.");

  await lockPayrollAbsenceChanges(tx, input.organizationId);
  await tx.$queryRaw`SELECT "id" FROM "absences" WHERE "id" = ${input.absenceId} AND "organizationId" = ${input.organizationId} FOR UPDATE`;
  const absence = await tx.absence.findFirst({ where: { id: input.absenceId, organizationId: input.organizationId, employee: { deletedAt: null } } });
  if (!absence) throw new Error("Absence introuvable.");
  if (!WORK_STOPPAGE_KINDS.has(absence.type) || absence.status !== "VALIDATED" || !["READY", "INTEGRATED"].includes(absence.payrollImpactStatus)) throw new Error("La reprise doit être enregistrée sur un arrêt de travail validé et prêt pour la paie.");
  if (absence.returnDate || absence.returnReasonCode) {
    if (absence.returnDate?.getTime() === date.getTime() && absence.returnReasonCode === input.returnReasonCode) return { changed: false, invalidatedPeriods: 0 };
    throw new Error("Une reprise est déjà enregistrée. Sa correction doit suivre le processus de régularisation ; elle ne peut pas être remplacée ici.");
  }
  if (date <= absence.startDate || date.getTime() > absence.endDate.getTime() + 86400000) throw new Error("La reprise doit suivre le début de l'arrêt et intervenir au plus tard le lendemain de sa fin prescrite. Vérifiez le dernier arrêt ou sa prolongation.");

  const closed = await tx.payrollPeriod.findFirst({ where: { organizationId: input.organizationId, status: { in: ["VALIDATED", "LOCKED"] }, payroll_calculations: { some: { employeeId: absence.employeeId } } }, orderBy: [{ year: "desc" }, { month: "desc" }], select: { year: true, month: true } });
  if (closed && date <= new Date(Date.UTC(closed.year, closed.month, 0))) throw new Error("Cette reprise concerne un mois de paie déjà validé ou clôturé. Une régularisation est nécessaire ; aucun bulletin antérieur n'a été modifié.");

  await tx.absence.update({ where: { id: absence.id }, data: { returnDate: date, returnReasonCode: input.returnReasonCode } });
  const invalidated = await invalidateOpenPayrollFrom(tx, input.organizationId, absence.employeeId, date);
  await tx.auditLog.create({ data: { id: randomUUID(), organizationId: input.organizationId, actorUserId: input.actorUserId,
    action: "absence.recovery.recorded", entityType: "Absence", entityId: absence.id,
    metadata: { employeeId: absence.employeeId, returnDate: input.returnDate, returnReasonCode: input.returnReasonCode, invalidatedPeriods: invalidated.count } } });
  return { changed: true, invalidatedPeriods: invalidated.count };
}

export function recordWorkStoppageRecovery(input: WorkStoppageRecoveryInput) {
  return prisma.$transaction((tx) => recordWorkStoppageRecoveryInTransaction(tx, input), { maxWait: 10000, timeout: 20000 });
}
