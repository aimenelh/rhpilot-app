import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculatePayroll } from "./engine";
import { composeGrossAmount, resolvePayrollVariableTreatment } from "./variable-treatment";
import { resolvePayrollRuleSetFromPrisma } from "./payroll-rule-set-prisma";
import { resolveValidatedAbsencePayrollImpacts, resolveValidatedAbsencesForPayrollPeriod } from "./absence-payroll-impact";
import { calculateAbsenceGrossImpact } from "./absence-payroll-gross-impact";
import { resolveOrganizationLegalCategory } from "./social-organization-context";
import { calculateSocialPayroll } from "./social-engine";
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
  ruleSet: { version: string; rules: Array<{ code: string; label: string; side: "EMPLOYEE" | "EMPLOYER"; rate: number; base: "GROSS"; ruleVersionId: string }> };
  ruleSource: { sourceName: string; sourceUrl: string | null; validFrom: Date; validUntil: Date | null };
  result: ReturnType<typeof calculatePayroll>;
}): Prisma.InputJsonObject {
  return {
    calculatedAt: new Date().toISOString(), period: { id: input.period.id, year: input.period.year, month: input.period.month },
    profile: { id: input.profile.id, baseSalaryCents: input.profile.baseSalaryCents, monthlyHours: input.profile.monthlyHours, effectiveFrom: input.profile.effectiveFrom, effectiveUntil: input.profile.effectiveUntil, collectiveAgreementId: input.profile.collectiveAgreementId, classificationCode: input.profile.classificationCode, classificationLabel: input.profile.classificationLabel, level: input.profile.level, coefficient: input.profile.coefficient },
    variables: input.variables.map((variable) => ({ code: variable.code, label: variable.label, amount: variable.amount, unit: variable.unit, source: variable.source })),
    validatedAbsences: input.validatedAbsences.map((absence) => ({ absenceId: absence.absenceId, type: absence.type, startDate: absence.startDate, endDate: absence.endDate, payrollImpactStatus: absence.payrollImpactStatus })),
    variableTreatments: input.variableTreatments.map((treatment) => ({ code: treatment.code, ruleVersionId: treatment.ruleVersionId, grossDelta: treatment.grossDelta })),
    absenceGrossImpacts: input.absenceGrossImpacts.map((impact) => ({ absenceId: impact.absenceId, absenceType: impact.absenceType, ruleVersionId: impact.ruleVersionId, basis: impact.basis, effect: impact.effect, absenceDays: impact.absenceDays, grossDelta: impact.grossDelta, derivedVariableCode: impact.derivedVariableCode, derivedVariableLabel: impact.derivedVariableLabel })),
    ruleSet: { version: input.ruleSet.version, rules: input.ruleSet.rules.map((rule) => ({ code: rule.code, label: rule.label, side: rule.side, rate: rule.rate, base: rule.base, ruleVersionId: rule.ruleVersionId })) },
    ruleSource: { sourceName: input.ruleSource.sourceName, sourceUrl: input.ruleSource.sourceUrl, validFrom: input.ruleSource.validFrom.toISOString(), validUntil: input.ruleSource.validUntil?.toISOString() ?? null },
    result: { ruleSetVersion: input.result.ruleSetVersion, grossAmount: input.result.grossAmount, employeeContributions: input.result.employeeContributions, employerContributions: input.result.employerContributions, netBeforeTax: input.result.netBeforeTax, withholdingTax: input.result.withholdingTax, netPaid: input.result.netPaid, contributions: input.result.contributions.map((contribution) => ({ code: contribution.code, label: contribution.label, side: contribution.side, baseAmount: contribution.baseAmount, rate: contribution.rate, amount: contribution.amount, ruleVersionId: contribution.ruleVersionId })), variables: input.result.variables.map((variable) => ({ code: variable.code, label: variable.label, amount: variable.amount, unit: variable.unit, source: variable.source })) },
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
  const calculatedEmployees: Array<{ employeeId: string; result: ReturnType<typeof calculatePayroll>; profile: CalculatedProfile; variables: PayrollVariableInput[]; treatments: ReturnType<typeof resolvePayrollVariableTreatment>[]; validatedAbsences: typeof validatedAbsences; absenceGrossImpacts: Array<{ absenceId: string; absenceType: string; ruleVersionId: string; basis: string; effect: string; absenceDays: number; grossDelta: number; derivedVariableCode: string; derivedVariableLabel: string }> }> = [];

  for (const employee of employees) {
    const profile = profileByEmployee.get(employee.id);
    if (!profile) throw new Error(`Aucun profil paie applicable pour le salarié ${employee.id}.`);
    if (profile.baseSalaryCents === null) throw new Error(`Le salaire brut mensuel est manquant pour le salarié ${employee.id}.`);
    if (!employee.contractType) throw new Error(`Le type de contrat est manquant pour le salarié ${employee.id}.`);
    if (!employee.professionalCategory) throw new Error(`La catégorie professionnelle est manquante pour le salarié ${employee.id}.`);
    const baseSalaryAmount = profile.baseSalaryCents / 100;
    const executiveStatus = employee.professionalCategory === "CADRE";
    const employeeVariables = (variablesByEmployee.get(employee.id) ?? []).map(toVariableInput);
    const treatments = employeeVariables.map((variable) => { const treatmentRule = rules.variableTreatments.find((rule) => rule.code === variable.code); if (!treatmentRule) throw new Error(`Aucune règle de traitement validée n'est disponible pour la variable ${variable.code}.`); return resolvePayrollVariableTreatment({ code: variable.code, amount: variable.amount, unit: variable.unit, rule: { code: treatmentRule.code, ruleVersionId: rules.ruleVersionId, grossEffect: treatmentRule.grossEffect, supportedUnits: treatmentRule.supportedUnits } }); });
    const employeeAbsences = absencesByEmployee.get(employee.id) ?? [];
    const absenceResolutions = resolveValidatedAbsencePayrollImpacts({ absences: employeeAbsences, rules: rules.absenceTreatments });
    const absenceGrossImpacts = absenceResolutions.map((resolution) => { if (resolution.status === "RULE_REQUIRED") throw new Error(`Aucune règle de traitement validée n'est disponible pour l'absence ${resolution.absenceType}.`); const impact = calculateAbsenceGrossImpact({ baseSalaryAmount, monthlyCalendarDays, absenceDays: resolution.calendarDaysInPeriod, rule: { absenceType: resolution.absenceType, effect: resolution.effect, basis: resolution.basis, ruleVersionId: resolution.ruleVersionId, ...(resolution.divisor !== null ? { divisor: resolution.divisor } : {}), ...(resolution.rate !== null ? { rate: resolution.rate } : {}) } }); if (impact.status !== "RESOLVED") throw new Error(`La base de calcul de l'absence ${resolution.absenceType} n'est pas encore prise en charge.`); return { absenceId: resolution.absenceId, absenceType: resolution.absenceType, ruleVersionId: impact.ruleVersionId, basis: impact.basis, effect: impact.effect, absenceDays: resolution.calendarDaysInPeriod, grossDelta: impact.grossDelta, derivedVariableCode: impact.derivedVariableCode, derivedVariableLabel: impact.derivedVariableLabel }; });
    const absenceVariableInputs = absenceGrossImpacts.map((impact) => toVariableInput({ code: impact.derivedVariableCode, label: impact.derivedVariableLabel, amount: impact.grossDelta, unit: "EUR", source: "SYSTEM" }));
    const grossTreatments = [...treatments, ...absenceGrossImpacts.map((impact) => ({ code: impact.derivedVariableCode, ruleVersionId: impact.ruleVersionId, grossDelta: impact.grossDelta }))];
    const grossAmount = composeGrossAmount({ baseSalaryAmount, variableTreatments: grossTreatments });
    calculateSocialPayroll({ grossAmount, legalCategory: socialContext.legalCategory, calculationDate, companyCreationDate: socialContext.companyCreationDate, contractType: employee.contractType, hireDate: employee.hireDate, executiveStatus, healthPlanMonthlyAmount: socialContext.healthPlanMonthlyAmount, healthPlanEmployerRate: socialContext.healthPlanEmployerRate, situation: { "établissement . taux ATMP": `${socialContext.atmpRate}%`, "établissement . commune . nom": `'${socialContext.payrollCity}'`, "établissement . commune . département": `'${socialContext.payrollDepartment}'` } });
    const result = calculatePayroll({ grossAmount, variables: [...employeeVariables, ...absenceVariableInputs], ruleSet: rules.ruleSet, withholdingTaxRate: rules.withholdingTaxRate });
    calculatedEmployees.push({ employeeId: employee.id, result, profile: { id: profile.id, employeeId: profile.employeeId, baseSalaryCents: profile.baseSalaryCents, monthlyHours: profile.monthlyHours, effectiveFrom: profile.effectiveFrom, effectiveUntil: profile.effectiveUntil, collectiveAgreementId: profile.collectiveAgreementId, classificationCode: profile.classificationCode, classificationLabel: profile.classificationLabel, level: profile.level, coefficient: profile.coefficient }, variables: [...employeeVariables, ...absenceVariableInputs], treatments, validatedAbsences: employeeAbsences, absenceGrossImpacts });
  }

  await prisma.$transaction(async (tx) => {
    for (const calculated of calculatedEmployees) {
      const snapshot = snapshotForEmployee({ period: { id: period.id, year: period.year, month: period.month }, profile: { id: calculated.profile.id, baseSalaryCents: calculated.profile.baseSalaryCents, monthlyHours: calculated.profile.monthlyHours === null ? null : String(calculated.profile.monthlyHours), effectiveFrom: calculated.profile.effectiveFrom.toISOString(), effectiveUntil: calculated.profile.effectiveUntil?.toISOString() ?? null, collectiveAgreementId: calculated.profile.collectiveAgreementId, classificationCode: calculated.profile.classificationCode, classificationLabel: calculated.profile.classificationLabel, level: calculated.profile.level, coefficient: calculated.profile.coefficient }, variables: calculated.variables, validatedAbsences: calculated.validatedAbsences.map((absence) => ({ absenceId: absence.absenceId, type: absence.type, startDate: absence.startDate.toISOString(), endDate: absence.endDate.toISOString(), payrollImpactStatus: absence.status })), variableTreatments: calculated.treatments, absenceGrossImpacts: calculated.absenceGrossImpacts, ruleSet: rules.ruleSet, ruleSource: rules.source, result: calculated.result });
      const calculation = await tx.payrollCalculation.upsert({ where: { organizationId_payrollPeriodId_employeeId: { organizationId: input.organizationId, payrollPeriodId: period.id, employeeId: calculated.employeeId } }, create: { id: crypto.randomUUID(), organizationId: input.organizationId, payrollPeriodId: period.id, employeeId: calculated.employeeId, ruleSetVersion: calculated.result.ruleSetVersion, grossAmount: calculated.result.grossAmount, employeeContributions: calculated.result.employeeContributions, employerContributions: calculated.result.employerContributions, netBeforeTax: calculated.result.netBeforeTax, withholdingTax: calculated.result.withholdingTax, netPaid: calculated.result.netPaid, calculationSnapshot: snapshot }, update: { ruleSetVersion: calculated.result.ruleSetVersion, grossAmount: calculated.result.grossAmount, employeeContributions: calculated.result.employeeContributions, employerContributions: calculated.result.employerContributions, netBeforeTax: calculated.result.netBeforeTax, withholdingTax: calculated.result.withholdingTax, netPaid: calculated.result.netPaid, calculationSnapshot: snapshot } });
      await tx.payrollContribution.deleteMany({ where: { calculationId: calculation.id } });
      if (calculated.result.contributions.length > 0) await tx.payrollContribution.createMany({ data: calculated.result.contributions.map((contribution) => ({ id: crypto.randomUUID(), calculationId: calculation.id, code: contribution.code, label: contribution.label, side: contribution.side, baseAmount: contribution.baseAmount, rate: contribution.rate, amount: contribution.amount, ruleVersionId: contribution.ruleVersionId })) });
    }
    await tx.payrollPeriod.update({ where: { id: period.id }, data: { status: "CALCULATED", calculatedAt: new Date(), validatedAt: null, lockedAt: null } });
    await tx.auditLog.create({ data: { id: crypto.randomUUID(), organizationId: input.organizationId, actorUserId: input.actorUserId, action: "payroll.period.calculated", entityType: "PayrollPeriod", entityId: period.id, metadata: { ruleCode: input.ruleCode, ruleScope: input.ruleScope, employeeCount: employees.length, validatedAbsenceCount: validatedAbsences.length } } });
  });
  return { status: "CALCULATED", periodId: period.id, employeeCount: employees.length, ruleVersionId: rules.ruleVersionId };
}
