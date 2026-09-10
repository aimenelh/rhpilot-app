"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type PayrollPayslipPreparationFormState = { error: string } | undefined;

export async function preparePayrollPayslipsAction(
  _prevState: PayrollPayslipPreparationFormState,
  formData: FormData,
): Promise<PayrollPayslipPreparationFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) {
    return { error: "Seuls les administrateurs peuvent préparer les bulletins de paie." };
  }

  const periodId = String(formData.get("periodId") ?? "").trim();
  if (!periodId) return { error: "La période de paie est obligatoire." };

  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, organizationId: membership.organizationId },
    select: { id: true, year: true, month: true, status: true },
  });
  if (!period) return { error: "Période de paie introuvable." };
  if (period.status !== "LOCKED") {
    return { error: "Les bulletins ne peuvent être préparés qu'après verrouillage de la période." };
  }

  const employees = await prisma.employee.findMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (employees.length === 0) return { error: "Aucun salarié actif n'est disponible pour cette période." };

  const calculations = await prisma.payrollCalculation.findMany({
    where: { organizationId: membership.organizationId, payrollPeriodId: period.id },
    select: { id: true, employeeId: true, calculationSnapshot: true },
  });
  if (calculations.length !== employees.length) {
    return {
      error: `Préparation impossible : ${calculations.length}/${employees.length} calcul${employees.length > 1 ? "s" : ""} disponible${employees.length > 1 ? "s" : ""}.`,
    };
  }
  if (calculations.some((calculation) => calculation.calculationSnapshot === null)) {
    return { error: "Préparation impossible : un calcul verrouillé ne possède pas de snapshot." };
  }

  const employeeIds = new Set(employees.map((employee) => employee.id));
  if (calculations.some((calculation) => !employeeIds.has(calculation.employeeId))) {
    return { error: "Préparation impossible : un calcul référence un salarié hors périmètre." };
  }

  const existingPayslips = await prisma.payslip.findMany({
    where: {
      organizationId: membership.organizationId,
      payrollPeriodId: period.id,
    },
    select: { id: true, calculationId: true, documentStatus: true },
  });
  const immutablePayslip = existingPayslips.find(
    (payslip) => payslip.documentStatus === "GENERATED" || payslip.documentStatus === "PUBLISHED",
  );
  if (immutablePayslip) {
    return { error: "Préparation impossible : un bulletin a déjà été généré ou publié pour cette période." };
  }

  const preparedAt = new Date();
  await prisma.$transaction(async (tx) => {
    for (const calculation of calculations) {
      const existing = existingPayslips.find((payslip) => payslip.calculationId === calculation.id);
      if (existing) {
        await tx.payslip.update({
          where: { id: existing.id },
          data: { documentStatus: "PREPARED" },
        });
      } else {
        await tx.payslip.create({
          data: {
            id: randomUUID(),
            organizationId: membership.organizationId,
            payrollPeriodId: period.id,
            employeeId: calculation.employeeId,
            calculationId: calculation.id,
            documentStatus: "PREPARED",
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "payroll.payslips.prepared",
        entityType: "PayrollPeriod",
        entityId: period.id,
        metadata: {
          year: period.year,
          month: period.month,
          employeeCount: employees.length,
          calculationCount: calculations.length,
          preparedAt: preparedAt.toISOString(),
        },
      },
    });
  });

  revalidatePath(`/dashboard/payroll/${periodId}/payslips`);
  revalidatePath(`/dashboard/payroll/${periodId}`);
  revalidatePath("/dashboard/payroll");
  return undefined;
}
