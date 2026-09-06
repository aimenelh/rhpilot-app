"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePayrollPeriod } from "@/lib/payroll/payroll-period-calculation";

const VARIABLE_UNITS = ["EUR", "DAYS", "HOURS", "PERCENT"] as const;
type VariableUnit = (typeof VARIABLE_UNITS)[number];
export type PayrollVariableFormState = { error: string } | undefined;
export type PayrollCalculationFormState = { error: string } | undefined;
export type PayrollReviewFormState = { error: string } | undefined;
export type PayrollValidationFormState = { error: string } | undefined;
export type PayrollLockFormState = { error: string } | undefined;
export type PayrollPayslipPreparationFormState = { error: string } | undefined;

type EditablePayrollPeriod = { id: string; status: string };
type EditablePayrollPeriodResult = { period: EditablePayrollPeriod } | { error: string };

function parseUnit(value: FormDataEntryValue | null): VariableUnit | null {
  if (typeof value !== "string") return null;
  return VARIABLE_UNITS.includes(value as VariableUnit) ? (value as VariableUnit) : null;
}

function parseNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

async function getEditablePayrollPeriod(periodId: string, organizationId: string): Promise<EditablePayrollPeriodResult> {
  const period = await prisma.payrollPeriod.findFirst({ where: { id: periodId, organizationId }, select: { id: true, status: true } });
  if (!period) return { error: "Période de paie introuvable." };
  if (period.status !== "DRAFT") return { error: "Les variables ne peuvent être modifiées que sur une période en brouillon." };
  return { period };
}

export async function addPayrollVariable(periodId: string, _prevState: PayrollVariableFormState, formData: FormData): Promise<PayrollVariableFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return { error: "Seuls les administrateurs peuvent modifier les variables de paie." };
  const periodResult = await getEditablePayrollPeriod(periodId, membership.organizationId);
  if ("error" in periodResult) return { error: periodResult.error };
  const { period } = periodResult;
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const label = String(formData.get("label") ?? "").trim();
  const amount = parseNumber(formData.get("amount"));
  const unit = parseUnit(formData.get("unit"));
  if (!employeeId) return { error: "Le salarié est obligatoire." };
  if (!code || code.length > 80 || !/^[A-Z0-9][A-Z0-9_.-]*$/.test(code)) return { error: "Le code de variable est invalide." };
  if (!label || label.length > 160) return { error: "Le libellé de variable est invalide." };
  if (amount === null) return { error: "Le montant de la variable est invalide." };
  if (Math.abs(amount) > 100000000) return { error: "La valeur de la variable est trop élevée." };
  if (!unit) return { error: "L'unité de la variable est invalide." };
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, organizationId: membership.organizationId, deletedAt: null }, select: { id: true } });
  if (!employee) return { error: "Salarié introuvable dans cette organisation." };
  await prisma.$transaction(async (tx) => {
    await tx.payrollVariable.create({ data: { id: crypto.randomUUID(), organizationId: membership.organizationId, payrollPeriodId: period.id, employeeId: employee.id, code, label, amount, unit, source: "MANUAL" } });
    await tx.auditLog.create({ data: { organizationId: membership.organizationId, actorUserId: user.id, action: "payroll.variable.created", entityType: "PayrollVariable", entityId: period.id, metadata: { employeeId, code, unit } } });
  });
  revalidatePath(`/dashboard/payroll/${periodId}`);
  return undefined;
}

export async function deletePayrollVariable(periodId: string, variableId: string): Promise<PayrollVariableFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return { error: "Seuls les administrateurs peuvent modifier les variables de paie." };
  const periodResult = await getEditablePayrollPeriod(periodId, membership.organizationId);
  if ("error" in periodResult) return { error: periodResult.error };
  const variable = await prisma.payrollVariable.findFirst({ where: { id: variableId, organizationId: membership.organizationId, payrollPeriodId: periodId }, select: { id: true, code: true } });
  if (!variable) return { error: "Variable de paie introuvable." };
  await prisma.$transaction(async (tx) => {
    await tx.payrollVariable.delete({ where: { id: variable.id } });
    await tx.auditLog.create({ data: { organizationId: membership.organizationId, actorUserId: user.id, action: "payroll.variable.deleted", entityType: "PayrollVariable", entityId: variable.id, metadata: { periodId, code: variable.code } } });
  });
  revalidatePath(`/dashboard/payroll/${periodId}`);
  return undefined;
}

export async function calculatePayrollPeriodAction(_prevState: PayrollCalculationFormState, formData: FormData): Promise<PayrollCalculationFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return { error: "Seuls les administrateurs peuvent lancer le calcul de paie." };
  const periodId = String(formData.get("periodId") ?? "").trim();
  const ruleCode = String(formData.get("ruleCode") ?? "").trim();
  const ruleScope = String(formData.get("ruleScope") ?? "").trim();
  if (!periodId) return { error: "La période de paie est obligatoire." };
  if (!ruleCode || !ruleScope) return { error: "Une règle de paie validée doit être sélectionnée." };
  try {
    const result = await calculatePayrollPeriod({ periodId, organizationId: membership.organizationId, ruleCode, ruleScope, actorUserId: user.id });
    revalidatePath(`/dashboard/payroll/${periodId}`);
    revalidatePath("/dashboard/payroll");
    if (result.employeeCount === 0) return { error: "Aucun salarié actif n'est disponible pour cette période." };
    return undefined;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Le calcul de la période a échoué." };
  }
}

export async function movePayrollPeriodToReviewAction(_prevState: PayrollReviewFormState, formData: FormData): Promise<PayrollReviewFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return { error: "Seuls les administrateurs peuvent ouvrir le contrôle de paie." };
  const periodId = String(formData.get("periodId") ?? "").trim();
  if (!periodId) return { error: "La période de paie est obligatoire." };
  const period = await prisma.payrollPeriod.findFirst({ where: { id: periodId, organizationId: membership.organizationId }, select: { id: true, status: true } });
  if (!period) return { error: "Période de paie introuvable." };
  if (period.status !== "CALCULATED") return { error: "La période doit être calculée avant de passer au contrôle." };
  const [employeeCount, calculationCount] = await Promise.all([
    prisma.employee.count({ where: { organizationId: membership.organizationId, deletedAt: null } }),
    prisma.payrollCalculation.count({ where: { organizationId: membership.organizationId, payrollPeriodId: period.id } }),
  ]);
  if (employeeCount === 0) return { error: "Aucun salarié actif n'est disponible pour cette période." };
  if (calculationCount !== employeeCount) return { error: `Contrôle impossible : ${calculationCount}/${employeeCount} salarié${employeeCount > 1 ? "s" : ""} calculé${employeeCount > 1 ? "s" : ""}.` };
  await prisma.$transaction(async (tx) => {
    await tx.payrollPeriod.update({ where: { id: period.id }, data: { status: "REVIEW" } });
    await tx.auditLog.create({ data: { organizationId: membership.organizationId, actorUserId: user.id, action: "payroll.period.review.started", entityType: "PayrollPeriod", entityId: period.id, metadata: { employeeCount, calculationCount } } });
  });
  revalidatePath(`/dashboard/payroll/${periodId}`);
  revalidatePath("/dashboard/payroll");
  return undefined;
}

export async function validatePayrollPeriodAction(_prevState: PayrollValidationFormState, formData: FormData): Promise<PayrollValidationFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return { error: "Seuls les administrateurs peuvent valider la paie." };
  const periodId = String(formData.get("periodId") ?? "").trim();
  if (!periodId) return { error: "La période de paie est obligatoire." };
  const period = await prisma.payrollPeriod.findFirst({ where: { id: periodId, organizationId: membership.organizationId }, select: { id: true, status: true } });
  if (!period) return { error: "Période de paie introuvable." };
  if (period.status !== "REVIEW") return { error: "La période doit être en contrôle avant d'être validée." };
  const employeeCount = await prisma.employee.count({ where: { organizationId: membership.organizationId, deletedAt: null } });
  if (employeeCount === 0) return { error: "Aucun salarié actif n'est disponible pour cette période." };
  const calculations = await prisma.payrollCalculation.findMany({ where: { organizationId: membership.organizationId, payrollPeriodId: period.id }, select: { employeeId: true, grossAmount: true, employeeContributions: true, employerContributions: true, netBeforeTax: true, withholdingTax: true, netPaid: true, ruleSetVersion: true, calculationSnapshot: true } });
  if (calculations.length !== employeeCount) return { error: `Validation impossible : ${calculations.length}/${employeeCount} calcul${employeeCount > 1 ? "s" : ""} disponible${employeeCount > 1 ? "s" : ""}.` };
  const invalidCalculation = calculations.find((calculation) => !calculation.ruleSetVersion || calculation.calculationSnapshot === null || Number(calculation.grossAmount) < 0 || Number(calculation.employeeContributions) < 0 || Number(calculation.employerContributions) < 0 || Number(calculation.netBeforeTax) < 0 || Number(calculation.withholdingTax) < 0 || Number(calculation.netPaid) < 0);
  if (invalidCalculation) return { error: "Validation impossible : un calcul enregistré est incohérent ou incomplet." };
  const validatedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.payrollPeriod.update({ where: { id: period.id }, data: { status: "VALIDATED", validatedAt } });
    await tx.auditLog.create({ data: { organizationId: membership.organizationId, actorUserId: user.id, action: "payroll.period.validated", entityType: "PayrollPeriod", entityId: period.id, metadata: { employeeCount, calculationCount: calculations.length, validatedAt: validatedAt.toISOString() } } });
  });
  revalidatePath(`/dashboard/payroll/${periodId}`);
  revalidatePath("/dashboard/payroll");
  return undefined;
}

export async function lockPayrollPeriodAction(_prevState: PayrollLockFormState, formData: FormData): Promise<PayrollLockFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return { error: "Seuls les administrateurs peuvent verrouiller la paie." };
  const periodId = String(formData.get("periodId") ?? "").trim();
  if (!periodId) return { error: "La période de paie est obligatoire." };
  const period = await prisma.payrollPeriod.findFirst({ where: { id: periodId, organizationId: membership.organizationId }, select: { id: true, status: true } });
  if (!period) return { error: "Période de paie introuvable." };
  if (period.status !== "VALIDATED") return { error: "La période doit être validée avant d'être verrouillée." };
  const employeeCount = await prisma.employee.count({ where: { organizationId: membership.organizationId, deletedAt: null } });
  const calculationCount = await prisma.payrollCalculation.count({ where: { organizationId: membership.organizationId, payrollPeriodId: period.id } });
  if (employeeCount === 0) return { error: "Aucun salarié actif n'est disponible pour cette période." };
  if (calculationCount !== employeeCount) return { error: `Verrouillage impossible : ${calculationCount}/${employeeCount} calcul${employeeCount > 1 ? "s" : ""} disponible${employeeCount > 1 ? "s" : ""}.` };
  const lockedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.payrollPeriod.update({ where: { id: period.id }, data: { status: "LOCKED", lockedAt } });
    await tx.auditLog.create({ data: { organizationId: membership.organizationId, actorUserId: user.id, action: "payroll.period.locked", entityType: "PayrollPeriod", entityId: period.id, metadata: { employeeCount, calculationCount, lockedAt: lockedAt.toISOString() } } });
  });
  revalidatePath(`/dashboard/payroll/${periodId}`);
  revalidatePath("/dashboard/payroll");
  return undefined;
}

export async function preparePayrollPayslipsAction(_prevState: PayrollPayslipPreparationFormState, formData: FormData): Promise<PayrollPayslipPreparationFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return { error: "Seuls les administrateurs peuvent préparer les bulletins de paie." };
  const periodId = String(formData.get("periodId") ?? "").trim();
  if (!periodId) return { error: "La période de paie est obligatoire." };

  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, organizationId: membership.organizationId },
    select: { id: true, year: true, month: true, status: true },
  });
  if (!period) return { error: "Période de paie introuvable." };
  if (period.status !== "LOCKED") return { error: "Les bulletins ne peuvent être préparés qu'après verrouillage de la période." };

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
    return { error: `Préparation impossible : ${calculations.length}/${employees.length} calcul${employees.length > 1 ? "s" : ""} disponible${employees.length > 1 ? "s" : ""}.` };
  }
  if (calculations.some((calculation) => calculation.calculationSnapshot === null)) {
    return { error: "Préparation impossible : un calcul verrouillé ne possède pas de snapshot." };
  }

  const employeeIds = new Set(employees.map((employee) => employee.id));
  if (calculations.some((calculation) => !employeeIds.has(calculation.employeeId))) {
    return { error: "Préparation impossible : un calcul référence un salarié hors périmètre." };
  }

  const preparedAt = new Date();
  await prisma.$transaction(async (tx) => {
    for (const calculation of calculations) {
      await tx.payslip.upsert({
        where: { calculationId: calculation.id },
        create: {
          id: crypto.randomUUID(),
          organizationId: membership.organizationId,
          payrollPeriodId: period.id,
          employeeId: calculation.employeeId,
          calculationId: calculation.id,
          documentStatus: "PREPARED",
          generatedAt: preparedAt,
        },
        update: {
          documentStatus: "PREPARED",
          generatedAt: preparedAt,
        },
      });
    }

    await tx.auditLog.create({
      data: {
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

  revalidatePath(`/dashboard/payroll/${periodId}`);
  revalidatePath("/dashboard/payroll");
  return undefined;
}
