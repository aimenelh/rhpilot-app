"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePayrollPayslipsAction, type PayrollPayslipGenerationFormState } from "./generatePayslipsAction";

export async function generatePayslipsWithPaymentDateAction(
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

  await prisma.$transaction(async (tx) => {
    await tx.payrollPeriod.update({ where: { id: period.id }, data: { paymentDate } });
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "payroll.period.payment_date.updated",
        entityType: "PayrollPeriod",
        entityId: period.id,
        metadata: { previousPaymentDate: period.paymentDate?.toISOString() ?? null, paymentDate: rawDate },
      },
    });
  });

  revalidatePath(`/dashboard/payroll/${periodId}`);
  return generatePayrollPayslipsAction(prevState, formData);
}
