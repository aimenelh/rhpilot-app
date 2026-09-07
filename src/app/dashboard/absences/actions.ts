"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { storeAbsenceJustification } from "@/lib/absence-justification-storage";

const ABSENCE_TYPES = [
  "PAID_LEAVE",
  "RTT",
  "SICK_LEAVE",
  "WORK_ACCIDENT",
  "UNPAID_LEAVE",
  "FAMILY_EVENT",
  "OTHER",
] as const;

type ActionState = { error?: string; success?: string } | undefined;

function parseDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isAdmin(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

export async function createAbsence(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent enregistrer une absence." };

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const startDate = parseDate(formData.get("startDate"));
  const endDate = parseDate(formData.get("endDate"));
  const justificationRequired = formData.get("justificationRequired") === "on";
  const notes = String(formData.get("notes") ?? "").trim();

  if (!employeeId) return { error: "Le salarié est obligatoire." };
  if (!ABSENCE_TYPES.includes(type as (typeof ABSENCE_TYPES)[number])) return { error: "Le type d'absence est invalide." };
  if (!startDate || !endDate) return { error: "Les dates de début et de fin sont obligatoires." };
  if (endDate < startDate) return { error: "La date de fin doit être après la date de début." };

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: membership.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!employee) return { error: "Salarié introuvable." };

  const absenceId = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.absence.create({
      data: {
        id: absenceId,
        organizationId: membership.organizationId,
        employeeId: employee.id,
        type: type as (typeof ABSENCE_TYPES)[number],
        startDate,
        endDate,
        status: justificationRequired ? "TO_PROVIDE_JUSTIFICATION" : "TO_VALIDATE",
        justificationRequired,
        payrollImpactStatus: "PENDING",
        notes: notes || null,
      },
    });

    if (justificationRequired) {
      await tx.absenceJustification.create({
        data: {
          id: randomUUID(),
          absenceId,
          status: "TO_PROVIDE",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "absence.created",
        entityType: "Absence",
        entityId: absenceId,
        metadata: { employeeId, type, justificationRequired },
      },
    });
  });

  revalidatePath("/dashboard/absences");
  return { success: "Absence enregistrée." };
}

export async function uploadAbsenceJustification(formData: FormData): Promise<ActionState> {
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

      await tx.absence.update({
        where: { id: absence.id },
        data: { status: "TO_REVIEW_JUSTIFICATION" },
      });

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
    return { error: error instanceof Error ? error.message : "Le justificatif n'a pas pu être enregistré." };
  }

  revalidatePath("/dashboard/absences");
  return { success: "Justificatif reçu. Il doit maintenant être vérifié." };
}

export async function validateAbsenceJustification(justificationId: string): Promise<ActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent vérifier un justificatif." };

  const justification = await prisma.absenceJustification.findFirst({
    where: {
      id: justificationId,
      absence: { organizationId: membership.organizationId },
    },
    include: { absence: true },
  });
  if (!justification) return { error: "Justificatif introuvable." };
  if (!justification.storageKey) return { error: "Aucun document n'est disponible." };
  if (justification.status === "VALIDATED") return undefined;

  await prisma.$transaction(async (tx) => {
    await tx.absenceJustification.update({
      where: { id: justification.id },
      data: { status: "VALIDATED", reviewedByUserId: user.id, reviewedAt: new Date(), rejectionReason: null },
    });
    await tx.absence.update({
      where: { id: justification.absenceId },
      data: { status: "TO_VALIDATE" },
    });
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

  revalidatePath("/dashboard/absences");
  return { success: "Justificatif vérifié." };
}

export async function rejectAbsenceJustification(justificationId: string, reason: string): Promise<ActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent refuser un justificatif." };

  const cleanReason = reason.trim();
  if (!cleanReason) return { error: "Un motif est obligatoire pour refuser le justificatif." };

  const justification = await prisma.absenceJustification.findFirst({
    where: { id: justificationId, absence: { organizationId: membership.organizationId } },
    select: { id: true, absenceId: true },
  });
  if (!justification) return { error: "Justificatif introuvable." };

  await prisma.$transaction(async (tx) => {
    await tx.absenceJustification.update({
      where: { id: justification.id },
      data: { status: "REJECTED", reviewedByUserId: user.id, reviewedAt: new Date(), rejectionReason: cleanReason },
    });
    await tx.absence.update({
      where: { id: justification.absenceId },
      data: { status: "TO_PROVIDE_JUSTIFICATION" },
    });
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

  revalidatePath("/dashboard/absences");
  return { success: "Justificatif refusé." };
}

export async function validateAbsence(absenceId: string): Promise<ActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent valider une absence." };

  const absence = await prisma.absence.findFirst({
    where: { id: absenceId, organizationId: membership.organizationId },
    include: { justifications: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!absence) return { error: "Absence introuvable." };
  if (absence.justificationRequired) {
    const justification = absence.justifications[0];
    if (!justification || justification.status !== "VALIDATED") {
      return { error: "Le justificatif doit être vérifié avant de valider cette absence." };
    }
  }
  if (absence.status === "VALIDATED") return undefined;

  await prisma.$transaction(async (tx) => {
    await tx.absence.update({
      where: { id: absence.id },
      data: { status: "VALIDATED", validatedByUserId: user.id, validatedAt: new Date(), rejectedReason: null },
    });
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "absence.validated",
        entityType: "Absence",
        entityId: absence.id,
        metadata: {},
      },
    });
  });

  revalidatePath("/dashboard/absences");
  revalidatePath("/dashboard/payroll");
  return { success: "Absence validée." };
}

export async function rejectAbsence(absenceId: string, reason: string): Promise<ActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent refuser une absence." };

  const cleanReason = reason.trim();
  if (!cleanReason) return { error: "Un motif est obligatoire pour refuser l'absence." };

  const absence = await prisma.absence.findFirst({
    where: { id: absenceId, organizationId: membership.organizationId },
    select: { id: true },
  });
  if (!absence) return { error: "Absence introuvable." };

  await prisma.$transaction(async (tx) => {
    await tx.absence.update({
      where: { id: absence.id },
      data: { status: "REJECTED", validatedByUserId: user.id, validatedAt: new Date(), rejectedReason: cleanReason },
    });
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "absence.rejected",
        entityType: "Absence",
        entityId: absence.id,
        metadata: { reason: cleanReason },
      },
    });
  });

  revalidatePath("/dashboard/absences");
  revalidatePath("/dashboard/payroll");
  return { success: "Absence refusée." };
}
