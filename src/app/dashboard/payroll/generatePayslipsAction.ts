"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateSocialPayroll, SOCIAL_MODEL_VERSION } from "@/lib/payroll/social-engine";
import { resolveOrganizationLegalCategory } from "@/lib/payroll/social-organization-context";
import { resolveEmployeeWithholdingTaxProfile } from "@/lib/payroll/withholding-tax-profile";
import { calculateEmployeeWithholdingTax } from "@/lib/payroll/withholding-tax-validation";
import { generatePayslipPdf, PayslipPdfPrerequisiteError } from "@/lib/payroll/payslip-pdf";
import { readPayslipDocument, storePayslipDocument } from "@/lib/payroll/payslip-storage";
import { resolveApprenticeshipMinimum, resolveProfessionalisationMinimum } from "@/lib/payroll/alternance-minimum";
import { calculateAgeAtDate, resolveEmployeeAlternanceProfile } from "@/lib/payroll/alternance-profile";
import { resolveSmicMinimumFromPrisma } from "@/lib/payroll/minimum-wage-prisma";
import { resolveCollectiveAgreementFromPrisma } from "@/lib/payroll/collective-agreement-prisma";
import { evaluateCollectiveMinimumSalary } from "@/lib/payroll/collective-agreement-rule-engine";

export type PayrollPayslipGenerationFormState = { error: string } | undefined;

type Snapshot = {
  profile?: { monthlyHours?: unknown; classificationLabel?: unknown; classificationCode?: unknown; collectiveAgreementId?: unknown; baseSalaryCents?: unknown };
  variables?: Array<{ label?: unknown; amount?: unknown }>;
  ruleSource?: { sourceName?: unknown };
  alternanceMinimum?: {
    status?: unknown;
    source?: unknown;
    code?: unknown;
    explanation?: unknown;
    age?: unknown;
    contractYear?: unknown;
    hasBaccalaureateOrHigher?: unknown;
    smicMonthlyCents?: unknown;
    smicScope?: unknown;
    legalMinimumCents?: unknown;
    collectiveMinimumCents?: unknown;
    applicableMinimumCents?: unknown;
    percentageOfSmic?: unknown;
    baseSalaryCents?: unknown;
    profileValidFrom?: unknown;
    profileValidUntil?: unknown;
    profileSource?: unknown;
    profileSourceReference?: unknown;
  };
  withholdingTax?: { status?: unknown; rate?: unknown; amount?: unknown; validFrom?: unknown; validUntil?: unknown; source?: unknown; sourceReference?: unknown };
  socialEngine?: { modelVersion?: unknown; contributionDetails?: Array<{ code?: unknown; label?: unknown; sourceRule?: unknown; side?: unknown; amount?: unknown; baseAmount?: unknown; rate?: unknown }> };
  result?: { netSocialAmount?: unknown };
};

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function asString(value: unknown): string { return typeof value === "string" ? value : ""; }
function asNumber(value: unknown): number { if (typeof value === "number" && Number.isFinite(value)) return value; if (typeof value === "string" && value.trim() !== "") return Number(value); return Number(value); }
function normalizeSnapshot(value: unknown): Snapshot { return isRecord(value) ? (value as Snapshot) : {}; }

function assertClose(label: string, expected: number, actual: number): void {
  if (!Number.isFinite(expected) || !Number.isFinite(actual) || Math.abs(expected - actual) > 0.01) throw new Error(`Génération bloquée : le ${label} du bulletin ne correspond plus au calcul verrouillé.`);
}

type PayslipContributionDetail = {
  code: string;
  label: string;
  side: "EMPLOYEE" | "EMPLOYER";
  amount: number;
  baseAmount: number | null;
  rate: number | null;
  sourceRule: string;
};

function normalizeContributionDetails(snapshot: Snapshot): PayslipContributionDetail[] {
  if (!Array.isArray(snapshot.socialEngine?.contributionDetails)) return [];
  return snapshot.socialEngine.contributionDetails.flatMap((contribution): PayslipContributionDetail[] => {
    const code = asString(contribution.code).trim();
    const side: PayslipContributionDetail["side"] | null = contribution.side === "EMPLOYER" ? "EMPLOYER" : contribution.side === "EMPLOYEE" ? "EMPLOYEE" : null;
    const label = asString(contribution.label).trim();
    const amount = asNumber(contribution.amount);
    if (!code || !side || !label || !Number.isFinite(amount) || amount === 0) return [];
    const rawRate = contribution.rate;
    const rate = rawRate === null ? null : asNumber(rawRate);
    const rawBaseAmount = contribution.baseAmount;
    const baseAmount = rawBaseAmount === null ? null : asNumber(rawBaseAmount);
    if (rawRate === undefined || rawBaseAmount === undefined) return [];
    if ((rate !== null && !Number.isFinite(rate)) || (baseAmount !== null && !Number.isFinite(baseAmount))) return [];
    return [{ code, label, side, amount, baseAmount, rate, sourceRule: asString(contribution.sourceRule) }];
  });
}

function assertContributionDetailsMatch(snapshot: Snapshot, current: ReturnType<typeof calculateSocialPayroll>["contributionDetails"]): void {
  const locked = normalizeContributionDetails(snapshot);
  if (locked.length !== current.length) throw new Error("Génération bloquée : le détail des cotisations du calcul verrouillé ne correspond pas au modèle social actuel.");
  const byCode = new Map(locked.map((detail) => [detail.code, detail]));
  for (const detail of current) {
    const expected = byCode.get(detail.code);
    if (!expected) throw new Error(`Génération bloquée : la cotisation ${detail.label} n'existe pas dans le calcul verrouillé.`);
    if (expected.side !== detail.side) throw new Error(`Génération bloquée : le côté de cotisation ${detail.label} ne correspond plus au calcul verrouillé.`);
    if (expected.label !== detail.label) throw new Error(`Génération bloquée : le libellé de cotisation ${detail.label} ne correspond plus au calcul verrouillé.`);
    if (expected.sourceRule !== detail.sourceRule) throw new Error(`Génération bloquée : la règle source de cotisation ${detail.label} ne correspond plus au calcul verrouillé.`);
    assertClose(`montant de cotisation ${detail.label}`, expected.amount, detail.amount);
    if (expected.baseAmount === null ? detail.baseAmount !== null : Math.abs(expected.baseAmount - (detail.baseAmount ?? Number.NaN)) > 0.01) throw new Error(`Génération bloquée : l'assiette de cotisation ${detail.label} ne correspond plus au calcul verrouillé.`);
    if (expected.rate === null ? detail.rate !== null : Math.abs(expected.rate - (detail.rate ?? Number.NaN)) > 0.0001) throw new Error(`Génération bloquée : le taux de cotisation ${detail.label} ne correspond plus au calcul verrouillé.`);
  }
}

function assertAlternanceSnapshotMatchesCurrent(input: {
  snapshot: Snapshot;
  contractType: string;
  professionalCategory: string;
  organizationId: string;
  employeeId: string;
  periodDate: Date;
  payrollDepartment: string | null;
}): Promise<void> {
  return (async () => {
    const isAlternance = input.contractType === "APPRENTISSAGE" || input.contractType === "PROFESSIONNALISATION";
    if (!isAlternance) {
      if (input.snapshot.alternanceMinimum) throw new Error("Génération bloquée : un contrôle alternance est présent dans le calcul verrouillé alors que le contrat actuel n'est plus en alternance.");
      return;
    }

    const locked = input.snapshot.alternanceMinimum;
    if (!locked || locked.status !== "APPLICABLE") throw new Error("Génération bloquée : le calcul verrouillé ne contient pas de contrôle alternance applicable.");

    const alternanceProfile = await resolveEmployeeAlternanceProfile({ organizationId: input.organizationId, employeeId: input.employeeId, periodDate: input.periodDate });
    if (!alternanceProfile) throw new Error("Génération bloquée : le profil alternance applicable n'est plus disponible.");

    const lockedValidFrom = asString(locked.profileValidFrom);
    const lockedValidUntil = locked.profileValidUntil === null ? null : asString(locked.profileValidUntil);
    if (lockedValidFrom !== alternanceProfile.validFrom.toISOString() || lockedValidUntil !== alternanceProfile.validUntil?.toISOString() ?? null || asString(locked.profileSource) !== alternanceProfile.source || (locked.profileSourceReference === null ? null : asString(locked.profileSourceReference)) !== alternanceProfile.sourceReference) {
      throw new Error("Génération bloquée : le profil alternance applicable a changé depuis le calcul verrouillé.");
    }

    const smicScope = input.payrollDepartment?.trim() === "976" ? "MAYOTTE" as const : "FRANCE_HORS_MAYOTTE" as const;
    const smic = await resolveSmicMinimumFromPrisma({ periodDate: input.periodDate, scope: smicScope });
    const lockedSmic = asNumber(locked.smicMonthlyCents);
    if (locked.smicScope !== smicScope || Math.abs(lockedSmic - smic.monthlyGrossCentsAt35Hours) > 0.001) throw new Error("Génération bloquée : le SMIC applicable au contrôle alternance a changé depuis le calcul verrouillé.");

    const collectiveResolution = await resolveCollectiveAgreementFromPrisma({ organizationId: input.organizationId, employeeId: input.employeeId, periodDate: input.periodDate, ruleCode: "MINIMUM_GROSS_MONTHLY" });
    let collectiveMinimumCents: number | null = null;
    if (collectiveResolution.status === "RESOLVED") {
      const collective = evaluateCollectiveMinimumSalary({ monthlyGrossCents: asNumber(locked.baseSalaryCents), classificationCode: asString(input.snapshot.profile?.classificationCode) || null, professionalCategory: input.professionalCategory, contractType: input.contractType, parameters: collectiveResolution.rule.parameters });
      if (collective.status === "APPLICABLE") collectiveMinimumCents = collective.monthlyMinimumCents;
    }

    const age = calculateAgeAtDate(alternanceProfile.birthDate, input.periodDate);
    const result = input.contractType === "APPRENTISSAGE"
      ? alternanceProfile.contractYear === null
        ? { status: "UNRESOLVED" as const, code: "MISSING_CONTRACT_YEAR", source: "APPRENTISSAGE_LEGAL" as const, explanation: "L'année d'exécution du contrat d'apprentissage est obligatoire." }
        : resolveApprenticeshipMinimum({ age, contractYear: alternanceProfile.contractYear, smicMonthlyCents: smic.monthlyGrossCentsAt35Hours, collectiveMinimumCents })
      : age >= 26
        ? resolveProfessionalisationMinimum({ age, hasBaccalaureateOrHigher: true, smicMonthlyCents: smic.monthlyGrossCentsAt35Hours, collectiveMinimumCents })
        : alternanceProfile.hasBaccalaureateOrHigher === null
          ? { status: "UNRESOLVED" as const, code: "MISSING_BACCALAUREATE_LEVEL", source: "PROFESSIONNALISATION_LEGAL" as const, explanation: "Le niveau de qualification est obligatoire pour déterminer le minimum de professionnalisation des moins de 26 ans." }
          : resolveProfessionalisationMinimum({ age, hasBaccalaureateOrHigher: alternanceProfile.hasBaccalaureateOrHigher, smicMonthlyCents: smic.monthlyGrossCentsAt35Hours, collectiveMinimumCents });
    if (result.status === "UNRESOLVED") throw new Error(`Génération bloquée : le contrôle du minimum alternance n'est plus résolu (${result.code}).`);

    const lockedContractYear = locked.contractYear === null ? null : asNumber(locked.contractYear);
    const lockedBac = locked.hasBaccalaureateOrHigher === null ? null : locked.hasBaccalaureateOrHigher === true;
    if (locked.age !== age || lockedContractYear !== alternanceProfile.contractYear || lockedBac !== alternanceProfile.hasBaccalaureateOrHigher) throw new Error("Génération bloquée : les données du salarié utilisées pour le contrôle alternance ont changé depuis le calcul verrouillé.");
    if (asNumber(locked.legalMinimumCents) !== (input.contractType === "PROFESSIONNALISATION" && age >= 26 ? Math.max(smic.monthlyGrossCentsAt35Hours, Math.round((collectiveMinimumCents ?? 0) * 0.85)) : Math.round(smic.monthlyGrossCentsAt35Hours * (result.percentageOfSmic ?? 0)))) throw new Error("Génération bloquée : le minimum légal alternance ne correspond plus au contrôle verrouillé.");
    if (asNumber(locked.collectiveMinimumCents) !== (collectiveMinimumCents ?? 0)) throw new Error("Génération bloquée : le minimum conventionnel alternance a changé depuis le calcul verrouillé.");
    if (asNumber(locked.applicableMinimumCents) !== (result.monthlyMinimumCents ?? 0)) throw new Error("Génération bloquée : le minimum alternance applicable a changé depuis le calcul verrouillé.");
    if (asNumber(locked.baseSalaryCents) !== asNumber(input.snapshot.profile?.baseSalaryCents)) throw new Error("Génération bloquée : le salaire de référence du contrôle alternance est incohérent dans le calcul verrouillé.");
  })();
}

export async function generatePayrollPayslipsAction(_prevState: PayrollPayslipGenerationFormState, formData: FormData): Promise<PayrollPayslipGenerationFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return { error: "Seuls les administrateurs peuvent générer les bulletins de paie." };

  const periodId = String(formData.get("periodId") ?? "").trim();
  if (!periodId) return { error: "La période de paie est obligatoire." };
  const period = await prisma.payrollPeriod.findFirst({ where: { id: periodId, organizationId: membership.organizationId }, select: { id: true, year: true, month: true, status: true, paymentDate: true } });
  if (!period) return { error: "Période de paie introuvable." };
  if (period.status !== "LOCKED") return { error: "Les bulletins ne peuvent être générés qu'après verrouillage de la période." };

  const [organization, employees, calculations, profiles, agreements, socialContext] = await Promise.all([
    prisma.organization.findFirst({ where: { id: membership.organizationId, deletedAt: null }, select: { id: true, name: true, siret: true, conventionCollective: true, collectiveAgreementId: true, payrollAddress: true, payrollPostalCode: true, payrollCity: true, payrollNafCode: true, payrollUrssafReference: true } }),
    prisma.employee.findMany({ where: { organizationId: membership.organizationId, deletedAt: null }, select: { id: true, firstName: true, lastName: true, position: true, hireDate: true, contractType: true, professionalCategory: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    prisma.payrollCalculation.findMany({ where: { organizationId: membership.organizationId, payrollPeriodId: period.id }, select: { id: true, employeeId: true, calculationSnapshot: true, grossAmount: true, employeeContributions: true, employerContributions: true, netBeforeTax: true, withholdingTax: true, netPaid: true, netTaxableAmount: true, netSocialAmount: true } }),
    prisma.payrollProfile.findMany({ where: { organizationId: membership.organizationId }, select: { employeeId: true, monthlyHours: true, classificationCode: true, classificationLabel: true, employeeAddress: true, collectiveAgreementId: true, baseSalaryCents: true }, orderBy: { effectiveFrom: "desc" } }),
    prisma.collectiveAgreement.findMany({ select: { id: true, name: true, idcc: true } }),
    resolveOrganizationLegalCategory(membership.organizationId),
  ]);

  if (!organization) return { error: "Organisation introuvable." };
  if (employees.length === 0) return { error: "Aucun salarié actif n'est disponible pour cette période." };
  if (calculations.length !== employees.length) return { error: `Génération impossible : ${calculations.length}/${employees.length} calculs verrouillés disponibles.` };
  if (calculations.some((calculation) => calculation.calculationSnapshot === null)) return { error: "Génération impossible : un calcul verrouillé ne possède pas de snapshot." };

  const profileByEmployee = new Map<string, (typeof profiles)[number]>();
  for (const profile of profiles) if (!profileByEmployee.has(profile.employeeId)) profileByEmployee.set(profile.employeeId, profile);
  const calculationByEmployee = new Map(calculations.map((calculation) => [calculation.employeeId, calculation]));
  const agreementById = new Map(agreements.map((agreement) => [agreement.id, agreement]));
  const existingPayslips = await prisma.payslip.findMany({ where: { organizationId: membership.organizationId, payrollPeriodId: period.id }, select: { id: true, employeeId: true, documentStatus: true, storageKey: true } });
  const payslipByEmployee = new Map(existingPayslips.map((payslip) => [payslip.employeeId, payslip]));

  try {
    for (const employee of employees) {
      const calculation = calculationByEmployee.get(employee.id);
      const profile = profileByEmployee.get(employee.id);
      if (!calculation || !profile) return { error: `Données de bulletin incomplètes pour ${employee.firstName} ${employee.lastName}.` };

      const existing = payslipByEmployee.get(employee.id);
      if (existing?.documentStatus === "GENERATED" && existing.storageKey) {
        try {
          readPayslipDocument(existing.storageKey);
          continue;
        } catch {
          // Le document est corrompu ou incompatible : il sera régénéré depuis le calcul verrouillé.
        }
      }
      if (!employee.contractType || !employee.professionalCategory) return { error: `Données sociales incomplètes pour ${employee.firstName} ${employee.lastName}.` };

      const snapshot = normalizeSnapshot(calculation.calculationSnapshot);
      const snapshotModelVersion = asString(snapshot.socialEngine?.modelVersion);
      if (snapshotModelVersion !== SOCIAL_MODEL_VERSION) return { error: `Génération bloquée pour ${employee.firstName} ${employee.lastName} : le modèle social du calcul verrouillé (${snapshotModelVersion || "inconnu"}) n'est plus celui utilisé pour produire le bulletin.` };

      const periodDate = new Date(Date.UTC(period.year, period.month - 1, 1, 12, 0, 0, 0));
      await assertAlternanceSnapshotMatchesCurrent({ snapshot, contractType: employee.contractType, professionalCategory: employee.professionalCategory, organizationId: membership.organizationId, employeeId: employee.id, periodDate, payrollDepartment: socialContext.payrollDepartment });

      const withholdingTaxProfile = await resolveEmployeeWithholdingTaxProfile({ organizationId: membership.organizationId, employeeId: employee.id, periodDate });
      if (!withholdingTaxProfile) return { error: `Génération bloquée pour ${employee.firstName} ${employee.lastName} : aucun taux de prélèvement à la source salarié valide n'est disponible pour ${period.month}/${period.year}.` };
      const expectedWithholdingTax = calculateEmployeeWithholdingTax(Number(calculation.netBeforeTax), withholdingTaxProfile, employee.id);
      assertClose("prélèvement à la source", expectedWithholdingTax, Number(calculation.withholdingTax));
      const snapshotRate = asNumber(snapshot.withholdingTax?.rate);
      assertClose("taux de prélèvement à la source", withholdingTaxProfile.rate, snapshotRate);
      const snapshotTax = asNumber(snapshot.withholdingTax?.amount);
      assertClose("montant du prélèvement à la source snapshot", expectedWithholdingTax, snapshotTax);

      const socialResult = calculateSocialPayroll({
        grossAmount: Number(calculation.grossAmount),
        legalCategory: socialContext.legalCategory,
        calculationDate: periodDate,
        companyCreationDate: socialContext.companyCreationDate,
        contractType: employee.contractType,
        hireDate: employee.hireDate,
        executiveStatus: employee.professionalCategory === "CADRE",
        healthPlanMonthlyAmount: socialContext.healthPlanMonthlyAmount,
        healthPlanEmployerRate: socialContext.healthPlanEmployerRate,
        situation: { "établissement . taux ATMP": `${socialContext.atmpRate}%`, "établissement . commune . nom": `'${socialContext.payrollCity}'`, "établissement . commune . département": `'${socialContext.payrollDepartment}'` },
      });
      assertClose("brut", Number(calculation.grossAmount), socialResult.grossAmount);
      assertClose("total des cotisations salariales", Number(calculation.employeeContributions), socialResult.employeeContributions);
      assertClose("total des cotisations patronales", Number(calculation.employerContributions), socialResult.employerContributions);
      assertClose("net avant impôt", Number(calculation.netBeforeTax), socialResult.netBeforeTax);
      assertClose("net imposable", Number(calculation.netTaxableAmount), socialResult.netTaxableAmount);
      assertClose("montant net social", Number(calculation.netSocialAmount), socialResult.netSocialAmount);
      assertContributionDetailsMatch(snapshot, socialResult.contributionDetails);

      const agreementId = asString(snapshot.profile?.collectiveAgreementId) || profile.collectiveAgreementId || organization.collectiveAgreementId || null;
      const agreement = agreementId ? agreementById.get(agreementId) : null;
      const contributionDetails = normalizeContributionDetails(snapshot);
      if (contributionDetails.length !== socialResult.contributionDetails.length) return { error: `Génération bloquée pour ${employee.firstName} ${employee.lastName} : le détail des cotisations verrouillé est incomplet.` };
      const employerAddress = [organization.payrollAddress, [organization.payrollPostalCode, organization.payrollCity].filter(Boolean).join(" ")].filter(Boolean).join(", ");
      const paymentDate = period.paymentDate ? period.paymentDate.toISOString().slice(0, 10) : "";
      const withholdingTaxRate = withholdingTaxProfile.rate;
      const source = asString(snapshot.ruleSource?.sourceName).trim() || `Publicodes modèle social ${SOCIAL_MODEL_VERSION}`;

      const pdf = generatePayslipPdf({
        employer: { name: organization.name, address: employerAddress, siret: organization.siret ?? "", nafCode: organization.payrollNafCode ?? "", urssafReference: organization.payrollUrssafReference ?? "" },
        employee: { name: `${employee.firstName} ${employee.lastName}`.trim(), address: profile.employeeAddress ?? "", position: employee.position ?? "", classification: profile.classificationLabel || profile.classificationCode || "" },
        period: { year: period.year, month: period.month, paymentDate, hours: asNumber(snapshot.profile?.monthlyHours ?? profile.monthlyHours) },
        salary: {
          baseGross: profile.baseSalaryCents === null || profile.baseSalaryCents === undefined ? Number(calculation.grossAmount) : profile.baseSalaryCents / 100,
          variables: Array.isArray(snapshot.variables) ? snapshot.variables.map((variable) => ({ label: asString(variable.label), amount: asNumber(variable.amount) })) : [],
          gross: Number(calculation.grossAmount),
          employeeContributions: Number(calculation.employeeContributions),
          employerContributions: Number(calculation.employerContributions),
          netBeforeTax: Number(calculation.netBeforeTax),
          netTaxable: Number(calculation.netTaxableAmount),
          withholdingTaxRate,
          withholdingTax: Number(calculation.withholdingTax),
          netPaid: Number(calculation.netPaid),
          netSocial: Number(calculation.netSocialAmount),
          totalEmployerCost: Number(calculation.grossAmount) + Number(calculation.employerContributions),
        },
        contributions: contributionDetails,
        collectiveAgreement: agreement ? `${agreement.name} (IDCC ${agreement.idcc})` : "Code du travail",
        source,
      });

      const stored = storePayslipDocument(pdf);
      const generatedAt = new Date();
      await prisma.payslip.upsert({
        where: { calculationId: calculation.id },
        create: { id: existing?.id ?? randomUUID(), organizationId: membership.organizationId, payrollPeriodId: period.id, employeeId: employee.id, calculationId: calculation.id, documentStatus: "GENERATED", storageKey: stored.storageKey, generatedAt },
        update: { documentStatus: "GENERATED", storageKey: stored.storageKey, generatedAt },
      });
    }
  } catch (error) {
    if (error instanceof PayslipPdfPrerequisiteError) return { error: `Génération bloquée. Données manquantes : ${error.missing.join(", ")}.` };
    return { error: error instanceof Error ? error.message : "La génération des bulletins a échoué." };
  }

  await prisma.auditLog.create({ data: { id: randomUUID(), organizationId: membership.organizationId, actorUserId: user.id, action: "payroll.payslips.generated", entityType: "PayrollPeriod", entityId: period.id, metadata: { year: period.year, month: period.month, employeeCount: employees.length, socialModelVersion: SOCIAL_MODEL_VERSION } } });
  revalidatePath(`/dashboard/payroll/${periodId}`);
  revalidatePath(`/dashboard/payroll/${periodId}/payslips`);
  return undefined;
}
