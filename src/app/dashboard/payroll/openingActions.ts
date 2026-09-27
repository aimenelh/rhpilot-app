"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PayrollOpeningFormState = { error?: string; saved?: boolean } | undefined;

function readNumber(formData: FormData, name: string, options: { required?: boolean; min?: number } = {}): number | null {
  const raw = String(formData.get(name) ?? "").trim().replace(",", ".");
  if (raw === "") {
    if (options.required) throw new Error("Un champ obligatoire de la reprise est vide.");
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < (options.min ?? 0)) throw new Error(`La valeur « ${raw} » est invalide.`);
  return Math.round(value * 100) / 100;
}

async function authorize(employeeId: string) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Session expirée, veuillez recharger la page.");
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) throw new Error("Seuls les administrateurs peuvent saisir une reprise de paie.");
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, organizationId: membership.organizationId, deletedAt: null }, select: { id: true } });
  if (!employee) throw new Error("Salarié introuvable dans cette organisation.");
  return { membership, user, employee };
}

/** Reprise des compteurs de congés payés au début d'un mois. */
export async function savePaidLeaveOpening(employeeId: string, _prev: PayrollOpeningFormState, formData: FormData): Promise<PayrollOpeningFormState> {
  try {
    const { membership, user, employee } = await authorize(employeeId);
    // Le formulaire demande le mois du dernier bulletin dont on recopie les compteurs ; ils s'appliquent au mois suivant.
    const month = String(formData.get("closingMonth") ?? "").trim();
    if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Indiquez le mois du bulletin dont vous recopiez les compteurs." };
    const [closingYear, closingMonth] = month.split("-").map(Number);
    const asOf = new Date(Date.UTC(closingYear, closingMonth, 1));
    const values = {
      previousAcquired: readNumber(formData, "previousAcquired", { required: true })!,
      previousTaken: readNumber(formData, "previousTaken", { required: true })!,
      currentAcquired: readNumber(formData, "currentAcquired", { required: true })!,
      currentTaken: readNumber(formData, "currentTaken", { required: true })!,
      referenceGross: readNumber(formData, "referenceGross"),
      referenceAcquiredDays: readNumber(formData, "referenceAcquiredDays"),
      currentReferenceGross: readNumber(formData, "currentReferenceGross"),
    };
    if (values.previousAcquired > 60 || values.currentAcquired > 60) return { error: "Un solde de congés dépasse 60 jours : vérifiez la saisie." };
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`DELETE FROM "employee_paid_leave_openings" WHERE "organizationId" = ${membership.organizationId} AND "employeeId" = ${employee.id} AND "asOf" = ${asOf}`;
      await tx.$executeRaw`
        INSERT INTO "employee_paid_leave_openings" ("id", "organizationId", "employeeId", "asOf", "previousAcquired", "previousTaken", "currentAcquired", "currentTaken", "referenceGross", "referenceAcquiredDays", "currentReferenceGross", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${membership.organizationId}, ${employee.id}, ${asOf}, ${values.previousAcquired}, ${values.previousTaken}, ${values.currentAcquired}, ${values.currentTaken}, ${values.referenceGross}, ${values.referenceAcquiredDays}, ${values.currentReferenceGross}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      await tx.auditLog.create({ data: { id: randomUUID(), organizationId: membership.organizationId, actorUserId: user.id, action: "payroll.opening.paid_leave.saved", entityType: "Employee", entityId: employee.id, metadata: { closingMonth: month, ...values } } });
    });
    revalidatePath(`/dashboard/employees/${employee.id}`);
    return { saved: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "La reprise n'a pas pu être enregistrée." };
  }
}

/** Reprise des cumuls de l'année arrêtés à la fin d'un mois (bulletins établis hors de RH Pilot). */
export async function savePayrollOpening(employeeId: string, _prev: PayrollOpeningFormState, formData: FormData): Promise<PayrollOpeningFormState> {
  try {
    const { membership, user, employee } = await authorize(employeeId);
    const year = Number(formData.get("year"));
    const throughMonth = Number(formData.get("throughMonth"));
    if (!Number.isInteger(year) || year < 2026 || year > 2100) return { error: "L'année de reprise doit être 2026 ou postérieure." };
    if (!Number.isInteger(throughMonth) || throughMonth < 1 || throughMonth > 11) return { error: "Le mois d'arrêté des cumuls doit être compris entre janvier et novembre." };
    const gross = readNumber(formData, "grossSubject", { required: true })!;
    const ceiling = readNumber(formData, "ceiling", { required: true })!;
    const baseT1 = readNumber(formData, "baseT1") ?? Math.min(gross, ceiling);
    const baseT2 = readNumber(formData, "baseT2") ?? Math.min(Math.max(gross - ceiling, 0), 7 * ceiling);
    if (baseT1 > gross + 0.01 || baseT1 > ceiling + 0.01) return { error: "La base tranche 1 ne peut dépasser ni le brut ni le plafond cumulés." };
    const cumuls = {
      grossSubject: gross,
      grossTotal: readNumber(formData, "grossTotal") ?? gross,
      ceiling,
      baseT1,
      baseT2,
      baseFourCeilings: Math.min(gross, 4 * ceiling),
      baseCet: gross > ceiling ? Math.min(gross, 8 * ceiling) : 0,
      csgGross: gross,
      csgWithinFourCeilings: Math.min(gross, 4 * ceiling),
      rgduSmic: readNumber(formData, "rgduSmic") ?? 0,
      rgduRemuneration: readNumber(formData, "rgduRemuneration") ?? 0,
      rgduAmount: readNumber(formData, "rgduAmount") ?? 0,
      overtimeTaxExemptGross: readNumber(formData, "overtimeTaxExemptGross") ?? 0,
      netTaxable: readNumber(formData, "netTaxable") ?? 0,
      withholdingTax: readNumber(formData, "withholdingTax") ?? 0,
      netPaid: readNumber(formData, "netPaid") ?? 0,
      netSocial: readNumber(formData, "netSocial") ?? 0,
      employeeContributions: readNumber(formData, "employeeContributions") ?? 0,
      employerContributions: readNumber(formData, "employerContributions") ?? 0,
      hoursPaid: readNumber(formData, "hoursPaid") ?? 0,
      employerCost: readNumber(formData, "employerCost") ?? 0,
    };
    if (cumuls.rgduAmount > 0 && (cumuls.rgduSmic <= 0 || cumuls.rgduRemuneration <= 0)) return { error: "Pour reprendre la RGDU, renseignez le Smic cumulé, la rémunération cumulée et la réduction cumulée." };
    const sickPayHistory = { fullRateDaysUsed: readNumber(formData, "sickFullRateDays") ?? 0, reducedRateDaysUsed: readNumber(formData, "sickReducedRateDays") ?? 0 };
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`DELETE FROM "employee_payroll_openings" WHERE "organizationId" = ${membership.organizationId} AND "employeeId" = ${employee.id} AND "year" = ${year}`;
      await tx.$executeRaw`
        INSERT INTO "employee_payroll_openings" ("id", "organizationId", "employeeId", "year", "throughMonth", "cumuls", "sickPayHistory", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, ${membership.organizationId}, ${employee.id}, ${year}, ${throughMonth}, ${JSON.stringify(cumuls)}::jsonb, ${JSON.stringify(sickPayHistory)}::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      await tx.auditLog.create({ data: { id: randomUUID(), organizationId: membership.organizationId, actorUserId: user.id, action: "payroll.opening.cumuls.saved", entityType: "Employee", entityId: employee.id, metadata: { year, throughMonth } } });
    });
    revalidatePath(`/dashboard/employees/${employee.id}`);
    return { saved: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "La reprise n'a pas pu être enregistrée." };
  }
}
