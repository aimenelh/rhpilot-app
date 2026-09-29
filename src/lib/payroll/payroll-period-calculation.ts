import { selectPeriodProfile } from "./profile-selection";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvePayrollRuleSetFromPrisma } from "./payroll-rule-set-prisma";
import { resolveValidatedAbsencesForPayrollPeriod } from "./absence-payroll-impact";
import { collectiveMinimumRuleCode, resolveCollectiveAgreementFromPrisma } from "./collective-agreement-prisma";
import { evaluateCollectiveMinimumSalary } from "./collective-agreement-rule-engine";
import { buildMinimumSalaryControlSnapshot } from "./minimum-salary-control";
import { resolveSmicMinimumFromPrisma } from "./minimum-wage-prisma";
import { resolveOrganizationLegalCategory } from "./social-organization-context";
import { resolveThresholdHeadcount, thresholdCrossingWarning } from "./headcount";
import { resolvePeriodMobilityRate } from "./organization-mobility";
import { ensureOrganizationRegistryData } from "@/lib/organization-registry-sync";
import { persistPayrollLedger } from "./payroll-ledger-builder";
import { resolveEmployeeWithholdingTaxProfile } from "./withholding-tax-profile";
import { resolveApprenticeshipMinimum, resolveProfessionalisationMinimum } from "./alternance-minimum";
import { buildAlternanceMinimumSnapshot, type AlternanceMinimumSnapshot } from "./alternance-minimum-snapshot";
import { calculateAgeAtDate, resolveEmployeeAlternanceProfile } from "./alternance-profile";
import { assertPayrollOutputConsistency } from "./payroll-output-consistency";
import { BULLETIN_ENGINE_VERSION, computePayslip } from "./bulletin/compute";
import { daysBetweenInclusive, monthBounds, toIsoDay } from "./bulletin/calendar";
import { mapAbsences, mapPayrollVariables, parsePrevoyanceRates, resolveWeeklySchedule } from "./bulletin/inputs";
import { buildBulletinLedger, contributionDetailsFromBulletin } from "./bulletin/ledger";
import { BULLETIN_SNAPSHOT_ENGINE, resolvePriorState } from "./bulletin/prior-state";
import {
  loadEarlierSickAbsences,
  loadOrganizationBulletinSettings,
  loadPaidLeaveOpenings,
  loadPayrollOpenings,
  loadPriorCalculations,
  loadProfileBulletinExtras,
  loadTerminations,
  territoryFromDepartment,
  type StoredTermination,
} from "./bulletin/period-loader";
import type { PayslipInput, PayslipResult, TerminationInput } from "./bulletin/types";

export type PayrollPeriodCalculationResult = { status: "CALCULATED"; periodId: string; employeeCount: number; ruleVersionId: string; warnings: string[] };

function frMonth(year: number, month: number): string {
  return `${String(month).padStart(2, "0")}/${year}`;
}

function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/** Indemnité de fin de CDD non due : rupture anticipée à l'initiative du salarié, rupture pendant l'essai (C. trav. art. L1243-10). */
const CDD_ALLOWANCE_EXCLUDED_REASONS = new Set(["DEMISSION", "FIN_PERIODE_ESSAI"]);

function terminationInput(stored: StoredTermination, contract: string, prior: { contractGrossBefore: number; contractGrossComplete: boolean }, displayName: string, warnings: string[]): TerminationInput {
  const severanceAmount = stored.severanceAmount ?? 0;
  if (severanceAmount > 0 && stored.severanceLegalMinimum === null) {
    throw new Error(`Calcul bloqué pour ${displayName} : renseignez l'indemnité légale ou conventionnelle de référence, elle détermine la part exonérée de l'indemnité de rupture.`);
  }
  let cddEndAllowance: TerminationInput["cddEndAllowance"] = null;
  if (stored.cddEndAllowanceMode === "AMOUNT") {
    if (stored.cddEndAllowanceAmount === null) throw new Error(`Calcul bloqué pour ${displayName} : le montant de l'indemnité de fin de contrat est absent.`);
    cddEndAllowance = { amount: stored.cddEndAllowanceAmount };
  } else if (stored.cddEndAllowanceMode === "AUTO" && contract === "CDD" && !CDD_ALLOWANCE_EXCLUDED_REASONS.has(stored.reason)) {
    if (!prior.contractGrossComplete) throw new Error(`Calcul bloqué pour ${displayName} : une partie du CDD a été payée hors de RH Pilot, le brut total du contrat n'est pas connu. Saisissez le montant de l'indemnité de fin de contrat dans la fiche de sortie.`);
    cddEndAllowance = { contractTotalGross: prior.contractGrossBefore, rate: stored.cddEndAllowanceRate ?? 0.1 };
    if (stored.reason === "LICENCIEMENT") warnings.push(`Indemnité de fin de contrat calculée pour ${displayName} : elle n'est pas due en cas de rupture anticipée pour faute grave ou force majeure. Choisissez « Non due » dans la fiche de sortie le cas échéant.`);
  }
  return {
    reason: stored.reason,
    noticeCompensation: stored.noticeCompensation,
    paidLeaveCompensation: stored.paidLeaveCompensationAmount !== null ? { amount: stored.paidLeaveCompensationAmount } : null,
    cddEndAllowance,
    severance: severanceAmount > 0 ? { amount: severanceAmount, legalOrConventionalMinimum: stored.severanceLegalMinimum ?? 0, previousYearGross: stored.previousYearGross, eligibleForFullPension: stored.eligibleForFullPension } : null,
  };
}

export async function calculatePayrollPeriod(input: { periodId: string; organizationId: string; ruleCode: string; ruleScope: string; actorUserId?: string }): Promise<PayrollPeriodCalculationResult> {
  const period = await prisma.payrollPeriod.findFirst({ where: { id: input.periodId, organizationId: input.organizationId }, select: { id: true, year: true, month: true, status: true, paymentDate: true } });
  if (!period) throw new Error("Période de paie introuvable.");
  if (period.status !== "DRAFT") throw new Error("Seule une période en préparation peut être calculée ou recalculée.");
  if (!input.ruleCode.trim() || !input.ruleScope.trim()) throw new Error("Le code et le périmètre de la règle de paie sont obligatoires.");

  // Organisations créées avant la reprise automatique : complète une fois leurs données officielles depuis le SIRET.
  await ensureOrganizationRegistryData(input.organizationId);

  const bounds = monthBounds(period.year, period.month);
  const start = new Date(`${bounds.first}T00:00:00.000Z`);
  const end = new Date(`${bounds.last}T23:59:59.999Z`);
  const calculationDate = new Date(`${bounds.first}T12:00:00.000Z`);

  const [employees, profiles, variables, rules, validatedAbsences, socialContext, settings, terminations] = await Promise.all([
    prisma.employee.findMany({ where: { organizationId: input.organizationId, deletedAt: null, hireDate: { lte: end }, OR: [{ contractEndDate: null }, { contractEndDate: { gte: start } }] }, select: { id: true, firstName: true, lastName: true, hireDate: true, contractEndDate: true, contractType: true, professionalCategory: true }, orderBy: { id: "asc" } }),
    prisma.payrollProfile.findMany({ where: { organizationId: input.organizationId, effectiveFrom: { lte: end }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: start } }] }, select: { id: true, employeeId: true, baseSalaryCents: true, monthlyHours: true, effectiveFrom: true, effectiveUntil: true, collectiveAgreementId: true, classificationCode: true, classificationLabel: true, level: true, coefficient: true, seniorityDate: true }, orderBy: { effectiveFrom: "desc" } }),
    prisma.payrollVariable.findMany({ where: { organizationId: input.organizationId, payrollPeriodId: period.id }, select: { id: true, employeeId: true, code: true, label: true, amount: true, unit: true, source: true, reference: true }, orderBy: { createdAt: "asc" } }),
    resolvePayrollRuleSetFromPrisma({ code: input.ruleCode, scope: input.ruleScope, periodDate: calculationDate }),
    resolveValidatedAbsencesForPayrollPeriod({ organizationId: input.organizationId, year: period.year, month: period.month }),
    resolveOrganizationLegalCategory(input.organizationId),
    loadOrganizationBulletinSettings(input.organizationId),
    loadTerminations(input.organizationId, period.id),
  ]);
  if (rules.status === "UNRESOLVED") throw new Error(rules.message);
  if (employees.length === 0) throw new Error("Aucun salarié n'est actif sur cette période de paie.");

  const activeEmployeeIds = new Set(employees.map((employee) => employee.id));
  if (variables.some((variable) => !activeEmployeeIds.has(variable.employeeId))) throw new Error("Des variables de paie existent pour un salarié hors de la période active. Supprimez-les ou rattachez-les à la période correcte avant de calculer.");
  for (const employeeId of terminations.keys()) if (!activeEmployeeIds.has(employeeId)) throw new Error("Une fiche de sortie concerne un salarié hors de la période active : supprimez-la avant de calculer.");

  const profilesByEmployee = new Map<string, (typeof profiles)[number][]>();
  for (const profile of profiles) {
    if (!activeEmployeeIds.has(profile.employeeId)) continue;
    profilesByEmployee.set(profile.employeeId, [...(profilesByEmployee.get(profile.employeeId) ?? []), profile]);
  }
  // Profil du mois : le plus récent, avec un salaire de base proratisé si le salaire change en cours de mois.
  const periodProfiles = new Map<string, { profile: (typeof profiles)[number]; baseSalaryCents: number | null; warning: string | null }>();
  for (const [employeeId, employeeProfiles] of profilesByEmployee) {
    const selection = selectPeriodProfile(employeeProfiles, start, end);
    if (!selection.ok) {
      const employee = employees.find((item) => item.id === employeeId);
      const name = employee ? [employee.firstName, employee.lastName].filter(Boolean).join(" ") : employeeId;
      throw new Error(`Calcul bloqué pour ${name} sur ${frMonth(period.year, period.month)} : ${selection.error}`);
    }
    periodProfiles.set(employeeId, selection);
  }

  const employeeIds = employees.map((employee) => employee.id);
  const [profileExtras, paidLeaveOpenings, payrollOpenings, priorCalculations, earlierAbsences] = await Promise.all([
    loadProfileBulletinExtras(profiles.filter((profile) => activeEmployeeIds.has(profile.employeeId)).map((profile) => profile.id)),
    loadPaidLeaveOpenings(input.organizationId, employeeIds, start),
    loadPayrollOpenings(input.organizationId, employeeIds, period.year),
    loadPriorCalculations(input.organizationId, employeeIds, period.year, period.month),
    loadEarlierSickAbsences(input.organizationId, employeeIds, start),
  ]);

  const { territory, alsaceMoselle } = territoryFromDepartment(socialContext.payrollDepartment);
  // Effectif des seuils : saisi par l'entreprise s'il l'a été, sinon moyenne de l'année précédente
  // (hors alternants, temps partiels au prorata) avec la règle des cinq ans de la loi Pacte.
  // L'historique inclut les salariés archivés : un départ reste compté pour les mois où il était présent.
  const historyStart = new Date(Date.UTC(period.year - 5, 0, 1));
  const history = await prisma.employee.findMany({
    where: { organizationId: input.organizationId, hireDate: { lte: end }, OR: [{ contractEndDate: null }, { contractEndDate: { gte: historyStart } }] },
    select: { id: true, contractType: true, hireDate: true, contractEndDate: true, deletedAt: true },
  });
  const historyHours = new Map<string, number | null>();
  for (const row of await prisma.payrollProfile.findMany({ where: { organizationId: input.organizationId, employeeId: { in: history.map((item) => item.id) } }, select: { employeeId: true, monthlyHours: true }, orderBy: { effectiveFrom: "asc" } })) {
    historyHours.set(row.employeeId, row.monthlyHours === null ? null : Number(row.monthlyHours));
  }
  const thresholdHeadcount = resolveThresholdHeadcount(
    history.map((item) => ({
      contractType: item.contractType,
      hireDate: item.hireDate,
      // Un salarié archivé sans date de fin de contrat est considéré parti à son archivage.
      contractEndDate: item.contractEndDate ?? item.deletedAt,
      monthlyHours: periodProfiles.get(item.id)?.profile.monthlyHours != null ? Number(periodProfiles.get(item.id)?.profile.monthlyHours) : historyHours.get(item.id) ?? null,
    })),
    period.year,
    new Date(`${bounds.last}T12:00:00.000Z`),
  );
  // Le moteur attend un entier d'au moins 1 ; l'arrondi inférieur place l'entreprise du même côté des seuils de 11, 20 et 50.
  const headcount = settings.payrollHeadcount ?? Math.max(1, Math.floor(thresholdHeadcount.headcount));
  const globalWarnings: string[] = [];
  if (settings.payrollHeadcount === null) globalWarnings.push(...thresholdHeadcount.warnings);
  if (settings.payrollHeadcount === null) {
    const [previous] = await prisma.$queryRaw<Array<{ headcount: unknown }>>`
      SELECT c."calculationSnapshot"->'inputs'->'organization'->>'headcount' AS "headcount"
      FROM "payroll_calculations" c JOIN "payroll_periods" p ON p."id" = c."payrollPeriodId"
      WHERE c."organizationId" = ${input.organizationId} AND (p."year" * 12 + p."month") < ${period.year * 12 + period.month}
      ORDER BY p."year" DESC, p."month" DESC LIMIT 1
    `;
    const previousHeadcount = previous && previous.headcount !== null && Number.isFinite(Number(previous.headcount)) ? Number(previous.headcount) : null;
    const crossing = thresholdCrossingWarning(previousHeadcount, headcount);
    if (crossing) globalWarnings.push(crossing);
  }
  // Versement mobilité : barème Urssaf de la commune de l'établissement, sauf taux saisi par l'entreprise.
  const mobility = await resolvePeriodMobilityRate({ organizationId: input.organizationId, periodFirstDay: bounds.first, headcount });
  if (mobility.warning) globalWarnings.push(mobility.warning);
  const collectiveGridMissing = new Set<string>();
  const classificationUnmatched: string[] = [];
  // Convention associée sans aucune grille validée dans le référentiel (ajoutée depuis le SIRET, par exemple).
  const organizationAgreement = await prisma.organization.findUnique({ where: { id: input.organizationId }, select: { collectiveAgreementId: true } });
  const agreementWithoutGrid = new Map<string, boolean>();
  const hasNoIntegratedGrid = async (agreementId: string | null | undefined): Promise<boolean> => {
    if (!agreementId) return false;
    if (!agreementWithoutGrid.has(agreementId)) {
      const agreement = await prisma.collectiveAgreement.findUnique({ where: { id: agreementId }, select: { status: true, versions: { where: { status: "VALIDATED" }, select: { id: true }, take: 1 } } });
      agreementWithoutGrid.set(agreementId, Boolean(agreement && agreement.status === "ACTIVE" && agreement.versions.length === 0));
    }
    return agreementWithoutGrid.get(agreementId) === true;
  };
  const prevoyance = parsePrevoyanceRates(settings.prevoyanceRates);

  type Calculated = {
    employeeId: string;
    result: PayslipResult;
    payslipInput: PayslipInput;
    profile: (typeof profiles)[number];
    variables: typeof variables;
    validatedAbsences: typeof validatedAbsences;
    collectiveMinimum: ReturnType<typeof evaluateCollectiveMinimumSalary>;
    minimumSalaryControl: ReturnType<typeof buildMinimumSalaryControlSnapshot>;
    alternanceMinimum: AlternanceMinimumSnapshot | null;
    withholdingProfile: Awaited<ReturnType<typeof resolveEmployeeWithholdingTaxProfile>>;
  };
  const calculated: Calculated[] = [];

  for (const employee of employees) {
    const displayName = [employee.firstName, employee.lastName].filter(Boolean).join(" ") || employee.id;
    const selected = periodProfiles.get(employee.id);
    const profile = selected?.profile;
    if (!profile || !selected) throw new Error(`Aucun profil paie applicable pour ${displayName}.`);
    if (profile.baseSalaryCents === null || !Number.isFinite(Number(profile.baseSalaryCents)) || Number(profile.baseSalaryCents) < 0) throw new Error(`Le salaire brut mensuel est manquant ou invalide pour ${displayName}.`);
    if (!employee.contractType) throw new Error(`Le type de contrat est manquant pour ${displayName}.`);
    if (!employee.professionalCategory) throw new Error(`La catégorie professionnelle est manquante pour ${displayName}.`);
    const monthlyHours = Number(profile.monthlyHours);
    if (!Number.isFinite(monthlyHours) || monthlyHours <= 0 || monthlyHours > 250) throw new Error(`Le volume horaire mensuel est manquant ou invalide pour ${displayName}.`);

    // --- Salaire minimum légal, conventionnel et alternance (contrôles bloquants) ---
    // Chaque classification a sa propre règle de minimum dans le référentiel (MINIMUM_SALARY_<classification>).
    const collectiveMinimumResolution = await resolveCollectiveAgreementFromPrisma({ organizationId: input.organizationId, employeeId: employee.id, periodDate: calculationDate, ruleCode: collectiveMinimumRuleCode(profile.classificationCode) });
    const collectiveMinimum: ReturnType<typeof evaluateCollectiveMinimumSalary> = collectiveMinimumResolution.status === "RESOLVED"
      ? evaluateCollectiveMinimumSalary({ monthlyGrossCents: profile.baseSalaryCents, classificationCode: profile.classificationCode, professionalCategory: employee.professionalCategory, contractType: employee.contractType, parameters: collectiveMinimumResolution.rule.parameters })
      : { status: "UNRESOLVED", code: collectiveMinimumResolution.code, message: collectiveMinimumResolution.message };
    const smicScope = socialContext.payrollDepartment === "976" ? "MAYOTTE" as const : "FRANCE_HORS_MAYOTTE" as const;
    const smicMinimum = await resolveSmicMinimumFromPrisma({ periodDate: calculationDate, scope: smicScope });
    if (!smicMinimum) throw new Error(`Calcul bloqué pour ${displayName} : aucune version validée du SMIC n'est disponible.`);
    // Convention associée mais dont RH Pilot n'a pas encore intégré la grille : contrôle sur le SMIC et avertissement, sans bloquer.
    // Une version expirée ou une convention désactivée continuent de bloquer ; seule l'absence de grille exploitable passe au SMIC.
    const agreementId = profile.collectiveAgreementId ?? organizationAgreement?.collectiveAgreementId;
    const noGrid = await hasNoIntegratedGrid(agreementId);
    // Grille absente pour toute la convention, ou classification du salarié absente de la grille :
    // contrôle sur le SMIC et avertissement, sans bloquer les autres salariés.
    const gridMissing = collectiveMinimum.status === "UNRESOLVED"
      && (collectiveMinimum.code === "NO_VALIDATED_RULE" || (collectiveMinimum.code === "NO_VALIDATED_VERSION" && noGrid));
    if (gridMissing) {
      if (noGrid || !agreementId) collectiveGridMissing.add(employee.id);
      else classificationUnmatched.push(displayName);
    }
    const minimumSalaryControl = buildMinimumSalaryControlSnapshot({ smic: smicMinimum, collectiveMinimum: gridMissing ? { status: "UNRESOLVED", code: "NO_COLLECTIVE_AGREEMENT", message: collectiveMinimum.message } : collectiveMinimum, monthlyHours, collectiveRuleVersionId: collectiveMinimumResolution.status === "RESOLVED" ? collectiveMinimumResolution.rule.versionId : undefined, monthlyGrossCents: profile.baseSalaryCents });
    if (minimumSalaryControl.status !== "APPLICABLE") throw new Error(`Calcul bloqué pour ${displayName} : contrôle du salaire minimum non résolu. ${minimumSalaryControl.explanation}`);
    const isAlternance = employee.contractType === "APPRENTISSAGE" || employee.contractType === "PROFESSIONNALISATION";
    if (minimumSalaryControl.compliant === false && !isAlternance) throw new Error(`Calcul bloqué pour ${displayName} : le salaire brut est inférieur au minimum applicable. ${minimumSalaryControl.explanation}`);

    let alternanceMinimum: AlternanceMinimumSnapshot | null = null;
    if (isAlternance) {
      const alternanceProfile = await resolveEmployeeAlternanceProfile({ organizationId: input.organizationId, employeeId: employee.id, periodDate: calculationDate });
      if (!alternanceProfile) throw new Error(`Calcul bloqué pour ${displayName} : le profil alternance versionné est manquant.`);
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
      if (result.status === "UNRESOLVED") throw new Error(`Calcul bloqué pour ${displayName} : contrôle du minimum alternance non résolu (${result.code}). ${result.explanation}`);
      const legalMinimumCents = employee.contractType === "PROFESSIONNALISATION" && age >= 26
        ? Math.max(smicMinimum.monthlyGrossCentsAt35Hours, Math.round((collectiveMinimumCents ?? 0) * 0.85))
        : Math.round(smicMinimum.monthlyGrossCentsAt35Hours * (result.percentageOfSmic ?? 0));
      if (profile.baseSalaryCents < (result.monthlyMinimumCents ?? Number.POSITIVE_INFINITY)) throw new Error(`Calcul bloqué pour ${displayName} : salaire brut mensuel ${(profile.baseSalaryCents / 100).toFixed(2)} € inférieur au minimum alternance applicable ${((result.monthlyMinimumCents ?? 0) / 100).toFixed(2)} €.`);
      alternanceMinimum = buildAlternanceMinimumSnapshot({ result, age, contractYear: alternanceProfile.contractYear, hasBaccalaureateOrHigher: alternanceProfile.hasBaccalaureateOrHigher, smicMonthlyCents: smicMinimum.monthlyGrossCentsAt35Hours, smicScope, legalMinimumCents, collectiveMinimumCents, baseSalaryCents: profile.baseSalaryCents, profileValidFrom: alternanceProfile.validFrom, profileValidUntil: alternanceProfile.validUntil, profileSource: alternanceProfile.source, profileSourceReference: alternanceProfile.sourceReference });
    }

    // --- Absences et variables ---
    const employeeAbsences = validatedAbsences.filter((absence) => absence.employeeId === employee.id);
    const mapped = mapAbsences(
      employeeAbsences.map((absence) => ({ id: absence.absenceId, type: absence.type, startDate: toIsoDay(absence.startDate), endDate: toIsoDay(absence.endDate) })),
      earlierAbsences.filter((absence) => absence.employeeId === employee.id).map((absence) => ({ id: absence.id, type: absence.type, startDate: toIsoDay(absence.startDate), endDate: toIsoDay(absence.endDate) })),
    );
    const alias = new Map<string, string>();
    for (const [mergedId, ids] of mapped.chainIds) for (const id of ids) alias.set(id, mergedId);
    const employeeVariables = variables.filter((variable) => variable.employeeId === employee.id);
    const variableInputs = mapPayrollVariables(
      employeeVariables.map((variable) => ({ id: variable.id, code: variable.code, label: variable.label, amount: Number(variable.amount), unit: variable.unit, reference: variable.reference ? alias.get(variable.reference) ?? variable.reference : null })),
      mapped.absences,
    );
    if (variableInputs.errors.length > 0) throw new Error(`Calcul bloqué pour ${displayName} : ${variableInputs.errors.join(" ")}`);
    const absences = mapped.absences.map((absence) => (variableInputs.ijssByAbsence.has(absence.id) ? { ...absence, ijssGrossAmount: variableInputs.ijssByAbsence.get(absence.id) } : absence));

    // --- État antérieur (cumuls, congés, maintien) ---
    const hireDate = toIsoDay(employee.hireDate);
    const contractEndDate = employee.contractEndDate ? toIsoDay(employee.contractEndDate) : null;
    const chainIds = new Set<string>([...mapped.chainIds.values()].flat());
    const prior = resolvePriorState({ year: period.year, month: period.month, displayName, hireDate, calculations: priorCalculations.get(employee.id) ?? [], paidLeaveOpening: paidLeaveOpenings.get(employee.id) ?? null, payrollOpening: payrollOpenings.get(employee.id) ?? null, currentChainAbsenceIds: chainIds });

    // --- Sortie ---
    const storedTermination = terminations.get(employee.id);
    const leavesThisMonth = contractEndDate !== null && contractEndDate >= bounds.first && contractEndDate <= bounds.last;
    if (leavesThisMonth && !storedTermination) throw new Error(`Calcul bloqué pour ${displayName} : son contrat se termine le ${contractEndDate!.split("-").reverse().join("/")}. Renseignez la fiche de sortie (motif et indemnités) pour établir le solde de tout compte.`);
    if (storedTermination && !leavesThisMonth) throw new Error(`Calcul bloqué pour ${displayName} : une fiche de sortie est saisie mais la date de fin de contrat n'est pas dans le mois.`);
    const terminationWarnings: string[] = [];
    const termination = storedTermination ? terminationInput(storedTermination, employee.contractType, prior, displayName, terminationWarnings) : null;

    // --- Prélèvement à la source ---
    const withholdingProfile = await resolveEmployeeWithholdingTaxProfile({ organizationId: input.organizationId, employeeId: employee.id, periodDate: calculationDate });

    // --- Titres-restaurant et transport ---
    if (variableInputs.mealVoucherCount > 0 && (settings.mealVoucherFaceValue === null || settings.mealVoucherEmployerShare === null)) throw new Error(`Calcul bloqué pour ${displayName} : renseignez la valeur faciale et la part patronale des titres-restaurant dans les paramètres de paie.`);

    const baseSalary = (selected.baseSalaryCents ?? profile.baseSalaryCents) / 100;
    const extras = profileExtras.get(profile.id);
    const schedule = resolveWeeklySchedule(extras?.weeklySchedule ?? null, monthlyHours);
    const warnings = [...mapped.warnings, ...prior.warnings, ...terminationWarnings];
    if (selected.warning) warnings.push(selected.warning);
    if (schedule.derived) warnings.push(`Horaire hebdomadaire de ${displayName} non renseigné : ses heures sont réparties du lundi au vendredi pour valoriser les absences.`);

    const payslipInput: PayslipInput = {
      period: { year: period.year, month: period.month },
      paymentDate: period.paymentDate ? toIsoDay(period.paymentDate) : undefined,
      organization: {
        headcount,
        atmpRatePercent: socialContext.atmpRate,
        mobilityRatePercent: mobility.ratePercent,
        territory,
        alsaceMoselle,
        healthPlan: extras?.healthPlanWaiver ? null : { monthlyAmount: socialContext.healthPlanMonthlyAmount, employerShare: socialContext.healthPlanEmployerRate / 100 },
        prevoyance,
        workedSolidarityDay: settings.workedSolidarityDay,
        ijssSubrogation: settings.ijssSubrogation,
        paidLeaveMethod: settings.paidLeaveMethod,
      },
      employee: {
        id: employee.id,
        displayName,
        contract: employee.contractType,
        executive: employee.professionalCategory === "CADRE",
        hireDate,
        contractEndDate,
        seniorityDate: profile.seniorityDate ? toIsoDay(profile.seniorityDate) : null,
        plannedContractDays: employee.contractType === "CDD" && contractEndDate ? daysBetweenInclusive(hireDate, contractEndDate) : null,
      },
      pay: { monthlyBaseSalary: baseSalary, contractMonthlyHours: monthlyHours, structuralOvertimeMonthlyHours: extras?.structuralOvertimeHours ?? undefined, structuralOvertimeRate: extras?.structuralOvertimeRate ?? undefined, schedule: schedule.schedule },
      absences,
      overtime: variableInputs.overtime,
      complementaryHours: variableInputs.complementaryHours,
      bonuses: variableInputs.bonuses,
      benefitsInKind: variableInputs.benefitsInKind,
      expenses: variableInputs.expenses,
      mealVouchers: variableInputs.mealVoucherCount > 0 ? { count: variableInputs.mealVoucherCount, faceValue: settings.mealVoucherFaceValue!, employerShare: settings.mealVoucherEmployerShare! } : null,
      publicTransport: variableInputs.publicTransportCost > 0 ? { monthlySubscription: variableInputs.publicTransportCost, employerShare: settings.transportEmployerShare } : null,
      netAdjustments: variableInputs.netAdjustments,
      paidLeave: prior.paidLeave,
      yearToDate: prior.yearToDate,
      sickPayHistory: prior.sickPayHistory,
      previousGrossSalaries: prior.previousGrossSalaries,
      grossSalaryHistory: prior.grossSalaryHistory,
      // Sans taux transmis par la DGFiP, la grille de taux non personnalisé s'applique d'elle-même sur le net imposable du mois.
      withholding: withholdingProfile && withholdingProfile.source !== "NON_PERSONNALISE" ? { mode: "PERSONALIZED", rate: withholdingProfile.rate, rateIdentifier: withholdingProfile.sourceReference } : { mode: "DEFAULT_GRID" },
      termination,
    };

    let result: PayslipResult;
    try {
      result = computePayslip(payslipInput);
    } catch (error) {
      throw new Error(`Calcul bloqué pour ${displayName} : ${error instanceof Error ? error.message : "erreur de calcul."}`);
    }
    result.warnings.unshift(...warnings);
    assertPayrollOutputConsistency({ grossAmount: result.totals.grossTotal, employeeContributions: Math.max(0, result.totals.employeeContributions), employerContributions: Math.max(0, result.totals.employerContributions), netBeforeTax: result.totals.netBeforeTax, netTaxableAmount: result.totals.netTaxable, netSocialAmount: result.totals.netSocial, withholdingTax: result.totals.withholdingTax, netPaid: result.totals.netPaid, ...(result.totals.employerContributions >= 0 ? { employerCost: result.totals.employerCost } : {}) });

    calculated.push({ employeeId: employee.id, result, payslipInput, profile, variables: employeeVariables, validatedAbsences: employeeAbsences, collectiveMinimum, minimumSalaryControl, alternanceMinimum, withholdingProfile });
  }

  await prisma.$transaction(async (tx) => {
    const activeIds = calculated.map((entry) => entry.employeeId);
    await tx.payrollCalculation.deleteMany({ where: { organizationId: input.organizationId, payrollPeriodId: period.id, ...(activeIds.length > 0 ? { employeeId: { notIn: activeIds } } : {}) } });
    for (const entry of calculated) {
      const { result, profile } = entry;
      const totals = result.totals;
      const contributionDetails = contributionDetailsFromBulletin(result);
      const snapshot = toJson({
        calculatedAt: new Date().toISOString(),
        period: { id: period.id, year: period.year, month: period.month },
        profile: { id: profile.id, baseSalaryCents: profile.baseSalaryCents, monthlyHours: profile.monthlyHours === null ? null : String(profile.monthlyHours), effectiveFrom: profile.effectiveFrom.toISOString(), effectiveUntil: profile.effectiveUntil?.toISOString() ?? null, collectiveAgreementId: profile.collectiveAgreementId, classificationCode: profile.classificationCode, classificationLabel: profile.classificationLabel, level: profile.level, coefficient: profile.coefficient, seniorityDate: profile.seniorityDate?.toISOString() ?? null },
        variables: entry.variables.map((variable) => ({ code: variable.code, label: variable.label, amount: Number(variable.amount), unit: variable.unit, source: variable.source, reference: variable.reference ?? null })),
        validatedAbsences: entry.validatedAbsences.map((absence) => ({ absenceId: absence.absenceId, type: absence.type, startDate: absence.startDate.toISOString(), endDate: absence.endDate.toISOString(), payrollImpactStatus: absence.status })),
        collectiveMinimum: entry.collectiveMinimum,
        minimumSalaryControl: entry.minimumSalaryControl,
        alternanceMinimum: entry.alternanceMinimum,
        ruleSource: { sourceName: `Moteur de bulletin RH Pilot ${BULLETIN_ENGINE_VERSION}`, sourceUrl: null, validFrom: rules.source.validFrom.toISOString(), validUntil: rules.source.validUntil?.toISOString() ?? null },
        withholdingTax: {
          status: result.withholding.mode === "PERSONALIZED" ? "RATE_PROVIDED" : "DEFAULT_GRID",
          rate: result.withholding.rate,
          amount: totals.withholdingTax,
          validFrom: entry.withholdingProfile ? entry.withholdingProfile.validFrom.toISOString() : start.toISOString(),
          validUntil: entry.withholdingProfile?.validUntil?.toISOString() ?? null,
          source: entry.withholdingProfile ? entry.withholdingProfile.source : "NON_PERSONNALISE",
          sourceReference: entry.withholdingProfile?.sourceReference ?? null,
        },
        calculationSource: { engine: BULLETIN_SNAPSHOT_ENGINE, engineVersion: result.engineVersion, socialTotalsAuthoritative: true },
        socialEngine: { modelVersion: result.engineVersion, grossAmount: totals.grossTotal, employeeContributions: totals.employeeContributions, employerContributions: totals.employerContributions, netBeforeTax: totals.netBeforeTax, netTaxableAmount: totals.netTaxable, netSocialAmount: totals.netSocial, employerCost: totals.employerCost, contributionDetails },
        payable: { socialNetBeforeTax: totals.netBeforeTax, postSocialAdjustment: 0, netBeforeTax: totals.netBeforeTax, withholdingTax: totals.withholdingTax, netPaid: totals.netPaid },
        bulletin: result,
        inputs: entry.payslipInput,
      });
      const data = { ruleSetVersion: BULLETIN_ENGINE_VERSION, grossAmount: totals.grossTotal, employeeContributions: totals.employeeContributions, employerContributions: totals.employerContributions, netBeforeTax: totals.netBeforeTax, withholdingTax: totals.withholdingTax, netPaid: totals.netPaid, netTaxableAmount: totals.netTaxable, netSocialAmount: totals.netSocial, calculationSnapshot: snapshot };
      const calculation = await tx.payrollCalculation.upsert({
        where: { organizationId_payrollPeriodId_employeeId: { organizationId: input.organizationId, payrollPeriodId: period.id, employeeId: entry.employeeId } },
        create: { id: crypto.randomUUID(), organizationId: input.organizationId, payrollPeriodId: period.id, employeeId: entry.employeeId, ...data },
        update: data,
        select: { id: true },
      });
      await tx.payrollContribution.deleteMany({ where: { calculationId: calculation.id } });
      for (const detail of contributionDetails) {
        await tx.payrollContribution.create({ data: { id: crypto.randomUUID(), calculationId: calculation.id, code: detail.code, label: detail.label, side: detail.side, baseAmount: detail.baseAmount ?? 0, rate: detail.rate ?? 0, amount: detail.amount, ruleVersionId: rules.ruleVersionId } });
      }
      await persistPayrollLedger(tx, calculation.id, buildBulletinLedger(result, rules.ruleVersionId));
    }
    await tx.payrollPeriod.update({ where: { id: period.id }, data: { status: "CALCULATED", calculatedAt: new Date() } });
  }, { maxWait: 10000, timeout: 60000 });

  if (classificationUnmatched.length > 0) {
    globalWarnings.push(`Classification conventionnelle absente ou hors grille pour ${classificationUnmatched.join(", ")} : le contrôle du salaire minimum porte sur le SMIC. Renseignez la classification dans l'onglet Paie de la fiche.`);
  }
  if (collectiveGridMissing.size > 0) {
    globalWarnings.push(`Les minima de salaire de votre convention collective ne sont pas encore intégrés à RH Pilot : le contrôle du salaire minimum porte sur le SMIC pour ${collectiveGridMissing.size === 1 ? "1 salarié" : `${collectiveGridMissing.size} salariés`}. Vérifiez les salaires par rapport à la grille de la convention.`);
  }
  const warnings = [...globalWarnings, ...calculated.flatMap((entry) => entry.result.warnings.map((warning) => warning))];
  return { status: "CALCULATED", periodId: period.id, employeeCount: calculated.length, ruleVersionId: rules.ruleVersionId, warnings: [...new Set(warnings)] };
}
