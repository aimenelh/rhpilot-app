"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
