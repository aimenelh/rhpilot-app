"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { CseTrackingStatus } from "@/lib/compliance/obligations";
import { parseIsoDateOnly } from "@/lib/dateOnly";
import { isParisDayAfter } from "@/lib/parisDate";

export type ComplianceActionState = { success?: string; error?: string };

const CSE_STATUSES: CseTrackingStatus[] = ["UNKNOWN", "IN_PLACE", "NOT_IN_PLACE"];

function isAdmin(role: string) {
  return role === "OWNER" || role === "ADMIN";
}

function parseDateOnly(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const trimmed = value.trim();
  const date = parseIsoDateOnly(trimmed);
  if (!date) return undefined;
  return { raw: trimmed, date };
}

function isFuture(value: { raw: string; date: Date } | null | undefined) {
  if (!value) return false;
  return isParisDayAfter(value.date);
}

function revalidateComplianceViews() {
  revalidatePath("/dashboard/obligations");
  revalidatePath("/dashboard");
}

export async function saveComplianceTracking(formData: FormData): Promise<ComplianceActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!isAdmin(membership.accessRole)) return { error: "Seuls les administrateurs peuvent modifier le suivi des obligations." };

  const ruleKey = String(formData.get("ruleKey") ?? "");

  if (ruleKey === "FR.CAREER_INTERVIEW") {
    const employeeId = String(formData.get("employeeId") ?? "").trim();
    if (!employeeId) return { error: "Le salarié est introuvable." };

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId: membership.organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!employee) return { error: "Le salarié est introuvable." };

    const lastCareerInterviewAt = parseDateOnly(formData.get("lastCareerInterviewAt"));
    if (lastCareerInterviewAt === undefined) return { error: "La date du dernier entretien est invalide." };
    if (isFuture(lastCareerInterviewAt)) return { error: "La date du dernier entretien ne peut pas être dans le futur." };

    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "compliance.tracking.updated",
        entityType: "Employee",
        entityId: employee.id,
        metadata: {
          ruleKey,
          data: { lastCareerInterviewAt: lastCareerInterviewAt?.raw ?? null },
        },
      },
    });

    revalidateComplianceViews();
    return { success: "Suivi de l'entretien mis à jour." };
  }

  if (ruleKey === "FR.DUERP.UPDATE") {
    const duerpLastUpdatedAt = parseDateOnly(formData.get("duerpLastUpdatedAt"));
    if (duerpLastUpdatedAt === undefined) return { error: "La date de mise à jour du DUERP est invalide." };
    if (isFuture(duerpLastUpdatedAt)) return { error: "La date de mise à jour du DUERP ne peut pas être dans le futur." };

    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "compliance.tracking.updated",
        entityType: "Organization",
        entityId: membership.organizationId,
        metadata: {
          ruleKey,
          data: { duerpLastUpdatedAt: duerpLastUpdatedAt?.raw ?? null },
        },
      },
    });

    revalidateComplianceViews();
    return { success: "Suivi du DUERP mis à jour." };
  }

  if (ruleKey === "FR.CSE.ELECTION") {
    const cseThresholdReachedAt = parseDateOnly(formData.get("cseThresholdReachedAt"));
    const cseLastElectionAt = parseDateOnly(formData.get("cseLastElectionAt"));
    const cseStatus = String(formData.get("cseStatus") ?? "UNKNOWN") as CseTrackingStatus;

    if (cseThresholdReachedAt === undefined) return { error: "La date de franchissement du seuil est invalide." };
    if (cseLastElectionAt === undefined) return { error: "La date de la dernière élection est invalide." };
    if (isFuture(cseThresholdReachedAt)) return { error: "La date de franchissement du seuil ne peut pas être dans le futur." };
    if (isFuture(cseLastElectionAt)) return { error: "La date de la dernière élection ne peut pas être dans le futur." };
    if (!CSE_STATUSES.includes(cseStatus)) return { error: "La situation du CSE est invalide." };

    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "compliance.tracking.updated",
        entityType: "Organization",
        entityId: membership.organizationId,
        metadata: {
          ruleKey,
          data: {
            cseThresholdReachedAt: cseThresholdReachedAt?.raw ?? null,
            cseStatus,
            cseLastElectionAt: cseLastElectionAt?.raw ?? null,
          },
        },
      },
    });

    revalidateComplianceViews();
    return { success: "Suivi du CSE mis à jour." };
  }

  return { error: "Cette obligation n'est pas modifiable depuis cet écran." };
}
