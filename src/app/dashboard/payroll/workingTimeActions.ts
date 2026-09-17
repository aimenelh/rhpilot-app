"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateComplementaryHoursPay,
  calculateOvertimePay,
  type OvertimeWeekInput,
} from "@/lib/payroll/working-time-pay";

export type WorkingTimeFormState = { error?: string; success?: string } | undefined;

type PayrollContext = {
  organizationId: string;
  actorUserId: string;
  period: { id: string; year: number; month: number };
  employee: { id: string; firstName: string; lastName: string };
  profile: { baseSalaryCents: number; monthlyHours: unknown };
};

function parseNumber(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function periodBounds(year: number, month: number) {
  return {
    start: new Date(year, month - 1, 1, 0, 0, 0, 0),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

async function resolvePayrollContext(periodId: string, employeeId: string): Promise<PayrollContext> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Session expirée, veuillez recharger la page.");
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) {
    throw new Error("Seuls les administrateurs peuvent valoriser les heures de paie.");
  }
  if (!periodId || !employeeId) throw new Error("La période et le salarié sont obligatoires.");

  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, organizationId: membership.organizationId },
    select: { id: true, year: true, month: true, status: true },
  });
  if (!period) throw new Error("Période de paie introuvable.");
  if (period.status !== "DRAFT") throw new Error("Les heures ne peuvent être valorisées que sur une période en préparation.");

  const { start, end } = periodBounds(period.year, period.month);
  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      organizationId: membership.organizationId,
      deletedAt: null,
      hireDate: { lte: end },
      OR: [{ contractEndDate: null }, { contractEndDate: { gte: start } }],
    },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!employee) throw new Error("Salarié introuvable ou hors de la période de paie.");

  const profiles = await prisma.payrollProfile.findMany({
    where: {
      organizationId: membership.organizationId,
      employeeId: employee.id,
      effectiveFrom: { lte: end },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: start } }],
    },
    select: { id: true, baseSalaryCents: true, monthlyHours: true },
    orderBy: { effectiveFrom: "desc" },
  });
  if (profiles.length !== 1) {
    throw new Error(
      profiles.length === 0
        ? "Aucun profil paie applicable n'est disponible pour ce salarié."
        : "Plusieurs profils paie se chevauchent sur la période. La valorisation des heures est bloquée.",
    );
  }
  const profile = profiles[0];
  if (profile.baseSalaryCents === null || !Number.isFinite(Number(profile.baseSalaryCents)) || Number(profile.baseSalaryCents) < 0) {
    throw new Error("Le salaire mensuel du profil paie est manquant ou invalide.");
  }
  const monthlyHours = Number(profile.monthlyHours);
  if (!Number.isFinite(monthlyHours) || monthlyHours <= 0) {
    throw new Error("Le volume horaire mensuel du profil paie est manquant ou invalide.");
  }

  return {
    organizationId: membership.organizationId,
    actorUserId: user.id,
    period: { id: period.id, year: period.year, month: period.month },
    employee,
    profile: { baseSalaryCents: Number(profile.baseSalaryCents), monthlyHours: profile.monthlyHours },
  };
}

function employeeName(context: PayrollContext): string {
  return `${context.employee.firstName} ${context.employee.lastName}`.trim();
}

async function replaceSystemVariables(input: {
  context: PayrollContext;
  code: "OVERTIME_HOURS" | "ADDITIONAL_HOURS";
  lines: Array<{ label: string; amount: number; ruleVersionId: string; sourceReference: string; hours: number; premiumRate: number }>;
  metadata: Record<string, string | number | boolean | null | Array<Record<string, string | number | boolean | null>>>;
}) {
  const { context } = input;
  await prisma.$transaction(async (tx) => {
    await tx.payrollVariable.deleteMany({
      where: {
        organizationId: context.organizationId,
        payrollPeriodId: context.period.id,
        employeeId: context.employee.id,
        code: input.code,
        source: "SYSTEM",
      },
    });

    for (const line of input.lines) {
      await tx.payrollVariable.create({
        data: {
          id: randomUUID(),
          organizationId: context.organizationId,
          payrollPeriodId: context.period.id,
          employeeId: context.employee.id,
          code: input.code,
          label: line.label,
          amount: line.amount,
          unit: "EUR",
          source: "SYSTEM",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: context.organizationId,
        actorUserId: context.actorUserId,
        action: "payroll.working_time.valued",
        entityType: "PayrollPeriod",
        entityId: context.period.id,
        metadata: {
          employeeId: context.employee.id,
          code: input.code,
          lineCount: input.lines.length,
          totalAmount: input.lines.reduce((sum, line) => sum + line.amount, 0),
          ruleVersions: [...new Set(input.lines.map((line) => line.ruleVersionId))],
          sources: [...new Set(input.lines.map((line) => line.sourceReference))],
          ...input.metadata,
        },
      },
    });
  });

  revalidatePath(`/dashboard/payroll/${context.period.id}`);
}

export async function valueOvertimeHoursAction(
  periodId: string,
  _previousState: WorkingTimeFormState,
  formData: FormData,
): Promise<WorkingTimeFormState> {
  try {
    const employeeId = String(formData.get("employeeId") ?? "").trim();
    const context = await resolvePayrollContext(periodId, employeeId);
    const firstBandHours = parseNumber(formData.get("firstBandHours")) ?? 8;
    const firstRatePercent = parseNumber(formData.get("firstPremiumRate")) ?? 25;
    const secondRatePercent = parseNumber(formData.get("secondPremiumRate")) ?? 50;
    const sourceReference = String(formData.get("sourceReference") ?? "").trim() || "Code du travail, art. L3121-36";
    const firstPremiumRate = firstRatePercent / 100;
    const secondPremiumRate = secondRatePercent / 100;

    if (!Number.isFinite(firstBandHours) || firstBandHours <= 0 || firstBandHours > 24) {
      throw new Error("La première tranche hebdomadaire doit être comprise entre 0 et 24 heures.");
    }
    if (firstPremiumRate < 0.1 || firstPremiumRate > 3 || secondPremiumRate < 0.1 || secondPremiumRate > 3) {
      throw new Error("Les taux de majoration doivent être compris entre 10 % et 300 %.");
    }

    const weeks: OvertimeWeekInput[] = [];
    for (let index = 1; index <= 6; index += 1) {
      const hours = parseNumber(formData.get(`week${index}Hours`));
      if (hours === null || hours === 0) continue;
      if (hours < 0 || hours > 80) throw new Error(`Le nombre d'heures supplémentaires de la semaine ${index} est invalide.`);
      weeks.push({
        weekLabel: `semaine ${index}`,
        overtimeHours: hours,
        rates: { firstBandHours, firstBandPremiumRate: firstPremiumRate, secondBandPremiumRate: secondPremiumRate, sourceReference },
      });
    }
    if (weeks.length === 0) throw new Error("Renseignez au moins une semaine avec des heures supplémentaires.");

    const result = calculateOvertimePay({
      baseSalaryAmount: context.profile.baseSalaryCents / 100,
      monthlyHours: Number(context.profile.monthlyHours),
      weeks,
    });
    if (result.lines.length === 0 || result.totalAmount <= 0) throw new Error("La valorisation des heures supplémentaires est nulle.");

    await replaceSystemVariables({
      context,
      code: "OVERTIME_HOURS",
      lines: result.lines,
      metadata: {
        totalHours: result.totalHours,
        totalAmount: result.totalAmount,
        firstBandHours,
        firstPremiumRate,
        secondPremiumRate,
        sourceReference,
        weeks: weeks.map((week) => ({ weekLabel: week.weekLabel, overtimeHours: week.overtimeHours })),
      },
    });

    return { success: `${result.totalHours.toFixed(2)} h supplémentaires valorisées à ${result.totalAmount.toFixed(2)} € pour ${employeeName(context)}.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Impossible de valoriser les heures supplémentaires." };
  }
}

export async function valueComplementaryHoursAction(
  periodId: string,
  _previousState: WorkingTimeFormState,
  formData: FormData,
): Promise<WorkingTimeFormState> {
  try {
    const employeeId = String(formData.get("employeeId") ?? "").trim();
    const context = await resolvePayrollContext(periodId, employeeId);
    const complementaryHours = parseNumber(formData.get("complementaryHours"));
    if (complementaryHours === null || complementaryHours <= 0) {
      throw new Error("Le nombre d'heures complémentaires doit être strictement positif.");
    }
    const firstRatePercent = parseNumber(formData.get("firstPremiumRate")) ?? 10;
    const secondRatePercent = parseNumber(formData.get("secondPremiumRate")) ?? 25;
    const firstPremiumRate = firstRatePercent / 100;
    const secondPremiumRate = secondRatePercent / 100;
    const agreementAllowsOneThird = formData.get("agreementAllowsOneThird") === "on";
    const sourceReference = String(formData.get("sourceReference") ?? "").trim() || "Code du travail, art. L3123-29";

    const result = calculateComplementaryHoursPay({
      baseSalaryAmount: context.profile.baseSalaryCents / 100,
      monthlyHours: Number(context.profile.monthlyHours),
      contractualMonthlyHours: Number(context.profile.monthlyHours),
      complementaryHours,
      agreementAllowsOneThird,
      firstBandPremiumRate: firstPremiumRate,
      secondBandPremiumRate: secondPremiumRate,
      sourceReference,
    });
    if (result.lines.length === 0 || result.totalAmount <= 0) throw new Error("La valorisation des heures complémentaires est nulle.");

    await replaceSystemVariables({
      context,
      code: "ADDITIONAL_HOURS",
      lines: result.lines,
      metadata: {
        totalHours: result.totalHours,
        totalAmount: result.totalAmount,
        contractualMonthlyHours: Number(context.profile.monthlyHours),
        agreementAllowsOneThird,
        firstPremiumRate,
        secondPremiumRate,
        sourceReference,
      },
    });

    return { success: `${result.totalHours.toFixed(2)} h complémentaires valorisées à ${result.totalAmount.toFixed(2)} € pour ${employeeName(context)}.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Impossible de valoriser les heures complémentaires." };
  }
}
