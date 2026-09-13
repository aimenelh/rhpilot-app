"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePayrollPayslipsAction, type PayrollPayslipGenerationFormState } from "./generatePayslipsAction";

export type { PayrollPayslipGenerationFormState } from "./generatePayslipsAction";

export async function regeneratePayslipsWithPaymentDateAction(
  prevState: PayrollPayslipGenerationFormState,
  formData: FormData,
): Promise<PayrollPayslipGenerationFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return { error: "Seuls les administrateurs peuvent générer les bulletins de paie." };

  const periodId = String(formData.get("periodId") ?? "").trim();
  const rawDate = String(formData.get("paymentDate") ?? "").trim();
  if (!periodId) return { error: "La période de paie est obligatoire." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return { error: "Renseignez la date de paiement avant de générer les bulletins." };

  const paymentDate = new Date(`${rawDate}T12:00:00.000Z`);
  if (Number.isNaN(paymentDate.getTime())) return { error: "La date de paiement est invalide." };

  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, organizationId: membership.organizationId },
    select: { id: true, status: true, paymentDate: true },
  });
  if (!period) return { error: "Période de paie introuvable." };
  if (period.status !== "LOCKED") return { error: "Les bulletins ne peuvent être générés qu'après verrouillage de la période." };

  const existingPayslips = await prisma.payslip.findMany({
    where: { organizationId: membership.organizationId, payrollPeriodId: period.id },
    select: { id: true, organizationId: true, payrollPeriodId: true, employeeId: true, calculationId: true, documentStatus: true, storageKey: true, generatedAt: true },
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payrollPeriod.update({ where: { id: period.id }, data: { paymentDate } });
      await tx.payslip.deleteMany({ where: { organizationId: membership.organizationId, payrollPeriodId: period.id } });
      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          organizationId: membership.organizationId,
          actorUserId: user.id,
          action: "payroll.payslips.regeneration.requested",
          entityType: "PayrollPeriod",
          entityId: period.id,
          metadata: { previousPaymentDate: period.paymentDate?.toISOString() ?? null, paymentDate: rawDate, previousPayslipCount: existingPayslips.length },
        },
      });
    });

    const result = await generatePayrollPayslipsAction(prevState, formData);
    if (result?.error) {
      await prisma.payslip.createMany({
        data: existingPayslips.map((payslip) => ({
          id: payslip.id,
          organizationId: payslip.organizationId,
          payrollPeriodId: payslip.payrollPeriodId,
          employeeId: payslip.employeeId,
          calculationId: payslip.calculationId,
          documentStatus: payslip.documentStatus,
          storageKey: payslip.storageKey,
          generatedAt: payslip.generatedAt,
        })),
        skipDuplicates: true,
      });
      return result;
    }

    revalidatePath(`/dashboard/payroll/${periodId}`);
    return undefined;
  } catch (error) {
    try {
      await prisma.payslip.createMany({
        data: existingPayslips.map((payslip) => ({
          id: payslip.id,
          organizationId: payslip.organizationId,
          payrollPeriodId: payslip.payrollPeriodId,
          employeeId: payslip.employeeId,
          calculationId: payslip.calculationId,
          documentStatus: payslip.documentStatus,
          storageKey: payslip.storageKey,
          generatedAt: payslip.generatedAt,
        })),
        skipDuplicates: true,
      });
    } catch {
      // Preserve the original generation error; the regeneration action is fail-safe when possible.
    }
    return { error: error instanceof Error ? error.message : "La régénération des bulletins a échoué." };
  }
}
