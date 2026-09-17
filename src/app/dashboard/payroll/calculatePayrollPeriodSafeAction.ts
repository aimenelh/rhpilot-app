"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePayrollPeriod } from "@/lib/payroll/payroll-period-calculation";

export type PayrollCalculationFormState = { error: string } | undefined;

export async function calculatePayrollPeriodSafeAction(
  _prevState: PayrollCalculationFormState,
  formData: FormData,
): Promise<PayrollCalculationFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) {
    return { error: "Seuls les administrateurs peuvent lancer le calcul de paie." };
  }

  const periodId = String(formData.get("periodId") ?? "").trim();
  const ruleCode = String(formData.get("ruleCode") ?? "").trim();
  const ruleScope = String(formData.get("ruleScope") ?? "").trim();
  if (!periodId) return { error: "La période de paie est obligatoire." };
  if (!ruleCode || !ruleScope) return { error: "Une règle de paie validée doit être sélectionnée." };

  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, organizationId: membership.organizationId },
    select: { id: true, status: true },
  });
  if (!period) return { error: "Période de paie introuvable." };
  if (period.status !== "DRAFT") {
    return { error: "Seule une période en préparation peut être calculée ou recalculée." };
  }

  // A payrollCalculation can be referenced by a payslip with a RESTRICT foreign key.
  // Refuse the recalculation explicitly instead of letting a stale-calculation cleanup
  // fail later with an opaque Prisma/PostgreSQL constraint error.
  const existingPayslipCount = await prisma.payslip.count({
    where: {
      organizationId: membership.organizationId,
      payrollPeriodId: period.id,
    },
  });
  if (existingPayslipCount > 0) {
    return {
      error:
        "Recalcul bloqué : des bulletins sont encore rattachés à cette période. Supprimez ou régularisez d’abord ces bulletins afin de préserver l’historique de paie.",
    };
  }

  try {
    const result = await calculatePayrollPeriod({
      periodId,
      organizationId: membership.organizationId,
      ruleCode,
      ruleScope,
      actorUserId: user.id,
    });
    revalidatePath(`/dashboard/payroll/${periodId}`);
    revalidatePath("/dashboard/payroll");
    if (result.employeeCount === 0) {
      return { error: "Aucun salarié actif n'est disponible pour cette période." };
    }
    return undefined;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Le calcul de la période a échoué." };
  }
}
