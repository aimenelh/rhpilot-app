"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type TerminationFormState = { error?: string; saved?: boolean } | undefined;

const REASONS = ["DEMISSION", "LICENCIEMENT", "RUPTURE_CONVENTIONNELLE", "FIN_CDD", "FIN_PERIODE_ESSAI", "MISE_A_LA_RETRAITE", "DEPART_RETRAITE", "AUTRE"] as const;

function amount(formData: FormData, name: string): number | null {
  const raw = String(formData.get(name) ?? "").trim().replace(",", ".");
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 10_000_000) throw new Error(`Le montant « ${raw} » est invalide.`);
  return Math.round(value * 100) / 100;
}

async function editableContext(periodId: string, employeeId: string) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Session expirée, veuillez recharger la page.");
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) throw new Error("Seuls les administrateurs peuvent saisir un solde de tout compte.");
  const period = await prisma.payrollPeriod.findFirst({ where: { id: periodId, organizationId: membership.organizationId }, select: { id: true, year: true, month: true, status: true } });
  if (!period) throw new Error("Période de paie introuvable.");
  if (period.status !== "DRAFT") throw new Error("La fiche de sortie ne peut être modifiée que sur une période en préparation.");
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, organizationId: membership.organizationId, deletedAt: null }, select: { id: true, contractEndDate: true, contractType: true } });
  if (!employee) throw new Error("Salarié introuvable.");
  const first = new Date(Date.UTC(period.year, period.month - 1, 1));
  const last = new Date(Date.UTC(period.year, period.month, 0, 23, 59, 59));
  if (!employee.contractEndDate || employee.contractEndDate < first || employee.contractEndDate > last) throw new Error("La date de fin de contrat du salarié n'est pas dans cette période : renseignez-la d'abord dans son dossier.");
  return { membership, user, period, employee };
}

export async function saveTermination(periodId: string, employeeId: string, _prev: TerminationFormState, formData: FormData): Promise<TerminationFormState> {
  try {
    const { membership, user, period, employee } = await editableContext(periodId, employeeId);
    const reason = String(formData.get("reason") ?? "");
    if (!(REASONS as readonly string[]).includes(reason)) return { error: "Choisissez le motif de la rupture." };
    const severanceAmount = amount(formData, "severanceAmount");
    const severanceLegalMinimum = amount(formData, "severanceLegalMinimum");
    if ((severanceAmount ?? 0) > 0 && severanceLegalMinimum === null) return { error: "Indiquez l'indemnité légale ou conventionnelle de référence : elle détermine la part exonérée." };
    if (severanceLegalMinimum !== null && severanceAmount !== null && severanceLegalMinimum > severanceAmount + 0.01) return { error: "L'indemnité versée ne peut pas être inférieure au minimum légal ou conventionnel." };
    const cddMode = String(formData.get("cddEndAllowanceMode") ?? "AUTO");
    if (!["AUTO", "NONE", "AMOUNT"].includes(cddMode)) return { error: "Le traitement de l'indemnité de fin de contrat est invalide." };
    const cddAmount = amount(formData, "cddEndAllowanceAmount");
    if (cddMode === "AMOUNT" && cddAmount === null) return { error: "Indiquez le montant de l'indemnité de fin de contrat." };
    const cddRatePercent = amount(formData, "cddEndAllowanceRate");
    if (cddRatePercent !== null && (cddRatePercent < 6 || cddRatePercent > 50)) return { error: "Le taux de l'indemnité de fin de contrat doit être de 10 % (6 % avec un accord d'accès à la formation)." };
    const values = {
      reason,
      noticeCompensation: amount(formData, "noticeCompensation"),
      severanceAmount,
      severanceLegalMinimum,
      previousYearGross: amount(formData, "previousYearGross"),
      eligibleForFullPension: formData.get("eligibleForFullPension") === "on",
      cddEndAllowanceMode: employee.contractType === "CDD" ? cddMode : "NONE",
      cddEndAllowanceAmount: cddMode === "AMOUNT" ? cddAmount : null,
      cddEndAllowanceRate: cddRatePercent === null ? null : cddRatePercent / 100,
      paidLeaveCompensationAmount: amount(formData, "paidLeaveCompensationAmount"),
    };
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`DELETE FROM "payroll_terminations" WHERE "organizationId" = ${membership.organizationId} AND "payrollPeriodId" = ${period.id} AND "employeeId" = ${employee.id}`;
      await tx.$executeRaw`
        INSERT INTO "payroll_terminations" ("id", "organizationId", "payrollPeriodId", "employeeId", "reason", "noticeCompensation", "severanceAmount", "severanceLegalMinimum", "previousYearGross", "eligibleForFullPension", "cddEndAllowanceMode", "cddEndAllowanceAmount", "cddEndAllowanceRate", "paidLeaveCompensationAmount", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${membership.organizationId}, ${period.id}, ${employee.id}, ${values.reason}, ${values.noticeCompensation}, ${values.severanceAmount}, ${values.severanceLegalMinimum}, ${values.previousYearGross}, ${values.eligibleForFullPension}, ${values.cddEndAllowanceMode}, ${values.cddEndAllowanceAmount}, ${values.cddEndAllowanceRate}, ${values.paidLeaveCompensationAmount}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      await tx.auditLog.create({ data: { id: randomUUID(), organizationId: membership.organizationId, actorUserId: user.id, action: "payroll.termination.saved", entityType: "PayrollPeriod", entityId: period.id, metadata: { employeeId: employee.id, ...values } } });
    });
    revalidatePath(`/dashboard/payroll/${period.id}`);
    return { saved: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "La fiche de sortie n'a pas pu être enregistrée." };
  }
}
