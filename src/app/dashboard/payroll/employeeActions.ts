"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";

export type PayrollProfileFormState = { error: string } | undefined;

function parseNullableString(value: FormDataEntryValue | null): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function saveEmployeePayrollProfile(
  employeeId: string,
  _prevState: PayrollProfileFormState,
  formData: FormData,
): Promise<PayrollProfileFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) {
    return { error: "Seuls les administrateurs peuvent configurer la paie." };
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      organizationId: membership.organizationId,
      deletedAt: null,
    },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!employee) return { error: "Salarié introuvable dans cette organisation." };

  const salaryEuros = Number(formData.get("salaryEuros"));
  const monthlyHours = Number(formData.get("monthlyHours"));
  const effectiveFromRaw = String(formData.get("effectiveFrom") ?? "");
  const seniorityDateRaw = String(formData.get("seniorityDate") ?? "");
  const collectiveAgreementId = parseNullableString(formData.get("collectiveAgreementId"));
  const classificationCode = parseNullableString(formData.get("classificationCode"));
  const classificationLabel = parseNullableString(formData.get("classificationLabel"));
  const level = parseNullableString(formData.get("level"));
  const coefficient = parseNullableString(formData.get("coefficient"));

  if (!Number.isFinite(salaryEuros) || salaryEuros < 0) {
    return { error: "Le salaire brut mensuel est invalide." };
  }
  if (!Number.isFinite(monthlyHours) || monthlyHours <= 0) {
    return { error: "Le nombre d'heures mensuelles est invalide." };
  }
  if (!effectiveFromRaw || Number.isNaN(new Date(effectiveFromRaw).getTime())) {
    return { error: "La date d'effet est invalide." };
  }
  if (seniorityDateRaw && Number.isNaN(new Date(seniorityDateRaw).getTime())) {
    return { error: "La date d'ancienneté est invalide." };
  }

  // Horaire hebdomadaire (heures par jour, du lundi au dimanche) et heures supplémentaires structurelles.
  let weeklySchedule: number[] | null = null;
  if (formData.has("schedule.0")) {
    const days = Array.from({ length: 7 }, (_, index) => String(formData.get(`schedule.${index}`) ?? "").trim().replace(",", "."));
    if (days.some((value) => value !== "")) {
      weeklySchedule = days.map((value) => (value === "" ? 0 : Number(value)));
      if (weeklySchedule.some((hours) => !Number.isFinite(hours) || hours < 0 || hours > 12)) return { error: "Chaque jour de l'horaire hebdomadaire doit compter entre 0 et 12 heures." };
      const weekly = weeklySchedule.reduce((total, hours) => total + hours, 0);
      if (weekly <= 0) return { error: "L'horaire hebdomadaire ne prévoit aucune heure de travail." };
      const expectedWeekly = (monthlyHours * 12) / 52;
      if (Math.abs(weekly - expectedWeekly) > 0.05) return { error: `L'horaire hebdomadaire (${weekly.toFixed(2)} h) ne correspond pas aux heures mensuelles (${monthlyHours} h, soit ${expectedWeekly.toFixed(2)} h par semaine).` };
    }
  }
  const structuralRaw = String(formData.get("structuralOvertimeHours") ?? "").trim().replace(",", ".");
  const structuralOvertimeHours = structuralRaw === "" ? null : Number(structuralRaw);
  if (structuralOvertimeHours !== null && (!Number.isFinite(structuralOvertimeHours) || structuralOvertimeHours < 0 || structuralOvertimeHours >= monthlyHours)) return { error: "Les heures supplémentaires structurelles sont invalides." };
  const structuralRateRaw = String(formData.get("structuralOvertimeRate") ?? "").trim().replace(",", ".");
  const structuralOvertimeRate = structuralRateRaw === "" ? null : Number(structuralRateRaw) / 100;
  if (structuralOvertimeRate !== null && (!Number.isFinite(structuralOvertimeRate) || structuralOvertimeRate < 0.1 || structuralOvertimeRate > 1)) return { error: "La majoration des heures supplémentaires structurelles doit être d'au moins 10 %." };

  const effectiveFrom = new Date(effectiveFromRaw);
  effectiveFrom.setHours(0, 0, 0, 0);
  const seniorityDate = seniorityDateRaw ? new Date(seniorityDateRaw) : null;
  if (seniorityDate) seniorityDate.setHours(0, 0, 0, 0);

  if (collectiveAgreementId) {
    const agreement = await prisma.collectiveAgreement.findFirst({
      where: {
        id: collectiveAgreementId,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!agreement) return { error: "Convention collective introuvable ou inactive." };
  }

  await prisma.$transaction(async (tx) => {
    const existingProfiles = await tx.payrollProfile.findMany({
      where: {
        organizationId: membership.organizationId,
        employeeId: employee.id,
        effectiveUntil: null,
        effectiveFrom: { lt: effectiveFrom },
      },
      select: { id: true, effectiveFrom: true },
    });

    for (const profile of existingProfiles) {
      await tx.payrollProfile.update({
        where: { id: profile.id },
        data: { effectiveUntil: effectiveFrom, updatedAt: new Date() },
      });
    }

    const savedProfile = await tx.payrollProfile.upsert({
      where: {
        organizationId_employeeId_effectiveFrom: {
          organizationId: membership.organizationId,
          employeeId: employee.id,
          effectiveFrom,
        },
      },
      create: {
        id: crypto.randomUUID(),
        organizationId: membership.organizationId,
        employeeId: employee.id,
        payFrequency: "MONTHLY",
        currency: "EUR",
        baseSalaryCents: Math.round(salaryEuros * 100),
        monthlyHours,
        collectiveAgreementId,
        classificationCode,
        classificationLabel,
        level,
        coefficient,
        seniorityDate,
        effectiveFrom,
      },
      update: {
        baseSalaryCents: Math.round(salaryEuros * 100),
        monthlyHours,
        collectiveAgreementId,
        classificationCode,
        classificationLabel,
        level,
        coefficient,
        seniorityDate,
        updatedAt: new Date(),
      },
      select: { id: true },
    });
    const healthPlanWaiver = formData.get("healthPlanWaiver") === "on";
    await tx.$executeRaw`UPDATE "payroll_profiles" SET "weeklySchedule" = ${weeklySchedule === null ? null : JSON.stringify(weeklySchedule)}::jsonb, "structuralOvertimeHours" = ${structuralOvertimeHours}, "structuralOvertimeRate" = ${structuralOvertimeRate}, "healthPlanWaiver" = ${healthPlanWaiver} WHERE "id" = ${savedProfile.id}`;

    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "payroll.profile.updated",
        entityType: "Employee",
        entityId: employee.id,
        metadata: {
          effectiveFrom: effectiveFrom.toISOString(),
          employeeId: employee.id,
        },
      },
    });
  });

  revalidatePath(`/dashboard/employees/${employee.id}`);
  revalidatePath("/dashboard/payroll");
  return undefined;
}
