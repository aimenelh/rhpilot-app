"use server";

import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePayslipPdf, PayslipPdfPrerequisiteError } from "@/lib/payroll/payslip-pdf";
import { storePayslipDocument } from "@/lib/payroll/payslip-storage";

export type PayrollPayslipGenerationFormState = { error: string } | undefined;

type Snapshot = {
  profile?: {
    monthlyHours?: unknown;
    classificationLabel?: unknown;
    classificationCode?: unknown;
    collectiveAgreementId?: unknown;
    baseSalaryCents?: unknown;
  };
  variables?: Array<{ label?: unknown; amount?: unknown }>;
  ruleSource?: { sourceName?: unknown };
  result?: { netSocialAmount?: unknown };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number(value);
}

function normalizeSnapshot(value: unknown): Snapshot {
  return isRecord(value) ? (value as Snapshot) : {};
}

export async function generatePayrollPayslipsAction(
  _prevState: PayrollPayslipGenerationFormState,
  formData: FormData,
): Promise<PayrollPayslipGenerationFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) {
    return { error: "Seuls les administrateurs peuvent générer les bulletins de paie." };
  }

  const periodId = String(formData.get("periodId") ?? "").trim();
  if (!periodId) return { error: "La période de paie est obligatoire." };

  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, organizationId: membership.organizationId },
    select: { id: true, year: true, month: true, status: true },
  });
  if (!period) return { error: "Période de paie introuvable." };
  if (period.status !== "LOCKED") return { error: "Les bulletins ne peuvent être générés qu'après verrouillage de la période." };

  const [organization, employees, calculations, profiles, agreements] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: membership.organizationId, deletedAt: null },
      select: { id: true, name: true, siret: true, conventionCollective: true, collectiveAgreementId: true },
    }),
    prisma.employee.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, position: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.payrollCalculation.findMany({
      where: { organizationId: membership.organizationId, payrollPeriodId: period.id },
      select: { id: true, employeeId: true, calculationSnapshot: true, grossAmount: true, employeeContributions: true, employerContributions: true, netBeforeTax: true, withholdingTax: true, netPaid: true },
    }),
    prisma.payrollProfile.findMany({
      where: { organizationId: membership.organizationId },
      select: { employeeId: true, monthlyHours: true, classificationCode: true, classificationLabel: true, collectiveAgreementId: true, baseSalaryCents: true },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.collectiveAgreement.findMany({
      select: { id: true, name: true, idcc: true },
    }),
  ]);

  if (!organization) return { error: "Organisation introuvable." };
  if (employees.length === 0) return { error: "Aucun salarié actif n'est disponible pour cette période." };
  if (calculations.length !== employees.length) return { error: `Génération impossible : ${calculations.length}/${employees.length} calculs verrouillés disponibles.` };
  if (calculations.some((calculation) => calculation.calculationSnapshot === null)) return { error: "Génération impossible : un calcul verrouillé ne possède pas de snapshot." };

  const profileByEmployee = new Map<string, (typeof profiles)[number]>();
  for (const profile of profiles) {
    if (!profileByEmployee.has(profile.employeeId)) profileByEmployee.set(profile.employeeId, profile);
  }
  const calculationByEmployee = new Map(calculations.map((calculation) => [calculation.employeeId, calculation]));
  const agreementById = new Map(agreements.map((agreement) => [agreement.id, agreement]));
  const existingPayslips = await prisma.payslip.findMany({
    where: { organizationId: membership.organizationId, payrollPeriodId: period.id },
    select: { id: true, employeeId: true, documentStatus: true },
  });
  const payslipByEmployee = new Map(existingPayslips.map((payslip) => [payslip.employeeId, payslip]));

  try {
    for (const employee of employees) {
      const calculation = calculationByEmployee.get(employee.id);
      const profile = profileByEmployee.get(employee.id);
      if (!calculation || !profile) return { error: `Données de bulletin incomplètes pour ${employee.firstName} ${employee.lastName}.` };
      if (payslipByEmployee.get(employee.id)?.documentStatus === "GENERATED") continue;

      const snapshot = normalizeSnapshot(calculation.calculationSnapshot);
      const agreementId = asString(snapshot.profile?.collectiveAgreementId) || profile.collectiveAgreementId || organization.collectiveAgreementId || null;
      const agreement = agreementId ? agreementById.get(agreementId) : null;
      const contributionRows = await prisma.payrollContribution.findMany({
        where: { calculationId: calculation.id },
        select: { label: true, side: true, baseAmount: true, rate: true, amount: true },
        orderBy: { id: "asc" },
      });

      const pdf = generatePayslipPdf({
        employer: {
          name: organization.name,
          address: "",
          siret: organization.siret ?? "",
          nafCode: "",
          urssafReference: "",
        },
        employee: {
          name: `${employee.firstName} ${employee.lastName}`.trim(),
          address: "",
          position: employee.position ?? "",
          classification: profile.classificationLabel || profile.classificationCode || "",
        },
        period: {
          year: period.year,
          month: period.month,
          paymentDate: "",
          hours: asNumber(snapshot.profile?.monthlyHours ?? profile.monthlyHours),
        },
        salary: {
          baseGross: profile.baseSalaryCents === null || profile.baseSalaryCents === undefined ? Number(calculation.grossAmount) : profile.baseSalaryCents / 100,
          variables: Array.isArray(snapshot.variables)
            ? snapshot.variables.map((variable) => ({ label: asString(variable.label), amount: asNumber(variable.amount) }))
            : [],
          gross: Number(calculation.grossAmount),
          employeeContributions: Number(calculation.employeeContributions),
          employerContributions: Number(calculation.employerContributions),
          netBeforeTax: Number(calculation.netBeforeTax),
          withholdingTax: Number(calculation.withholdingTax),
          netPaid: Number(calculation.netPaid),
          netSocial: asNumber(snapshot.result?.netSocialAmount),
          totalEmployerCost: Number(calculation.grossAmount) + Number(calculation.employerContributions),
        },
        contributions: contributionRows.map((contribution) => ({
          label: contribution.label,
          side: contribution.side === "EMPLOYER" ? "EMPLOYER" : "EMPLOYEE",
          baseAmount: Number(contribution.baseAmount),
          rate: Number(contribution.rate),
          amount: Number(contribution.amount),
        })),
        collectiveAgreement: agreement ? `${agreement.name} (IDCC ${agreement.idcc})` : "",
        source: asString(snapshot.ruleSource?.sourceName),
      });

      const stored = storePayslipDocument(pdf);
      const generatedAt = new Date();
      await prisma.payslip.upsert({
        where: { calculationId: calculation.id },
        create: {
          id: payslipByEmployee.get(employee.id)?.id ?? crypto.randomUUID(),
          organizationId: membership.organizationId,
          payrollPeriodId: period.id,
          employeeId: employee.id,
          calculationId: calculation.id,
          documentStatus: "GENERATED",
          storageKey: stored.storageKey,
          generatedAt,
        },
        update: {
          documentStatus: "GENERATED",
          storageKey: stored.storageKey,
          generatedAt,
        },
      });
    }
  } catch (error) {
    if (error instanceof PayslipPdfPrerequisiteError) {
      return { error: `Génération bloquée. Données manquantes : ${error.missing.join(", ")}.` };
    }
    return { error: error instanceof Error ? error.message : "La génération des bulletins a échoué." };
  }

  await prisma.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "payroll.payslips.generated",
      entityType: "PayrollPeriod",
      entityId: period.id,
      metadata: { year: period.year, month: period.month, employeeCount: employees.length },
    },
  });

  revalidatePath(`/dashboard/payroll/${periodId}`);
  revalidatePath(`/dashboard/payroll/${periodId}/payslips`);
  return undefined;
}
