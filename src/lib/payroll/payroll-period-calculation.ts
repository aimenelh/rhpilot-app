import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { composeGrossAmount, resolvePayrollVariableTreatment } from "./variable-treatment";
import { resolvePayrollRuleSetFromPrisma } from "./payroll-rule-set-prisma";
import { resolveValidatedAbsencePayrollImpacts, resolveValidatedAbsencesForPayrollPeriod } from "./absence-payroll-impact";
import { calculateAbsenceGrossImpact } from "./absence-payroll-gross-impact";
import { resolveCollectiveAgreementAbsenceTreatment } from "./collective-agreement-absence-prisma";
import { resolveCollectiveAgreementFromPrisma } from "./collective-agreement-prisma";
import { evaluateCollectiveMinimumSalary } from "./collective-agreement-rule-engine";
import { buildMinimumSalaryControlSnapshot } from "./minimum-salary-control";
import { resolveSmicMinimumFromPrisma } from "./minimum-wage-prisma";
import { resolveOrganizationLegalCategory } from "./social-organization-context";
import { calculateSocialPayroll } from "./social-engine";
import { buildPayrollLedger, persistPayrollLedger } from "./payroll-ledger-builder";
import { resolveEmployeeWithholdingTaxProfile } from "./withholding-tax-profile";
import { calculateEmployeeWithholdingTax } from "./withholding-tax-validation";
import { resolveApprenticeshipMinimum, resolveProfessionalisationMinimum } from "./alternance-minimum";
import { buildAlternanceMinimumSnapshot, type AlternanceMinimumSnapshot } from "./alternance-minimum-snapshot";
import { calculateAgeAtDate, resolveEmployeeAlternanceProfile } from "./alternance-profile";
import type { PayrollVariableInput } from "./domain";

export type PayrollPeriodCalculationResult = { status: "CALCULATED"; periodId: string; employeeCount: number; ruleVersionId: string };

function periodBounds(year: number, month: number): { start: Date; end: Date; calculationDate: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const calculationDate = new Date(year, month - 1, 1, 12, 0, 0, 0);
  return { start, end, calculationDate };
}

function toVariableInput(variable: { code: string; label: string; amount: unknown; unit: string; source: string }): PayrollVariableInput {
  const amount = Number(variable.amount);
  if (!Number.isFinite(amount)) throw new Error(`Montant invalide pour la variable ${variable.code}.`);
  if (!(variable.unit === "EUR" || variable.unit === "DAYS" || variable.unit === "HOURS" || variable.unit === "PERCENT")) throw new Error(`Unité invalide pour la variable ${variable.code}.`);
  if (!(variable.source === "MANUAL" || variable.source === "IMPORT" || variable.source === "SYSTEM")) throw new Error(`Source invalide pour la variable ${variable.code}.`);
  return { code: variable.code, label: variable.label, amount, unit: variable.unit, source: variable.source };
}

function snapshotForEmployee(input: {
  period: { id: string; year: number; month: number };
  profile: { id: string; baseSalaryCents: number; monthlyHours: string | null; effectiveFrom: string; effectiveUntil: string | null; collectiveAgreementId: string | null; classificationCode: string | null; classificationLabel: string | null; level: string | null; coefficient: string | null };
  variables: Array<{ code: string; label: string; amount: number; unit: string; source: string }>;
  validatedAbsences: Array<{ absenceId: string; type: string; startDate: string; endDate: string; payrollImpactStatus: "READY" }>;
  variableTreatments: Array<{ code: string; ruleVersionId: string; grossDelta: number }>;
  absenceGrossImpacts: Array<{ absenceId: string; absenceType: string; ruleVersionId: string; basis: string; effect: string; absenceDays: number; grossDelta: number; derivedVariableCode: string; derivedVariableLabel: string }>;
  collectiveMinimum: unknown;
  minimumSalaryControl: unknown;
  alternanceMinimum: AlternanceMinimumSnapshot | null;
  ruleSet: { version: string; rules: Array<{ code: string; label: string; side: "EMPLOYEE" | "EMPLOYER"; rate: number; base: "GROSS"; ruleVersionId: string }> };
  ruleSource: { sourceName: string; sourceUrl: string | null; validFrom: Date; validUntil: Date | null };
  withholdingTaxStatus: "RATE_PROVIDED" | "RATE_NOT_PROVIDED";
  withholdingTaxRate: number;
  withholdingTax: number;
  withholdingTaxProfile: { validFrom: Date; validUntil: Date | null; source: string; sourceReference: string | null };
  socialResult: ReturnType<typeof calculateSocialPayroll>;
}): Prisma.InputJsonObject {
  return {
    calculatedAt: new Date().toISOString(), period: { id: input.period.id, year: input.period.year, month: input.period.month },
    profile: { id: input.profile.id, baseSalaryCents: input.profile.baseSalaryCents, monthlyHours: input.profile.monthlyHours, effectiveFrom: input.profile.effectiveFrom, effectiveUntil: input.profile.effectiveUntil, collectiveAgreementId: input.profile.collectiveAgreementId, classificationCode: input.profile.classificationCode, classificationLabel: input.profile.classificationLabel, level: input.profile.level, coefficient: input.profile.coefficient },
    variables: input.variables.map((variable) => ({ code: variable.code, label: variable.label, amount: variable.amount, unit: variable.unit, source: variable.source })),
    validatedAbsences: input.validatedAbsences.map((absence) => ({ absenceId: absence.absenceId, type: absence.type, startDate: absence.startDate, endDate: absence.endDate, payrollImpactStatus: absence.payrollImpactStatus })),
    variableTreatments: input.variableTreatments.map((treatment) => ({ code: treatment.code, ruleVersionId: treatment.ruleVersionId, grossDelta: treatment.grossDelta })),
    absenceGrossImpacts: input.absenceGrossImpacts.map((impact) => ({ absenceId: impact.absenceId, absenceType: impact.absenceType, ruleVersionId: impact.ruleVersionId, basis: impact.basis, effect: impact.effect, absenceDays: impact.absenceDays, grossDelta: impact.grossDelta, derivedVariableCode: impact.derivedVariableCode, derivedVariableLabel: impact.derivedVariableLabel })),
    collectiveMinimum: input.collectiveMinimum as Prisma.InputJsonValue,
    minimumSalaryControl: input.minimumSalaryControl as Prisma.InputJsonValue,
    alternanceMinimum: input.alternanceMinimum as Prisma.InputJsonValue,
    ruleSet: { version: input.ruleSet.version, rules: input.ruleSet.rules.map((rule) => ({ code: rule.code, label: rule.label, side: rule.side, rate: rule.rate, base: rule.base, ruleVersionId: rule.ruleVersionId })) },
    ruleSource: { sourceName: input.ruleSource.sourceName, sourceUrl: input.ruleSource.sourceUrl, validFrom: input.ruleSource.validFrom.toISOString(), validUntil: input.ruleSource.validUntil?.toISOString() ?? null },
    withholdingTax: { status: input.withholdingTaxStatus, rate: input.withholdingTaxRate, amount: input.withholdingTax, validFrom: input.withholdingTaxProfile.validFrom.toISOString(), validUntil: input.withholdingTaxProfile.validUntil?.toISOString() ?? null, source: input.withholdingTaxProfile.source, sourceReference: input.withholdingTaxProfile.sourceReference },
    calculationSource: { engine: "PUBLICODES", modelVersion: input.socialResult.modelVersion, socialTotalsAuthoritative: true },
    socialEngine: { modelVersion: input.socialResult.modelVersion, grossAmount: input.socialResult.grossAmount, employeeContributions: input.socialResult.employeeContributions, employerContributions: input.socialResult.employerContributions, netBeforeTax: input.socialResult.netBeforeTax, netTaxableAmount: input.socialResult.netTaxableAmount, netSocialAmount: input.socialResult.netSocialAmount, employerCost: input.socialResult.employerCost, contributionDetails: input.socialResult.contributionDetails.map((contribution) => ({ code: contribution.code, label: contribution.label, sourceRule: contribution.sourceRule, side: contribution.side, amount: contribution.amount, baseAmount: contribution.baseAmount, rate: contribution.rate })) },
  };
}

export async function calculatePayrollPeriod(input: { periodId: string; organizationId: string; ruleCode: string; ruleScope: string; actorUserId?: string }): Promise<PayrollPeriodCalculationResult> {
  const period = await prisma.payrollPeriod.findFirst({ where: { id: input.periodId, organizationId: input.organizationId }, select: { id: true, year: true, month: true, status: true } });
  if (!period) throw new Error("Période de paie introuvable.");
  if (period.status !== "DRAFT") throw new Error("Seule une période en préparation peut être calculée ou recalculée.");
  if (!input.ruleCode.trim() || !input.ruleScope.trim()) throw new Error("Le code et le périmètre de la règle de paie sont obligatoires.");

  const { start, end, calculationDate } = periodBounds(period.year, period.month);
  const monthlyCalendarDays = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();
  const [employees, profiles, variables, rules, validatedAbsences, socialContext] = await Promise.all([
    prisma.employee.findMany({ where: { organizationId: input.organizationId, deletedAt: null }, select: { id: true, hireDate: true, contractType: true, professionalCategory: true }, orderBy: { id: "asc" } }),
    prisma.payrollProfile.findMany({ where: { organizationId: input.organizationId, effectiveFrom: { lte: end }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: start } }] }, select: { id: true, employeeId: true, baseSalaryCents: true, monthlyHours: true, effectiveFrom: true, effectiveUntil: true, collectiveAgreementId: true, classificationCode: true, classificationLabel: true, level: true, coefficient: true }, orderBy: { effectiveFrom: "desc" } }),
    prisma.payrollVariable.findMany({ where: { organizationId: input.organizationId, payrollPeriodId: period.id }, select: { id: true, employeeId: true, code: true, label: true, amount: true, unit: true, source: true }, orderBy: { createdAt: "asc" } }),
    resolvePayrollRuleSetFromPrisma({ code: input.ruleCode, scope: input.ruleScope, periodDate: calculationDate }),
    resolveValidatedAbsencesForPayrollPeriod({ organizationId: input.organizationId, year: period.year, month: period.month }),
    resolveOrganizationLegalCategory(input.organizationId),
  ]);
  if (rules.status === "UNRESOLVED") throw new Error(rules.message);

  const profileByEmployee = new Map<string, (typeof profiles)[number]>();
  for (const profile of profiles) if (!profileByEmployee.has(profile.employeeId)) profileByEmployee.set(profile.employeeId, profile);
  const variablesByEmployee = new Map<string, typeof variables>();
  for (const variable of variables) { const current = variablesByEmployee.get(variable.employeeId) ?? []; current.push(variable); variablesByEmployee.set(variable.employeeId, current); }
  const absencesByEmployee = new Map<string, typeof validatedAbsences>();
  for (const absence of validatedAbsences) { const current = absencesByEmployee.get(absence.employeeId) ?? []; current.push(absence); absencesByEmployee.set(absence.employeeId, current); }

  type CalculatedProfile = { id: string; employeeId: string; baseSalaryCents: number; monthlyHours: (typeof profiles)[number]["monthlyHours"]; effectiveFrom: Date; effectiveUntil: Date | null; collectiveAgreementId: string | null; classificationCode: string | null; classificationLabel: string | null; level: string | null; coefficient: string | null };
  const calculatedEmployees: Array<{ employeeId: string; socialResult: ReturnType<typeof calculateSocialPayroll>; profile: CalculatedProfile; variables: PayrollVariableInput[]; treatments: ReturnType<typeof resolvePayrollVariableTreatment>[]; validatedAbsences: typeof validatedAbsences; absenceGrossImpacts: Array<{ absenceId: string; absenceType: string; ruleVersionId: string; basis: string; effect: string; absenceDays: number; grossDelta: number; derivedVariableCode: string; derivedVariableLabel: string }>; collectiveMinimum: ReturnType<typeof evaluateCollectiveMinimumSalary>; minimumSalaryControl: ReturnType<typeof buildMinimumSalaryControlSnapshot>; alternanceMinimum: AlternanceMinimumSnapshot | null; withholdingTax: number; withholdingTaxRate: number; withholdingTaxProfile: NonNullable<Awaited<ReturnType<typeof resolveEmployeeWithholdingTaxProfile>>> }> = [];

  for (const employee of employees) {
    const profile = profileByEmployee.get(employee.id);
    if (!profile) throw new Error(`Aucun profil paie applicable pour le salarié ${employee.id}.`);
    if (profile.baseSalaryCents === null) throw new Error(`Le salaire brut mensuel est manquant pour le salarié ${employee.id}.`);
    if (!employee.contractType) throw new Error(`Le type de contrat est manquant pour le salarié ${employee.id}.`);
    if (!employee.professionalCategory) throw new Error(`La catégorie professionnelle est manquante pour le salarié ${employee.id}.`);

    const baseSalaryAmount = profile.baseSalaryCents / 100;
    const executiveStatus = employee.professionalCategory === "CADRE";
    const employeeVariables = (variablesByEmployee.get(employee.id) ?? []).map(toVariableInput);
    const withholdingTaxProfile = await resolveEmployeeWithholdingTaxProfile({ organizationId: input.organizationId, employeeId: employee.id, periodDate: calculationDate });
    if (!withholdingTaxProfile) throw new Error(`Aucun taux de prélèvement à la source valide n'est enregistré pour le salarié ${employee.id}.`);

    const collectiveMinimumResolution = await resolveCollectiveAgreementFromPrisma({ organizationId: input.organizationId, employeeId: employee.id, periodDate: calculationDate, ruleCode: "MINIMUM_GROSS_MONTHLY" });
    let collectiveMinimum: ReturnType<typeof evaluateCollectiveMinimumSalary> = { status: "UNRESOLVED", code: "INVALID_PARAMETERS", message: "Aucune règle de minimum conventionnel exploitable n'a été résolue." };
    if (collectiveMinimumResolution.status === "RESOLVED") {
      collectiveMinimum = evaluateCollectiveMinimumSalary({ monthlyGrossCents: profile.baseSalaryCents, classificationCode: profile.classificationCode, professionalCategory: employee.professionalCategory, contractType: employee.contractType, parameters: collectiveMinimumResolution.rule.parameters });
    } else {
      collectiveMinimum = { status: "UNRESOLVED", code: collectiveMinimumResolution.code, message: collectiveMinimumResolution.message };
    }

    const smicMinimum = await resolveSmicMinimumFromPrisma({ periodDate: calculationDate, scope: socialContext.payrollDepartment === "976" ? "MAYOTTE" : "FRANCE_HORS_MAYOTTE" });
    const smicScope = socialContext.payrollDepartment === "976" ? "MAYOTTE" as const : "FRANCE_HORS_MAYOTTE" as const;
    const minimumSalaryControl = buildMinimumSalaryControlSnapshot({ smic: smicMinimum, collectiveMinimum, monthlyHours: Number(profile.monthlyHours), collectiveRuleVersionId: collectiveMinimumResolution.status === "RESOLVED" ? collectiveMinimumResolution.rule.versionId : undefined, monthlyGrossCents: profile.baseSalaryCents });

    let alternanceMinimum: AlternanceMinimumSnapshot | null = null;
    if (employee.contractType === "APPRENTISSAGE" || employee.contractType === "PROFESSIONNALISATION") {
      const alternanceProfile = await resolveEmployeeAlternanceProfile({ organizationId: input.organizationId, employeeId: employee.id, periodDate: calculationDate });
      if (!alternanceProfile) throw new Error(`Calcul bloqué pour le salarié ${employee.id} : le profil alternance versionné est manquant.`);
      const age = calculateAgeAtDate(alternanceProfile.birthDate, calculationDate);
      const collectiveMinimumCents = collectiveMinimum.status === "APPLICABLE" ? collectiveMinimum.monthlyMinimumCents ?? null : null;
      const result = employee.contractType === "APPRENTISSAGE"
        ? alternanceProfile.contractYear === null
          ? { status: "UNRESOLVED" as const, code: "MISSING_CONTRACT_YEAR", source: "APPRENTISSAGE_LEGAL" as const, explanation: "L'année d'exécution du contrat d'apprentissage est obligatoire." }
          : resolveApprenticeshipMinimum({ age, contractYear: alternanceProfile.contractYear, smicMonthlyCents: smicMinimum.monthlyGrossCentsAt35Hours, collectiveMinimumCents })
        : age >= 26
          ? resolveProfessionalisationMinimum({ age, hasBaccalaureateOrHigher: true, smicMonthlyCents: smicMinimum.monthlyGrossCentsAt35Hours, collectiveMinimumCents })
          : alternanceProfile.hasBaccalaureateOrHigher === null
            ? { status: "UNRESOLVED" as const, code: "MISSING_BACCALAUREATE_LEVEL", source: "PROFESSIONNALISATION_LEGAL" as const, explanation: "Le niveau de qualification est obligatoire pour déterminer le minimum de professionnalisation des moins de 26 ans." }
            : resolveProfessionalisationMinimum({ age, hasBaccalaureateOrHigher: alternanceProfile.hasBaccalaureateOrHigher, smicMonthlyCents: smicMinimum.monthlyGrossCentsAt35Hours, collectiveMinimumCents });
      if (result.status === "UNRESOLVED") throw new Error(`Calcul bloqué pour le salarié ${employee.id} : contrôle du minimum alternance non résolu (${result.code}). ${result.explanation}`);
      const legalMinimumCents = employee.contractType === "PROFESSIONNALISATION" && age >= 26
        ? Math.max(smicMinimum.monthlyGrossCentsAt35Hours, Math.round((collectiveMinimumCents ?? 0) * 0.85))
        : Math.round(smicMinimum.monthlyGrossCentsAt35Hours * (result.percentageOfSmic ?? 0));
      if (profile.baseSalaryCents < (result.monthlyMinimumCents ?? Number.POSITIVE_INFINITY)) throw new Error(`Calcul bloqué pour le salarié ${employee.id} : salaire brut mensuel ${baseSalaryAmount} € inférieur au minimum alternance applicable ${((result.monthlyMinimumCents ?? 0) / 100).toFixed(2)} €.`);
      alternanceMinimum = buildAlternanceMinimumSnapshot({ result, age, contractYear: alternanceProfile.contractYear, hasBaccalaureateOrHigher: alternanceProfile.hasBaccalaureateOrHigher, smicMonthlyCents: smicMinimum.monthlyGrossCentsAt35Hours, smicScope, legalMinimumCents, collectiveMinimumCents, baseSalaryCents: profile.baseSalaryCents, profileValidFrom: alternanceProfile.validFrom, profileValidUntil: alternanceProfile.validUntil, profileSource: alternanceProfile.source, profileSourceReference: alternanceProfile.sourceReference });
    }

    const treatments = employeeVariables.map((variable) => {
      const treatmentRule = rules.variableTreatments.find((rule) => rule.code === variable.code);
      if (!treatmentRule) throw new Error(`Aucune règle de traitement validée n'est disponible pour la variable ${variable.code}.`);
      return resolvePayrollVariableTreatment({ code: variable.code, amount: variable.amount, unit: variable.unit, rule: { code: treatmentRule.code, ruleVersionId: rules.ruleVersionId, grossEffect: treatmentRule.grossEffect, supportedUnits: treatmentRule.supportedUnits } });
    });

    const employeeAbsences = absencesByEmployee.get(employee.id) ?? [];
    const globalAbsenceResolutions = resolveValidatedAbsencePayrollImpacts({ absences: employeeAbsences, rules: rules.absenceTreatments });
    const collectiveAbsenceTreatments = await Promise.all(employeeAbsences.map((absence) => resolveCollectiveAgreementAbsenceTreatment({ organizationId: input.organizationId, employeeId: employee.id, periodDate: calculationDate, absenceType: absence.type, fallbackRuleVersionId: rules.ruleVersionId })));
    const absenceResolutions = employeeAbsences.map((absence, index) => {
      const collectiveTreatment = collectiveAbsenceTreatments[index];
      if (collectiveTreatment) return { status: "RESOLVED" as const, absenceId: absence.absenceId, absenceType: absence.type, calendarDaysInPeriod: absence.calendarDaysInPeriod, ruleVersionId: collectiveTreatment.ruleVersionId, effect: collectiveTreatment.effect, basis: collectiveTreatment.basis, divisor: collectiveTreatment.divisor ?? null, rate: collectiveTreatment.rate ?? null };
      return globalAbsenceResolutions[index];
    });
    const absenceGrossImpacts = absenceResolutions.map((resolution) => {
      if (resolution.status === "RULE_REQUIRED") throw new Error(`Aucune règle de traitement validée n'est disponible pour l'absence ${resolution.absenceType}.`);
      const impact = calculateAbsenceGrossImpact({ baseSalaryAmount, monthlyCalendarDays, absenceDays: resolution.calendarDaysInPeriod, rule: { absenceType: resolution.absenceType, effect: resolution.effect, basis: resolution.basis, ruleVersionId: resolution.ruleVersionId, ...(resolution.divisor !== null ? { divisor: resolution.divisor } : {}), ...(resolution.rate !== null ? { rate: resolution.rate } : {}) } });
      if (impact.status !== "RESOLVED") throw new Error(`La base de calcul de l'absence ${resolution.absenceType} n'est pas encore prise en charge.`);
      return { absenceId: resolution.absenceId, absenceType: resolution.absenceType, ruleVersionId: impact.ruleVersionId, basis: impact.basis, effect: impact.effect, absenceDays: resolution.calendarDaysInPeriod, grossDelta: impact.grossDelta, derivedVariableCode: impact.derivedVariableCode, derivedVariableLabel: impact.derivedVariableLabel };
    });

    const absenceVariableInputs = absenceGrossImpacts.map((impact) => toVariableInput({ code: impact.derivedVariableCode, label: impact.derivedVariableLabel, amount: impact.grossDelta, unit: "EUR", source: "SYSTEM" }));
    const grossTreatments = [...treatments, ...absenceGrossImpacts.map((impact) => ({ code: impact.derivedVariableCode, ruleVersionId: impact.ruleVersionId, grossDelta: impact.grossDelta, kind: "ADD_TO_GROSS" as const }))];
    const grossAmount = composeGrossAmount({ baseSalaryAmount, variableTreatments: grossTreatments });
    const socialResult = calculateSocialPayroll({ grossAmount, legalCategory: socialContext.legalCategory, calculationDate, companyCreationDate: socialContext.companyCreationDate, contractType: employee.contractType, hireDate: employee.hireDate, executiveStatus, healthPlanMonthlyAmount: socialContext.healthPlanMonthlyAmount, healthPlanEmployerRate: socialContext.healthPlanEmployerRate, situation: { "établissement . taux ATMP": `${socialContext.atmpRate}%`, "établissement . commune . nom": `'${socialContext.payrollCity}'`, "établissement . commune . département": `'${socialContext.payrollDepartment}'` } });
    const withholdingTax = calculateEmployeeWithholdingTax(socialResult.netBeforeTax, withholdingTaxProfile, employee.id);
    calculatedEmployees.push({ employeeId: employee.id, socialResult, profile: { id: profile.id, employeeId: profile.employeeId, baseSalaryCents: profile.baseSalaryCents, monthlyHours: profile.monthlyHours, effectiveFrom: profile.effectiveFrom, effectiveUntil: profile.effectiveUntil, collectiveAgreementId: profile.collectiveAgreementId, classificationCode: profile.classificationCode, classificationLabel: profile.classificationLabel, level: profile.level, coefficient: profile.coefficient }, variables: [...employeeVariables, ...absenceVariableInputs], treatments, validatedAbsences: employeeAbsences, absenceGrossImpacts, collectiveMinimum, minimumSalaryControl, alternanceMinimum, withholdingTax, withholdingTaxRate: withholdingTaxProfile.rate, withholdingTaxProfile });
  }

  await prisma.$transaction(async (tx) => {
    for (const calculated of calculatedEmployees) {
      const withholdingTaxRate = calculated.withholdingTaxRate;
      const withholdingTaxStatus = "RATE_PROVIDED" as const;
      const snapshot = snapshotForEmployee({ period: { id: period.id, year: period.year, month: period.month }, profile: { id: calculated.profile.id, baseSalaryCents: calculated.profile.baseSalaryCents, monthlyHours: calculated.profile.monthlyHours === null ? null : String(calculated.profile.monthlyHours), effectiveFrom: calculated.profile.effectiveFrom.toISOString(), effectiveUntil: calculated.profile.effectiveUntil?.toISOString() ?? null, collectiveAgreementId: calculated.profile.collectiveAgreementId, classificationCode: calculated.profile.classificationCode, classificationLabel: calculated.profile.classificationLabel, level: calculated.profile.level, coefficient: calculated.profile.coefficient }, variables: calculated.variables, validatedAbsences: calculated.validatedAbsences.map((absence) => ({ absenceId: absence.absenceId, type: absence.type, startDate: absence.startDate.toISOString(), endDate: absence.endDate.toISOString(), payrollImpactStatus: absence.status })), variableTreatments: calculated.treatments, absenceGrossImpacts: calculated.absenceGrossImpacts, collectiveMinimum: calculated.collectiveMinimum, minimumSalaryControl: calculated.minimumSalaryControl, alternanceMinimum: calculated.alternanceMinimum, ruleSet: rules.ruleSet, ruleSource: rules.source, withholdingTaxStatus, withholdingTaxRate, withholdingTax: calculated.withholdingTax, withholdingTaxProfile: calculated.withholdingTaxProfile, socialResult: calculated.socialResult });
      await tx.payrollCalculation.upsert({ where: { organizationId_payrollPeriodId_employeeId: { organizationId: input.organizationId, payrollPeriodId: period.id, employeeId: calculated.employeeId } }, create: { id: crypto.randomUUID(), organizationId: input.organizationId, payrollPeriodId: period.id, employeeId: calculated.employeeId, ruleSetVersion: rules.ruleVersionId, grossAmount: calculated.socialResult.grossAmount, employeeContributions: calculated.socialResult.employeeContributions, employerContributions: calculated.socialResult.employerContributions, netBeforeTax: calculated.socialResult.netBeforeTax, withholdingTax: calculated.withholdingTax, netPaid: calculated.socialResult.netBeforeTax - calculated.withholdingTax, netTaxableAmount: calculated.socialResult.netTaxableAmount, netSocialAmount: calculated.socialResult.netSocialAmount, calculationSnapshot: snapshot }, update: { ruleSetVersion: rules.ruleVersionId, grossAmount: calculated.socialResult.grossAmount, employeeContributions: calculated.socialResult.employeeContributions, employerContributions: calculated.socialResult.employerContributions, netBeforeTax: calculated.socialResult.netBeforeTax, withholdingTax: calculated.withholdingTax, netPaid: calculated.socialResult.netBeforeTax - calculated.withholdingTax, netTaxableAmount: calculated.socialResult.netTaxableAmount, netSocialAmount: calculated.socialResult.netSocialAmount, calculationSnapshot: snapshot } });
      const calculation = await tx.payrollCalculation.findUniqueOrThrow({ where: { organizationId_payrollPeriodId_employeeId: { organizationId: input.organizationId, payrollPeriodId: period.id, employeeId: calculated.employeeId } }, select: { id: true } });
      await tx.payrollContribution.deleteMany({ where: { calculationId: calculation.id } });
      for (const contribution of calculated.socialResult.contributionDetails) {
        await tx.payrollContribution.create({ data: { id: crypto.randomUUID(), calculationId: calculation.id, code: contribution.code, label: contribution.label, side: contribution.side, baseAmount: contribution.baseAmount ?? calculated.socialResult.grossAmount, rate: contribution.rate ?? 0, amount: contribution.amount, ruleVersionId: rules.ruleVersionId } });
      }
      const ledgerEntries = buildPayrollLedger({ baseSalaryAmount: calculated.profile.baseSalaryCents / 100, ruleVersionId: rules.ruleVersionId, sourceName: rules.source.sourceName, sourceUrl: rules.source.sourceUrl, variables: calculated.treatments.map((treatment, index) => ({ code: calculated.variables[index]?.code ?? treatment.code, label: calculated.variables[index]?.label ?? treatment.code, amount: Math.abs(treatment.grossDelta), grossDelta: treatment.grossDelta, kind: treatment.kind, ruleVersionId: treatment.ruleVersionId })), absences: calculated.absenceGrossImpacts.map((impact) => ({ absenceId: impact.absenceId, absenceType: impact.absenceType, label: impact.derivedVariableLabel, grossDelta: impact.grossDelta, kind: impact.effect === "DEDUCT_FROM_GROSS" ? "DEDUCT_FROM_GROSS" : "ADD_TO_GROSS", ruleVersionId: impact.ruleVersionId })), socialResult: calculated.socialResult, withholdingTax: calculated.withholdingTax, withholdingTaxRateProvided: true, minimumSalaryControl: calculated.minimumSalaryControl });
      await persistPayrollLedger(tx, calculation.id, ledgerEntries);
    }
    await tx.payrollPeriod.update({ where: { id: period.id }, data: { status: "CALCULATED", calculatedAt: new Date() } });
  });

  return { status: "CALCULATED", periodId: period.id, employeeCount: calculatedEmployees.length, ruleVersionId: rules.ruleVersionId };
}
