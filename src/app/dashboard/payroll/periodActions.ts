"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VARIABLE_UNITS = ["EUR", "DAYS", "HOURS", "PERCENT"] as const;

type VariableUnit = (typeof VARIABLE_UNITS)[number];
export type PayrollVariableFormState = { error: string } | undefined;

function parseUnit(value: FormDataEntryValue | null): VariableUnit | null {
  if (typeof value !== "string") return null;
  return VARIABLE_UNITS.includes(value as VariableUnit) ? (value as VariableUnit) : null;
}

function parseNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

async function getEditablePayrollPeriod(periodId: string, organizationId: string) {
  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, organizationId },
    select: { id: true, status: true },
  });

  if (!period) return { error: "Période de paie introuvable." } as const;
  if (period.status !== "DRAFT") {
    return { error: "Les variables ne peuvent être modifiées que sur une période en brouillon." } as const;
  }

  return { period } as const;
}

export async function addPayrollVariable(
  periodId: string,
  _prevState: PayrollVariableFormState,
  formData: FormData,
): Promise<PayrollVariableFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) {
    return { error: "Seuls les administrateurs peuvent modifier les variables de paie." };
  }

  const periodResult = await getEditablePayrollPeriod(periodId, membership.organizationId);
  if ("error" in periodResult) return periodResult;
  const { period } = periodResult;

  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const label = String(formData.get("label") ?? "").trim();
  const amount = parseNumber(formData.get("amount"));
  const unit = parseUnit(formData.get("unit"));

  if (!employeeId) return { error: "Le salarié est obligatoire." };
  if (!code || code.length > 80 || !/^[A-Z0-9][A-Z0-9_.-]*$/.test(code)) {
    return { error: "Le code de variable est invalide." };
  }
  if (!label || label.length > 160) return { error: "Le libellé de variable est invalide." };
  if (amount === null) return { error: "Le montant de la variable est invalide." };
  if (Math.abs(amount) > 100000000) return { error: "La valeur de la variable est trop élevée." };
  if (!unit) return { error: "L'unité de la variable est invalide." };

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      organizationId: membership.organizationId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!employee) return { error: "Salarié introuvable dans cette organisation." };

  await prisma.$transaction(async (tx) => {
    await tx.payrollVariable.create({
      data: {
        id: crypto.randomUUID(),
        organizationId: membership.organizationId,
        payrollPeriodId: period.id,
        employeeId: employee.id,
        code,
        label,
        amount,
        unit,
        source: "MANUAL",
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "payroll.variable.created",
        entityType: "PayrollVariable",
        entityId: period.id,
        metadata: { employeeId, code, unit },
      },
    });
  });

  revalidatePath(`/dashboard/payroll/${periodId}`);
  return undefined;
}

export async function deletePayrollVariable(
  periodId: string,
  variableId: string,
): Promise<PayrollVariableFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) {
    return { error: "Seuls les administrateurs peuvent modifier les variables de paie." };
  }

  const periodResult = await getEditablePayrollPeriod(periodId, membership.organizationId);
  if ("error" in periodResult) return periodResult;

  const variable = await prisma.payrollVariable.findFirst({
    where: {
      id: variableId,
      organizationId: membership.organizationId,
      payrollPeriodId: periodId,
    },
    select: { id: true, code: true },
  });
  if (!variable) return { error: "Variable de paie introuvable." };

  await prisma.$transaction(async (tx) => {
    await tx.payrollVariable.delete({ where: { id: variable.id } });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "payroll.variable.deleted",
        entityType: "PayrollVariable",
        entityId: variable.id,
        metadata: { periodId, code: variable.code },
      },
    });
  });

  revalidatePath(`/dashboard/payroll/${periodId}`);
  return undefined;
}
