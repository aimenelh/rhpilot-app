"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storeAbsenceJustification } from "@/lib/absence-justification-storage";
import { parseIsoDateOnly } from "@/lib/dateOnly";
import { userFacingError } from "@/lib/userFacingError";
import { recordWorkStoppageRecovery } from "@/lib/payroll/work-stoppage-recovery";
import { assertAbsenceStartsAfterClosedPayroll, invalidateOpenPayrollFrom, lockPayrollAbsenceChanges } from "@/lib/payroll/period-absence-safety";

const ABSENCE_TYPES = ["PAID_LEAVE", "RTT", "SICK_LEAVE", "WORK_ACCIDENT", "UNPAID_LEAVE", "FAMILY_EVENT", "MATERNITY", "PATERNITY", "OTHER"] as const;
type AbsenceTypeValue = (typeof ABSENCE_TYPES)[number];
const WORK_STOPPAGE_TYPES = new Set<AbsenceTypeValue>(["SICK_LEAVE", "WORK_ACCIDENT", "MATERNITY", "PATERNITY"]);
export type AbsenceActionState = { error?: string; success?: string } | undefined;

function parseDate(value: FormDataEntryValue | null): Date | null {
  return typeof value === "string" ? parseIsoDateOnly(value) : null;
}

function isAdmin(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

function revalidateAbsenceViews() {
  revalidatePath("/dashboard/absences");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/payroll");
  revalidatePath("/dashboard/payroll/dsn");
}

export async function recordAbsenceRecovery(absenceId: string, formData: FormData): Promise<AbsenceActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent enregistrer une reprise." };
  try {
    const result = await recordWorkStoppageRecovery({ organizationId: membership.organizationId, actorUserId: user.id, absenceId,
      returnDate: String(formData.get("returnDate") ?? "").trim(), returnReasonCode: String(formData.get("returnReasonCode") ?? "").trim() });
    revalidateAbsenceViews();
    return { success: result.invalidatedPeriods > 0 ? "Reprise enregistrée. Recalculez les périodes ouvertes concernées avant validation." : "Reprise enregistrée. Les bulletins clôturés sont conservés." };
  } catch (error) {
    return { error: userFacingError(error, "La reprise n'a pas pu être enregistrée. Réessayez.") };
  }
}

async function findOverlap(input: {
  organizationId: string;
  employeeId: string;
  startDate: Date;
  endDate: Date;
  excludeAbsenceId?: string;
}) {
  return prisma.absence.findFirst({
    where: {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      id: input.excludeAbsenceId ? { not: input.excludeAbsenceId } : undefined,
      status: { not: "REJECTED" },
      startDate: { lte: input.endDate },
      endDate: { gte: input.startDate },
    },
    select: { id: true, startDate: true, endDate: true },
  });
}

function parseAbsenceForm(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const startDate = parseDate(formData.get("startDate"));
  const endDate = parseDate(formData.get("endDate"));
  const justificationRequired = formData.get("justificationRequired") === "on";
  const notes = String(formData.get("notes") ?? "").trim();
  const lastWorkedDate = parseDate(formData.get("lastWorkedDate"));
  const subrogationStartDate = parseDate(formData.get("subrogationStartDate"));
  const subrogationEndDate = parseDate(formData.get("subrogationEndDate"));
  const workAccidentDate = parseDate(formData.get("workAccidentDate"));
  const returnDate = parseDate(formData.get("returnDate"));
  const returnReasonCode = String(formData.get("returnReasonCode") ?? "").trim() || null;

  for (const field of ["lastWorkedDate", "subrogationStartDate", "subrogationEndDate", "workAccidentDate", "returnDate"]) {
    const value = formData.get(field);
    if (value && !parseDate(value)) return { error: "Une date de l'arrêt est invalide. Utilisez une date du calendrier." } as const;
  }

  if (!employeeId) return { error: "Le salarié est obligatoire." } as const;
  if (!ABSENCE_TYPES.includes(type as AbsenceTypeValue)) return { error: "Le type d'absence est invalide." } as const;
  const normalizedType = type as AbsenceTypeValue;
  if (!startDate || !endDate) return { error: "Les dates de début et de fin sont obligatoires." } as const;
  if (endDate < startDate) return { error: "La date de fin doit être après la date de début." } as const;

  const isWorkStoppage = WORK_STOPPAGE_TYPES.has(normalizedType);
  if (isWorkStoppage && !lastWorkedDate) return { error: "Le dernier jour travaillé est obligatoire pour un arrêt de travail." } as const;
  if (lastWorkedDate && lastWorkedDate > startDate) return { error: "Le dernier jour travaillé ne peut pas être postérieur au début de l'arrêt." } as const;
  if ((subrogationStartDate && !subrogationEndDate) || (!subrogationStartDate && subrogationEndDate)) return { error: "Renseignez les deux dates de subrogation, ou aucune." } as const;
  if (subrogationStartDate && subrogationEndDate && subrogationEndDate < subrogationStartDate) return { error: "La fin de subrogation doit être postérieure ou égale à son début." } as const;
  if (normalizedType === "WORK_ACCIDENT" && !workAccidentDate) return { error: "La date de l'accident est obligatoire pour un accident du travail." } as const;
  if (workAccidentDate && normalizedType !== "WORK_ACCIDENT") return { error: "La date de l'accident n'est utilisable que pour un accident du travail." } as const;
  if ((returnDate && !returnReasonCode) || (!returnDate && returnReasonCode)) return { error: "Renseignez ensemble la date et le motif de reprise." } as const;
  if (returnReasonCode && !["01", "02", "03"].includes(returnReasonCode)) return { error: "Le motif de reprise est invalide." } as const;
  if (returnDate && returnDate <= startDate) return { error: "La date de reprise doit être postérieure au début de l'arrêt." } as const;
  if (workAccidentDate && workAccidentDate > startDate) return { error: "La date de l'accident ne peut pas être postérieure au début de l'arrêt." } as const;

  return {
    employeeId,
    type: normalizedType,
    startDate,
    endDate,
    justificationRequired,
    notes: notes || null,
    lastWorkedDate: isWorkStoppage ? lastWorkedDate : null,
    subrogationStartDate: isWorkStoppage ? subrogationStartDate : null,
    subrogationEndDate: isWorkStoppage ? subrogationEndDate : null,
    workAccidentDate: normalizedType === "WORK_ACCIDENT" ? workAccidentDate : null,
    returnDate: isWorkStoppage ? returnDate : null,
    returnReasonCode: isWorkStoppage ? returnReasonCode : null,
  } as const;
}

export async function createAbsence(_prevState: AbsenceActionState, formData: FormData): Promise<AbsenceActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent enregistrer une absence." };

  const parsed = parseAbsenceForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const employee = await prisma.employee.findFirst({
    where: { id: parsed.employeeId, organizationId: membership.organizationId, deletedAt: null },
    select: { id: true, hireDate: true },
  });
  if (!employee) return { error: "Salarié introuvable." };
  if ((parsed.lastWorkedDate && parsed.lastWorkedDate < employee.hireDate) || (parsed.workAccidentDate && parsed.workAccidentDate < employee.hireDate)) return { error: "Le dernier jour travaillé et la date de l'accident ne peuvent pas précéder l'embauche." };

  const overlap = await findOverlap({
    organizationId: membership.organizationId,
    employeeId: employee.id,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
  });
  if (overlap) return { error: "Une autre absence existe déjà pour ce salarié sur tout ou partie de cette période." };

  const absenceId = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.absence.create({
      data: {
        id: absenceId,
        organizationId: membership.organizationId,
        employeeId: employee.id,
        type: parsed.type,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        status: parsed.justificationRequired ? "TO_PROVIDE_JUSTIFICATION" : "TO_VALIDATE",
        justificationRequired: parsed.justificationRequired,
        payrollImpactStatus: "PENDING",
        lastWorkedDate: parsed.lastWorkedDate,
        subrogationStartDate: parsed.subrogationStartDate,
        subrogationEndDate: parsed.subrogationEndDate,
        workAccidentDate: parsed.workAccidentDate,
        returnDate: parsed.returnDate,
        returnReasonCode: parsed.returnReasonCode,
        notes: parsed.notes,
      },
    });
    if (parsed.justificationRequired) {
      await tx.absenceJustification.create({ data: { id: randomUUID(), absenceId, status: "TO_PROVIDE" } });
    }
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "absence.created",
        entityType: "Absence",
        entityId: absenceId,
        metadata: { employeeId: employee.id, type: parsed.type, justificationRequired: parsed.justificationRequired },
      },
    });
  });

  revalidateAbsenceViews();
  return { success: "Absence enregistrée." };
}

export async function updateAbsence(absenceId: string, formData: FormData): Promise<AbsenceActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent modifier une absence." };

  const parsed = parseAbsenceForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const absence = await prisma.absence.findFirst({
    where: { id: absenceId, organizationId: membership.organizationId },
    include: { justifications: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!absence) return { error: "Absence introuvable." };
  if (absence.payrollImpactStatus === "INTEGRATED") {
    return { error: "Cette absence a déjà été intégrée à la paie. Elle ne peut plus être modifiée depuis le module Absences." };
  }

  const employee = await prisma.employee.findFirst({
    where: { id: parsed.employeeId, organizationId: membership.organizationId, deletedAt: null },
    select: { id: true, hireDate: true },
  });
  if (!employee) return { error: "Salarié introuvable." };
  if ((parsed.lastWorkedDate && parsed.lastWorkedDate < employee.hireDate) || (parsed.workAccidentDate && parsed.workAccidentDate < employee.hireDate)) return { error: "Le dernier jour travaillé et la date de l'accident ne peuvent pas précéder l'embauche." };

  const overlap = await findOverlap({
    organizationId: membership.organizationId,
    employeeId: employee.id,
    startDate: parsed.startDate,
    endDate: parsed.endDate,
    excludeAbsenceId: absence.id,
  });
  if (overlap) return { error: "Une autre absence existe déjà pour ce salarié sur tout ou partie de cette période." };

  const latestJustification = absence.justifications[0];
  let nextStatus: "TO_VALIDATE" | "TO_PROVIDE_JUSTIFICATION" | "TO_REVIEW_JUSTIFICATION" = "TO_VALIDATE";
  if (parsed.justificationRequired) {
    if (
      !latestJustification ||
      !latestJustification.storageKey ||
      latestJustification.status === "REJECTED"
    ) {
      nextStatus = "TO_PROVIDE_JUSTIFICATION";
    } else if (latestJustification.status !== "VALIDATED") {
      nextStatus = "TO_REVIEW_JUSTIFICATION";
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.absence.update({
      where: { id: absence.id },
      data: {
        employeeId: employee.id,
        type: parsed.type,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        justificationRequired: parsed.justificationRequired,
        notes: parsed.notes,
        status: nextStatus,
        payrollImpactStatus: "PENDING",
        lastWorkedDate: parsed.lastWorkedDate,
        subrogationStartDate: parsed.subrogationStartDate,
        subrogationEndDate: parsed.subrogationEndDate,
        workAccidentDate: parsed.workAccidentDate,
        returnDate: parsed.returnDate,
        returnReasonCode: parsed.returnReasonCode,
        validatedByUserId: null,
        validatedAt: null,
        rejectedReason: null,
      },
    });

    if (parsed.justificationRequired && !latestJustification) {
      await tx.absenceJustification.create({ data: { id: randomUUID(), absenceId: absence.id, status: "TO_PROVIDE" } });
    }

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "absence.updated",
        entityType: "Absence",
        entityId: absence.id,
        metadata: {
          employeeId: employee.id,
          type: parsed.type,
          startDate: parsed.startDate.toISOString(),
          endDate: parsed.endDate.toISOString(),
          justificationRequired: parsed.justificationRequired,
        },
      },
    });
  });

  revalidateAbsenceViews();
  return { success: "Absence modifiée. Une nouvelle validation est nécessaire avant transmission à la paie." };
}

export async function deleteAbsence(absenceId: string): Promise<AbsenceActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent supprimer une absence." };

  const absence = await prisma.absence.findFirst({
    where: { id: absenceId, organizationId: membership.organizationId },
    select: { id: true, employeeId: true, type: true, startDate: true, endDate: true, payrollImpactStatus: true },
  });
  if (!absence) return { error: "Absence introuvable." };
  if (absence.payrollImpactStatus === "INTEGRATED") {
    return { error: "Cette absence a déjà été intégrée à la paie. Elle doit être corrigée dans le processus de paie et ne peut pas être supprimée ici." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "absence.deleted",
        entityType: "Absence",
        entityId: absence.id,
        metadata: {
          employeeId: absence.employeeId,
          type: absence.type,
          startDate: absence.startDate.toISOString(),
          endDate: absence.endDate.toISOString(),
        },
      },
    });
    await tx.absence.delete({ where: { id: absence.id } });
  });

  revalidateAbsenceViews();
  return { success: "Absence supprimée." };
}

export async function uploadAbsenceJustification(formData: FormData): Promise<AbsenceActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent déposer un justificatif." };
  const absenceId = String(formData.get("absenceId") ?? "").trim();
  const file = formData.get("file");
  if (!absenceId) return { error: "Absence introuvable." };
  if (!(file instanceof File)) return { error: "Sélectionnez un fichier." };

  const absence = await prisma.absence.findFirst({
    where: { id: absenceId, organizationId: membership.organizationId },
    include: { justifications: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!absence) return { error: "Absence introuvable." };
  if (!absence.justificationRequired) return { error: "Aucun justificatif n'est demandé pour cette absence." };
  if (absence.payrollImpactStatus === "INTEGRATED") return { error: "Cette absence est déjà intégrée à la paie." };

  try {
    const stored = storeAbsenceJustification(Buffer.from(await file.arrayBuffer()), file.type);
    await prisma.$transaction(async (tx) => {
      const justification = absence.justifications[0];
      if (justification) {
        await tx.absenceJustification.update({
          where: { id: justification.id },
          data: {
            status: "RECEIVED",
            storageKey: stored.storageKey,
            fileName: file.name.slice(0, 255),
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            uploadedByUserId: user.id,
            reviewedByUserId: null,
            reviewedAt: null,
            rejectionReason: null,
          },
        });
      } else {
        await tx.absenceJustification.create({
          data: {
            id: randomUUID(),
            absenceId: absence.id,
            status: "RECEIVED",
            storageKey: stored.storageKey,
            fileName: file.name.slice(0, 255),
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            uploadedByUserId: user.id,
          },
        });
      }
      await tx.absence.update({ where: { id: absence.id }, data: { status: "TO_REVIEW_JUSTIFICATION", payrollImpactStatus: "PENDING" } });
      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          organizationId: membership.organizationId,
          actorUserId: user.id,
          action: "absence.justification.received",
          entityType: "Absence",
          entityId: absence.id,
          metadata: { fileName: file.name, mimeType: stored.mimeType, sizeBytes: stored.sizeBytes },
        },
      });
    });
  } catch (error) {
    return { error: userFacingError(error, "Le justificatif n'a pas pu être enregistré.") };
  }
  revalidateAbsenceViews();
  return { success: "Justificatif reçu. Il doit maintenant être vérifié." };
}

export async function validateAbsenceJustification(justificationId: string): Promise<AbsenceActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent vérifier un justificatif." };
  const justification = await prisma.absenceJustification.findFirst({
    where: { id: justificationId, absence: { organizationId: membership.organizationId } },
    include: { absence: true },
  });
  if (!justification) return { error: "Justificatif introuvable." };
  if (!justification.storageKey) return { error: "Aucun document n'est disponible." };
  if (justification.absence.payrollImpactStatus === "INTEGRATED") return { error: "Cette absence est déjà intégrée à la paie." };
  if (justification.status === "VALIDATED") return undefined;

  await prisma.$transaction(async (tx) => {
    await tx.absenceJustification.update({
      where: { id: justification.id },
      data: { status: "VALIDATED", reviewedByUserId: user.id, reviewedAt: new Date(), rejectionReason: null },
    });
    await tx.absence.update({ where: { id: justification.absenceId }, data: { status: "TO_VALIDATE" } });
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "absence.justification.validated",
        entityType: "AbsenceJustification",
        entityId: justification.id,
        metadata: { absenceId: justification.absenceId },
      },
    });
  });
  revalidateAbsenceViews();
  return { success: "Justificatif vérifié." };
}

export async function rejectAbsenceJustification(justificationId: string, reason: string): Promise<AbsenceActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent refuser un justificatif." };
  const cleanReason = reason.trim();
  if (!cleanReason) return { error: "Un motif est obligatoire pour refuser le justificatif." };
  const justification = await prisma.absenceJustification.findFirst({
    where: { id: justificationId, absence: { organizationId: membership.organizationId } },
    include: { absence: { select: { payrollImpactStatus: true } } },
  });
  if (!justification) return { error: "Justificatif introuvable." };
  if (justification.absence.payrollImpactStatus === "INTEGRATED") return { error: "Cette absence est déjà intégrée à la paie." };

  await prisma.$transaction(async (tx) => {
    await tx.absenceJustification.update({
      where: { id: justification.id },
      data: { status: "REJECTED", reviewedByUserId: user.id, reviewedAt: new Date(), rejectionReason: cleanReason },
    });
    await tx.absence.update({ where: { id: justification.absenceId }, data: { status: "TO_PROVIDE_JUSTIFICATION", payrollImpactStatus: "PENDING" } });
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "absence.justification.rejected",
        entityType: "AbsenceJustification",
        entityId: justification.id,
        metadata: { absenceId: justification.absenceId, reason: cleanReason },
      },
    });
  });
  revalidateAbsenceViews();
  return { success: "Justificatif refusé." };
}

export async function validateAbsence(absenceId: string): Promise<AbsenceActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent valider une absence." };
  let invalidatedPeriods = 0;
  try {
    await prisma.$transaction(async (tx) => {
      await lockPayrollAbsenceChanges(tx, membership.organizationId);
      await tx.$queryRaw`SELECT "id" FROM "absences" WHERE "id" = ${absenceId} AND "organizationId" = ${membership.organizationId} FOR UPDATE`;
      const absence = await tx.absence.findFirst({ where: { id: absenceId, organizationId: membership.organizationId }, include: { justifications: { orderBy: { createdAt: "desc" }, take: 1 } } });
      if (!absence) throw new Error("Absence introuvable.");
      if (absence.status === "VALIDATED" && ["READY", "INTEGRATED"].includes(absence.payrollImpactStatus)) return;
      if (absence.payrollImpactStatus === "INTEGRATED") throw new Error("Cette absence est déjà intégrée à la paie.");
      if (absence.justificationRequired && absence.justifications[0]?.status !== "VALIDATED") throw new Error("Le justificatif doit être vérifié avant de valider cette absence.");
      await assertAbsenceStartsAfterClosedPayroll(tx, membership.organizationId, absence.employeeId, absence.startDate);
      await tx.absence.update({ where: { id: absence.id }, data: { status: "VALIDATED", payrollImpactStatus: "READY", validatedByUserId: user.id, validatedAt: new Date(), rejectedReason: null } });
      invalidatedPeriods = (await invalidateOpenPayrollFrom(tx, membership.organizationId, absence.employeeId, absence.startDate)).count;
      await tx.auditLog.create({ data: { id: randomUUID(), organizationId: membership.organizationId, actorUserId: user.id, action: "absence.validated", entityType: "Absence", entityId: absence.id,
        metadata: { payrollImpactStatus: "READY", invalidatedPeriods } } });
    }, { maxWait: 10000, timeout: 20000 });
  } catch (error) { return { error: userFacingError(error, "La validation de l'absence a échoué.") }; }
  revalidateAbsenceViews();
  return { success: invalidatedPeriods > 0 ? "Absence validée. Recalculez les périodes ouvertes concernées avant validation de la paie." : "Absence validée et prête pour le traitement paie." };
}

export async function rejectAbsence(absenceId: string, reason: string): Promise<AbsenceActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent refuser une absence." };
  const cleanReason = reason.trim();
  if (!cleanReason) return { error: "Un motif est obligatoire pour refuser l'absence." };
  const absence = await prisma.absence.findFirst({
    where: { id: absenceId, organizationId: membership.organizationId },
    select: { id: true, payrollImpactStatus: true },
  });
  if (!absence) return { error: "Absence introuvable." };
  if (absence.payrollImpactStatus === "INTEGRATED") return { error: "Cette absence est déjà intégrée à la paie." };

  await prisma.$transaction(async (tx) => {
    await tx.absence.update({
      where: { id: absence.id },
      data: { status: "REJECTED", payrollImpactStatus: "PENDING", validatedByUserId: user.id, validatedAt: new Date(), rejectedReason: cleanReason },
    });
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "absence.rejected",
        entityType: "Absence",
        entityId: absence.id,
        metadata: { reason: cleanReason, payrollImpactStatus: "PENDING" },
      },
    });
  });
  revalidateAbsenceViews();
  return { success: "Absence refusée." };
}
