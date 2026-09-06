"use server";

import { revalidatePath } from "next/cache";
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

    await tx.payrollProfile.upsert({
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
    });

    await tx.auditLog.create({
      data: {
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
