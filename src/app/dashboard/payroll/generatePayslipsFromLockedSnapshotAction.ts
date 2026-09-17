"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generatePayslipPdf,
  PayslipPdfPrerequisiteError,
  type PayslipPdfPaidLeave,
} from "@/lib/payroll/payslip-pdf";
import { readPayslipDocument, storePayslipDocument } from "@/lib/payroll/payslip-storage";
import { resolveLockedAnnualCumuls } from "@/lib/payroll/payroll-history";
import { assertPayrollOutputConsistency } from "@/lib/payroll/payroll-output-consistency";

export type PayrollPayslipGenerationFormState = { error: string } | undefined;

type SnapshotContribution = {
  code?: unknown;
  label?: unknown;
  sourceRule?: unknown;
  side?: unknown;
  amount?: unknown;
  baseAmount?: unknown;
  rate?: unknown;
};

type Snapshot = {
  profile?: {
    id?: unknown;
    monthlyHours?: unknown;
    classificationLabel?: unknown;
    classificationCode?: unknown;
    collectiveAgreementId?: unknown;
    baseSalaryCents?: unknown;
    coefficient?: unknown;
    seniorityDate?: unknown;
  };
  variables?: Array<{ code?: unknown; label?: unknown; amount?: unknown; unit?: unknown; source?: unknown }>;
  variableTreatments?: Array<{ code?: unknown; grossDelta?: unknown; netAdjustment?: unknown; kind?: unknown }>;
  validatedAbsences?: Array<{
    absenceId?: unknown;
    type?: unknown;
    startDate?: unknown;
    endDate?: unknown;
    payrollImpactStatus?: unknown;
  }>;
  absenceGrossImpacts?: Array<{
    absenceId?: unknown;
    absenceType?: unknown;
    absenceDays?: unknown;
    grossDelta?: unknown;
    derivedVariableCode?: unknown;
    derivedVariableLabel?: unknown;
  }>;
  ruleSource?: { sourceName?: unknown };
  withholdingTax?: {
    status?: unknown;
    rate?: unknown;
    amount?: unknown;
    validFrom?: unknown;
    validUntil?: unknown;
    source?: unknown;
    sourceReference?: unknown;
  };
  socialEngine?: {
    modelVersion?: unknown;
    grossAmount?: unknown;
    employeeContributions?: unknown;
    employerContributions?: unknown;
    netBeforeTax?: unknown;
    netTaxableAmount?: unknown;
    netSocialAmount?: unknown;
    employerCost?: unknown;
    contributionDetails?: SnapshotContribution[];
  };
  payable?: {
    socialNetBeforeTax?: unknown;
    postSocialAdjustment?: unknown;
    netBeforeTax?: unknown;
    withholdingTax?: unknown;
    netPaid?: unknown;
  };
};

type LockedContribution = {
  code: string;
  label: string;
  side: "EMPLOYEE" | "EMPLOYER";
  amount: number;
  baseAmount: number | null;
  rate: number | null;
  sourceRule: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSnapshot(value: unknown): Snapshot {
  return isRecord(value) ? (value as Snapshot) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertClose(label: string, expected: number, actual: number): void {
  if (!Number.isFinite(expected) || !Number.isFinite(actual) || Math.abs(expected - actual) > 0.01) {
    throw new Error(`Génération bloquée : ${label} ne correspond pas au calcul verrouillé.`);
  }
}

function toDisplayName(value: string): string {
  return value
    .trim()
    .split(/(\s|-)/)
    .map((part) =>
      part === " " || part === "-"
        ? part
        : part.charAt(0).toLocaleUpperCase("fr-FR") + part.slice(1).toLocaleLowerCase("fr-FR"),
    )
    .join("");
}

const CLASSIFICATION_CODE_LABELS: Record<string, string> = {
  CADRE: "Cadre",
  AGENT_DE_MAITRISE: "Agent de maîtrise",
  EMPLOYE: "Employé",
  OUVRIER: "Ouvrier",
  AUTRE: "Autre",
};

function toDisplayClassification(label: string | null, code: string | null): string {
  if (label?.trim()) return label.trim();
  if (!code) return "";
  return CLASSIFICATION_CODE_LABELS[code] ?? toDisplayName(code.replace(/_/g, " "));
}

function formatSeniority(reference: Date, asOf: Date): string {
  if (Number.isNaN(reference.getTime()) || Number.isNaN(asOf.getTime()) || reference > asOf) return "";
  let years = asOf.getUTCFullYear() - reference.getUTCFullYear();
  let months = asOf.getUTCMonth() - reference.getUTCMonth();
  if (asOf.getUTCDate() < reference.getUTCDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? "s" : ""}`);
  if (months > 0 || years === 0) parts.push(`${months} mois`);
  return parts.join(" ");
}

function buildPaidLeaveSummary(snapshot: Snapshot): PayslipPdfPaidLeave | undefined {
  const leaves = (snapshot.validatedAbsences ?? []).filter((absence) => asString(absence.type) === "PAID_LEAVE");
  if (leaves.length === 0) return undefined;

  const ids = new Set(leaves.map((absence) => asString(absence.absenceId)).filter(Boolean));
  const daysTaken = (snapshot.absenceGrossImpacts ?? [])
    .filter((impact) => ids.has(asString(impact.absenceId)))
    .reduce((sum, impact) => {
      const days = asNumber(impact.absenceDays);
      return sum + (Number.isFinite(days) ? days : 0);
    }, 0);
  const indemnity = (snapshot.variables ?? [])
    .filter((variable) => asString(variable.code) === "PAID_LEAVE_INDEMNITY")
    .reduce((sum, variable) => {
      const amount = asNumber(variable.amount);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  const leaveDates = leaves
    .map((absence) => {
      const start = asString(absence.startDate).slice(0, 10);
      const end = asString(absence.endDate).slice(0, 10);
      return start && end ? (start === end ? start : `${start} au ${end}`) : "";
    })
    .filter(Boolean)
    .join(" ; ");

  return {
    ...(leaveDates ? { leaveDates } : {}),
    ...(daysTaken > 0 ? { daysTaken: roundMoney(daysTaken), taken: roundMoney(daysTaken) } : {}),
    ...(indemnity > 0 ? { indemnity: roundMoney(indemnity) } : {}),
  };
}

function buildGrossVariableRows(snapshot: Snapshot): Array<{ label: string; amount: number }> {
  const labelsByCode = new Map<string, string>();
  for (const variable of snapshot.variables ?? []) {
    const code = asString(variable.code);
    if (code && !labelsByCode.has(code)) labelsByCode.set(code, asString(variable.label) || code);
  }

  const rows: Array<{ label: string; amount: number }> = [];
  for (const treatment of snapshot.variableTreatments ?? []) {
    const amount = asNumber(treatment.grossDelta);
    if (!Number.isFinite(amount) || Math.abs(amount) < 0.005) continue;
    const code = asString(treatment.code);
    rows.push({ label: labelsByCode.get(code) ?? code ?? "Élément de paie", amount: roundMoney(amount) });
  }
  for (const impact of snapshot.absenceGrossImpacts ?? []) {
    const amount = asNumber(impact.grossDelta);
    if (!Number.isFinite(amount) || Math.abs(amount) < 0.005) continue;
    rows.push({
      label: asString(impact.derivedVariableLabel) || asString(impact.absenceType) || "Absence",
      amount: roundMoney(amount),
    });
  }
  return rows;
}

function buildNetAdjustmentRows(snapshot: Snapshot): Array<{ label: string; amount: number }> {
  const labelsByCode = new Map<string, string>();
  for (const variable of snapshot.variables ?? []) {
    const code = asString(variable.code);
    if (code && !labelsByCode.has(code)) labelsByCode.set(code, asString(variable.label) || code);
  }

  const rows = (snapshot.variableTreatments ?? []).flatMap((treatment) => {
    const amount = asNumber(treatment.netAdjustment);
    if (!Number.isFinite(amount) || Math.abs(amount) < 0.005) return [];
    const code = asString(treatment.code);
    return [{ label: labelsByCode.get(code) ?? (code || "Ajustement net"), amount: roundMoney(amount) }];
  });

  const expected = asNumber(snapshot.payable?.postSocialAdjustment);
  const actual = roundMoney(rows.reduce((sum, row) => sum + row.amount, 0));
  if (!Number.isFinite(expected)) {
    throw new Error("Génération bloquée : l’ajustement net total n’est pas historisé dans le snapshot.");
  }
  assertClose("le total des ajustements nets", expected, actual);
  return rows;
}

function normalizeLockedContributions(snapshot: Snapshot): LockedContribution[] {
  const details = snapshot.socialEngine?.contributionDetails;
  if (!Array.isArray(details)) {
    throw new Error("Génération bloquée : le snapshot verrouillé ne contient pas le détail des cotisations.");
  }

  return details.flatMap((detail): LockedContribution[] => {
    const code = asString(detail.code).trim();
    const label = asString(detail.label).trim();
    const side = detail.side === "EMPLOYEE" ? "EMPLOYEE" : detail.side === "EMPLOYER" ? "EMPLOYER" : null;
    const amount = asNumber(detail.amount);
    const baseAmount = detail.baseAmount === null ? null : asNumber(detail.baseAmount);
    const rate = detail.rate === null ? null : asNumber(detail.rate);

    if (!code || !label || !side || !Number.isFinite(amount)) {
      throw new Error("Génération bloquée : une ligne de cotisation du snapshot est incomplète.");
    }
    if (detail.baseAmount === undefined || detail.rate === undefined) {
      throw new Error(`Génération bloquée : assiette ou taux absent pour la cotisation ${label}.`);
    }
    if (baseAmount !== null && (!Number.isFinite(baseAmount) || baseAmount < 0)) {
      throw new Error(`Génération bloquée : assiette invalide pour la cotisation ${label}.`);
    }
    if (rate !== null && (!Number.isFinite(rate) || rate < 0 || rate > 1)) {
      throw new Error(`Génération bloquée : taux invalide pour la cotisation ${label}.`);
    }
    if (Math.abs(amount) < 0.005) return [];

    return [{
      code,
      label,
      side,
      amount: roundMoney(amount),
      baseAmount: baseAmount === null ? null : roundMoney(baseAmount),
      rate,
      sourceRule: asString(detail.sourceRule),
    }];
  });
}

function reconcileLockedSnapshot(input: {
  snapshot: Snapshot;
  calculation: {
    grossAmount: unknown;
    employeeContributions: unknown;
    employerContributions: unknown;
    netBeforeTax: unknown;
    withholdingTax: unknown;
    netPaid: unknown;
    netTaxableAmount: unknown;
    netSocialAmount: unknown;
  };
}): {
  contributionDetails: LockedContribution[];
  withholdingTaxRate: number;
  modelVersion: string;
  employerCost: number;
} {
  const { snapshot, calculation } = input;
  const gross = Number(calculation.grossAmount);
  const employeeContributions = Number(calculation.employeeContributions);
  const employerContributions = Number(calculation.employerContributions);
  const netBeforeTax = Number(calculation.netBeforeTax);
  const withholdingTax = Number(calculation.withholdingTax);
  const netPaid = Number(calculation.netPaid);
  const netTaxable = Number(calculation.netTaxableAmount);
  const netSocial = Number(calculation.netSocialAmount);

  assertPayrollOutputConsistency({
    grossAmount: gross,
    employeeContributions,
    employerContributions,
    netBeforeTax,
    netTaxableAmount: netTaxable,
    netSocialAmount: netSocial,
    withholdingTax,
    netPaid,
  });

  assertClose("le brut du snapshot", gross, asNumber(snapshot.socialEngine?.grossAmount));
  assertClose("les cotisations salariales du snapshot", employeeContributions, asNumber(snapshot.socialEngine?.employeeContributions));
  assertClose("les cotisations patronales du snapshot", employerContributions, asNumber(snapshot.socialEngine?.employerContributions));
  assertClose("le net imposable du snapshot", netTaxable, asNumber(snapshot.socialEngine?.netTaxableAmount));
  assertClose("le montant net social du snapshot", netSocial, asNumber(snapshot.socialEngine?.netSocialAmount));
  assertClose("le net avant impôt du snapshot", netBeforeTax, asNumber(snapshot.payable?.netBeforeTax));
  assertClose("le PAS du snapshot", withholdingTax, asNumber(snapshot.payable?.withholdingTax));
  assertClose("le PAS historisé", withholdingTax, asNumber(snapshot.withholdingTax?.amount));
  assertClose("le net payé du snapshot", netPaid, asNumber(snapshot.payable?.netPaid));

  const socialNetBeforeTax = asNumber(snapshot.payable?.socialNetBeforeTax);
  const postSocialAdjustment = asNumber(snapshot.payable?.postSocialAdjustment);
  assertClose("la recomposition du net avant impôt", netBeforeTax, roundMoney(socialNetBeforeTax + postSocialAdjustment));

  const contributionDetails = normalizeLockedContributions(snapshot);
  const employeeTotal = roundMoney(
    contributionDetails
      .filter((detail) => detail.side === "EMPLOYEE")
      .reduce((sum, detail) => sum + detail.amount, 0),
  );
  const employerTotal = roundMoney(
    contributionDetails
      .filter((detail) => detail.side === "EMPLOYER")
      .reduce((sum, detail) => sum + detail.amount, 0),
  );
  assertClose("le total des lignes salariales", employeeContributions, employeeTotal);
  assertClose("le total des lignes patronales", employerContributions, employerTotal);

  const withholdingTaxRate = asNumber(snapshot.withholdingTax?.rate);
  if (!Number.isFinite(withholdingTaxRate) || withholdingTaxRate < 0 || withholdingTaxRate > 1) {
    throw new Error("Génération bloquée : le taux de prélèvement à la source du snapshot est invalide.");
  }

  const modelVersion = asString(snapshot.socialEngine?.modelVersion).trim();
  if (!modelVersion) {
    throw new Error("Génération bloquée : la version du moteur social n'est pas historisée dans le snapshot.");
  }

  const lockedEmployerCost = asNumber(snapshot.socialEngine?.employerCost);
  const employerCost = Number.isFinite(lockedEmployerCost)
    ? lockedEmployerCost
    : roundMoney(gross + employerContributions);
  if (!Number.isFinite(employerCost) || employerCost < gross) {
    throw new Error("Génération bloquée : le coût employeur du snapshot est invalide.");
  }

  return { contributionDetails, withholdingTaxRate, modelVersion, employerCost };
}

export async function generatePayslipsFromLockedSnapshotAction(
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
    select: { id: true, year: true, month: true, status: true, paymentDate: true },
  });
  if (!period) return { error: "Période de paie introuvable." };
  if (period.status !== "LOCKED") {
    return { error: "Les bulletins ne peuvent être générés qu'après verrouillage de la période." };
  }
  if (!period.paymentDate) {
    return { error: "La date de paiement doit être renseignée avant de générer les bulletins." };
  }

  const calculations = await prisma.payrollCalculation.findMany({
    where: { organizationId: membership.organizationId, payrollPeriodId: period.id },
    select: {
      id: true,
      employeeId: true,
      calculationSnapshot: true,
      grossAmount: true,
      employeeContributions: true,
      employerContributions: true,
      netBeforeTax: true,
      withholdingTax: true,
      netPaid: true,
      netTaxableAmount: true,
      netSocialAmount: true,
    },
  });
  if (calculations.length === 0) return { error: "Aucun calcul verrouillé n'est disponible pour cette période." };
  if (calculations.some((calculation) => calculation.calculationSnapshot === null)) {
    return { error: "Génération impossible : un calcul verrouillé ne possède pas de snapshot." };
  }

  const employeeIds = calculations.map((calculation) => calculation.employeeId);
  const [organization, employees, profiles, agreements, existingPayslips] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: membership.organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        siret: true,
        collectiveAgreementId: true,
        payrollAddress: true,
        payrollPostalCode: true,
        payrollCity: true,
        payrollNafCode: true,
        payrollUrssafReference: true,
      },
    }),
    prisma.employee.findMany({
      where: { organizationId: membership.organizationId, id: { in: employeeIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        hireDate: true,
        isDemoData: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.payrollProfile.findMany({
      where: { organizationId: membership.organizationId, employeeId: { in: employeeIds } },
      select: {
        id: true,
        employeeId: true,
        monthlyHours: true,
        classificationCode: true,
        classificationLabel: true,
        employeeAddress: true,
        collectiveAgreementId: true,
        baseSalaryCents: true,
        coefficient: true,
        seniorityDate: true,
        effectiveFrom: true,
      },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.collectiveAgreement.findMany({ select: { id: true, name: true, idcc: true } }),
    prisma.payslip.findMany({
      where: { organizationId: membership.organizationId, payrollPeriodId: period.id },
      select: { id: true, employeeId: true, documentStatus: true, storageKey: true },
    }),
  ]);

  if (!organization) return { error: "Organisation introuvable." };
  if (employees.length !== calculations.length) {
    return { error: "Génération impossible : un salarié du calcul verrouillé n'existe plus dans l'organisation." };
  }

  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const latestProfileByEmployee = new Map<string, (typeof profiles)[number]>();
  for (const profile of profiles) {
    if (!latestProfileByEmployee.has(profile.employeeId)) latestProfileByEmployee.set(profile.employeeId, profile);
  }
  const agreementById = new Map(agreements.map((agreement) => [agreement.id, agreement]));
  const payslipByEmployee = new Map(existingPayslips.map((payslip) => [payslip.employeeId, payslip]));
  const periodEnd = new Date(Date.UTC(period.year, period.month, 0, 12, 0, 0, 0));
  const paymentDate = period.paymentDate.toISOString().slice(0, 10);
  const employerAddress = [
    organization.payrollAddress,
    [organization.payrollPostalCode, organization.payrollCity].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  const modelVersions = new Set<string>();

  try {
    for (const calculation of calculations) {
      const employee = employeeById.get(calculation.employeeId);
      if (!employee) throw new Error("Génération impossible : salarié verrouillé introuvable.");

      const snapshot = normalizeSnapshot(calculation.calculationSnapshot);
      const locked = reconcileLockedSnapshot({ snapshot, calculation });
      modelVersions.add(locked.modelVersion);

      const lockedProfileId = asString(snapshot.profile?.id);
      const profile = (lockedProfileId ? profileById.get(lockedProfileId) : undefined) ?? latestProfileByEmployee.get(employee.id);
      if (!profile) {
        return { error: `Données de bulletin incomplètes pour ${employee.firstName} ${employee.lastName}.` };
      }

      const existing = payslipByEmployee.get(employee.id);
      if (!employee.isDemoData && existing?.documentStatus === "GENERATED" && existing.storageKey) {
        try {
          readPayslipDocument(existing.storageKey);
          continue;
        } catch {
          // The stored file is unavailable: rebuild it from the locked snapshot.
        }
      }

      const agreementId =
        asString(snapshot.profile?.collectiveAgreementId) ||
        profile.collectiveAgreementId ||
        organization.collectiveAgreementId ||
        null;
      const agreement = agreementId ? agreementById.get(agreementId) : null;
      const priorCumuls = await resolveLockedAnnualCumuls({
        organizationId: membership.organizationId,
        employeeId: employee.id,
        year: period.year,
        beforeMonth: period.month,
      });
      const annualCumuls = {
        gross: roundMoney(priorCumuls.grossAmount + Number(calculation.grossAmount)),
        netTaxable: roundMoney(priorCumuls.netTaxableAmount + Number(calculation.netTaxableAmount)),
        netSocial: roundMoney(priorCumuls.netSocialAmount + Number(calculation.netSocialAmount)),
        withholdingTax: roundMoney(priorCumuls.withholdingTax + Number(calculation.withholdingTax)),
        netPaid: roundMoney(priorCumuls.netPaid + Number(calculation.netPaid)),
      };

      const snapshotBaseSalaryCents = asNumber(snapshot.profile?.baseSalaryCents);
      const baseGross = Number.isFinite(snapshotBaseSalaryCents) && snapshotBaseSalaryCents >= 0
        ? snapshotBaseSalaryCents / 100
        : (profile.baseSalaryCents ?? Math.round(Number(calculation.grossAmount) * 100)) / 100;
      const classificationLabel = asString(snapshot.profile?.classificationLabel) || profile.classificationLabel;
      const classificationCode = asString(snapshot.profile?.classificationCode) || profile.classificationCode;
      const coefficient = asString(snapshot.profile?.coefficient) || profile.coefficient || undefined;
      const source =
        asString(snapshot.ruleSource?.sourceName).trim() ||
        `Publicodes modèle social ${locked.modelVersion}`;
      const seniorityReference = profile.seniorityDate ?? employee.hireDate;

      const pdf = await generatePayslipPdf({
        employer: {
          name: organization.name,
          address: employerAddress,
          siret: organization.siret ?? "",
          nafCode: organization.payrollNafCode ?? "",
          urssafReference: organization.payrollUrssafReference ?? "",
        },
        employee: {
          name: `${toDisplayName(employee.firstName)} ${toDisplayName(employee.lastName)}`.trim(),
          address: profile.employeeAddress ?? "",
          position: employee.position ?? "",
          classification: toDisplayClassification(classificationLabel, classificationCode),
          ...(coefficient ? { coefficient } : {}),
          hireDate: employee.hireDate.toISOString().slice(0, 10),
          seniority: formatSeniority(seniorityReference, periodEnd),
        },
        period: {
          year: period.year,
          month: period.month,
          paymentDate,
          hours: asNumber(snapshot.profile?.monthlyHours ?? profile.monthlyHours),
        },
        salary: {
          baseGross,
          variables: buildGrossVariableRows(snapshot),
          netAdjustments: buildNetAdjustmentRows(snapshot),
          gross: Number(calculation.grossAmount),
          employeeContributions: Number(calculation.employeeContributions),
          employerContributions: Number(calculation.employerContributions),
          netBeforeTax: Number(calculation.netBeforeTax),
          netTaxable: Number(calculation.netTaxableAmount),
          withholdingTaxRate: locked.withholdingTaxRate,
          withholdingTax: Number(calculation.withholdingTax),
          netPaid: Number(calculation.netPaid),
          netSocial: Number(calculation.netSocialAmount),
          totalEmployerCost: locked.employerCost,
        },
        contributions: locked.contributionDetails,
        collectiveAgreement: agreement ? `${agreement.name} (IDCC ${agreement.idcc})` : "Code du travail",
        source,
        paidLeave: buildPaidLeaveSummary(snapshot),
        annualCumuls,
      });

      const stored = storePayslipDocument(pdf);
      const generatedAt = new Date();
      await prisma.payslip.upsert({
        where: { calculationId: calculation.id },
        create: {
          id: existing?.id ?? randomUUID(),
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
      id: randomUUID(),
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "payroll.payslips.generated",
      entityType: "PayrollPeriod",
      entityId: period.id,
      metadata: {
        year: period.year,
        month: period.month,
        employeeCount: calculations.length,
        source: "LOCKED_CALCULATION_SNAPSHOT",
        socialModelVersions: Array.from(modelVersions).sort(),
      },
    },
  });

  revalidatePath(`/dashboard/payroll/${periodId}`);
  revalidatePath(`/dashboard/payroll/${periodId}/payslips`);
  return undefined;
}
