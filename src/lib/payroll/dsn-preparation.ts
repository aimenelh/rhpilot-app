import { identifyDsnAffiliations, normalizeDsnComplementaryAffiliations } from "./dsn-complementary-affiliations";
import type { DsnOpsPayment } from "./dsn-p26v01-complete";
import { Prisma } from "@prisma/client";
import { assertDsnRetirementScope, assertDsnStableContract } from "./dsn-contract-scope";
import { prisma } from "@/lib/prisma";
import type { DsnP26MonthlyInput } from "./dsn-p26v01";
import { buildDsnP26V01Complete } from "./dsn-p26v01-complete";
import { mapLockedContributions, mergeLockedAggregates, readLockedContributionSnapshot, type LockedContributionData } from "./dsn-locked-contributions";
import { dsnOpsSiret, dsnPaymentIban, dsnPaymentBic } from "./dsn-payment-settings";
import { decryptDsnSensitiveValue, assertNirFormat } from "./dsn-pii";
import { assertPasDsnScopeSupported } from "./pas-dsn";
import { dsnPasFromLockedBulletin } from "./dsn-locked-pas";
import { assertPayrollOutputConsistency } from "./payroll-output-consistency";
import type { WithholdingTaxProfile } from "./withholding-tax-profile";

export type DsnPreparationResult = { content: string; fileName: string; normVersion: "P26V01"; employeeCount: number; warnings: string[] };

type SnapshotWithholdingTax = { rate: number; amount: number; validFrom: string; validUntil: string | null; source: string; sourceReference: string | null };
type CalculationSnapshot = { profile?: { id?: string; baseSalaryCents?: number; monthlyHours?: string | null; collectiveAgreementId?: string | null }; variables?: unknown[]; validatedAbsences?: Array<{ absenceId?: string; type?: string; startDate?: string; endDate?: string; lastWorkedDate?: string | null; subrogationStartDate?: string | null; subrogationEndDate?: string | null; workAccidentDate?: string | null; returnDate?: string | null; returnReasonCode?: string | null }>; withholdingTax?: Partial<SnapshotWithholdingTax>; socialEngine?: { employerCost?: number }; bulletin?: { lines?: Array<{ code?: string; base?: number; amount?: number }> } };

type OrganizationDsnRow = {
  id: string; name: string; siret: string | null; payrollAddress: string | null; payrollPostalCode: string | null; payrollCity: string | null;
  payrollNafCode: string | null; payrollDepartment: string | null; atmpRate: unknown; mainCollectiveAgreementCode: string | null;
  contactName: string | null; contactEmail: string | null; contactPhone: string | null; declaredContactType: string | null; enterpriseApenCode: string | null; defaultTestMode: boolean | null;
  urssafSiret: string | null; retirementSiret: string | null; paymentIbanCiphertext: string | null; paymentBic: string | null; subrogationIbanCiphertext: string | null; subrogationBic: string | null; ijssSubrogation: boolean; sepaMandatesConfirmed: boolean;
};

type DsnEmployeeProfileRow = {
  complementaryAffiliations: unknown;
  employeeId: string; nirCiphertext: string; birthDate: Date; birthPlace: string; birthDepartment: string; birthCountryCode: string | null; euClassificationCode: string | null;
  addressLine: string; postalCode: string; city: string; countryCode: string | null; contractNumber: string; contractNatureCode: string; publicPolicyCode: string;
  pcsEsecCode: string; conventionalStatusCode: string; retirementStatusCode: string; workUnitCode: string; referenceWorkQuota: unknown; contractWorkQuota: unknown;
  workModalityCode: string; baseSchemeSupplementCode: string | null; sicknessRegimeCode: string; workLocationId: string | null; oldAgeRegimeCode: string;
  foreignWorkerCode: string | null; employmentStatusCode: string | null; multipleJobsCode: string | null; multipleEmployersCode: string | null;
  workAccidentRegimeCode: string | null; workAccidentRiskCode: string | null;
};

function asSnapshot(value: Prisma.JsonValue): CalculationSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("DSN bloquée : le snapshot de calcul verrouillé est invalide.");
  return value as unknown as CalculationSnapshot;
}
function requiredString(value: string | null | undefined, label: string): string { const normalized = value?.trim() ?? ""; if (!normalized) throw new Error(`DSN bloquée : ${label} est absent.`); return normalized; }
function requiredNumber(value: unknown, label: string): number { const number = value === null || value === undefined || value === "" ? NaN : Number(value); if (!Number.isFinite(number)) throw new Error(`DSN bloquée : ${label} est absent ou invalide.`); return number; }

function snapshotWithholdingTax(snapshot: CalculationSnapshot, employeeId: string): WithholdingTaxProfile {
  const withholding = snapshot.withholdingTax;
  if (!withholding) throw new Error(`DSN bloquée : le snapshot PAS du salarié ${employeeId} est absent.`);
  const rate = Number(withholding.rate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) throw new Error(`DSN bloquée : le taux PAS verrouillé du salarié ${employeeId} est invalide.`);
  const validFrom = new Date(requiredString(withholding.validFrom, `la date de début du taux PAS du salarié ${employeeId}`));
  const validUntil = withholding.validUntil ? new Date(withholding.validUntil) : null;
  if (Number.isNaN(validFrom.getTime()) || (validUntil && Number.isNaN(validUntil.getTime()))) throw new Error(`DSN bloquée : la période de validité du PAS du salarié ${employeeId} est invalide.`);
  return { rate, validFrom, validUntil, source: requiredString(withholding.source, `la provenance du PAS du salarié ${employeeId}`), sourceReference: withholding.sourceReference?.trim() || null };
}

const DSN_UNMAPPED_BULLETIN_LINES = new Set(["ENTRY_EXIT", "SEVERANCE", "PAID_LEAVE_COMPENSATION", "NOTICE_COMPENSATION", "CDD_END_ALLOWANCE"]);

/**
 * Éléments d'un bulletin que la DSN préparatoire ne sait pas encore déclarer. Tous sont listés
 * d'un coup (et pas seulement le premier), pour que l'entreprise voie d'emblée ce qui reste à
 * déclarer par un autre moyen (logiciel de paie, expert-comptable ou saisie sur net-entreprises).
 */
export function dsnScopeIssues(snapshot: { variables?: unknown[]; validatedAbsences?: Array<{ type?: string }>; bulletin?: { lines?: Array<{ code?: string; base?: number }> } }): string[] {
  const issues: string[] = [];
  if ((snapshot.bulletin?.lines ?? []).some((line) => line.code && DSN_UNMAPPED_BULLETIN_LINES.has(line.code))) issues.push("entrée, sortie ou indemnité de fin de contrat (blocs S21.G00.62 non émis)");
  const supportedAbsences = new Set(["UNPAID_LEAVE", "RTT", "FAMILY_EVENT", "SICK_LEAVE", "MATERNITY", "PATERNITY", "WORK_ACCIDENT"]);
  const unsupportedAbsences = (snapshot.validatedAbsences ?? []).filter((absence) => !supportedAbsences.has(absence?.type ?? ""));
  if (unsupportedAbsences.length > 0) issues.push("absences non encore raccordées (congés payés ou autre suspension)");
  return issues;
}

function assertNirBirthYear(nir: string, birthDate: Date, employeeId: string): void {
  if (!(birthDate instanceof Date) || Number.isNaN(birthDate.getTime())) throw new Error(`DSN bloquée : la date de naissance du salarié ${employeeId} est invalide.`);
  const expected = String(birthDate.getUTCFullYear()).slice(-2);
  if (nir.slice(1, 3) !== expected) throw new Error(`DSN bloquée : l'année de naissance du NIR du salarié ${employeeId} ne correspond pas à sa date de naissance.`);
}

/** Prépare une DSN P26V01 à partir d'une période verrouillée, sans relire de données de calcul vivantes. */
export async function prepareDsnP26V01(input: { organizationId: string; periodId: string; testMode?: boolean; declarationOrder?: number; fileDate?: Date }): Promise<DsnPreparationResult> {
  const period = await prisma.payrollPeriod.findFirst({ where: { id: input.periodId, organizationId: input.organizationId }, select: { id: true, year: true, month: true, status: true, paymentDate: true } });
  if (!period) throw new Error("DSN bloquée : période de paie introuvable.");
  if (period.status !== "LOCKED") throw new Error("DSN bloquée : la période de paie doit être validée et verrouillée avant préparation de la DSN.");
  if (!period.paymentDate) throw new Error("DSN bloquée : la date de paiement de la période est absente.");
  if (period.year !== 2026) throw new Error(`DSN bloquée : le générateur actuel implémente P26V01 pour 2026, pas l'exercice ${period.year}.`);

  const organizationRows = await prisma.$queryRaw<OrganizationDsnRow[]>`
    SELECT o."id", o."name", o."siret", o."payrollAddress", o."payrollPostalCode", o."payrollCity", o."payrollNafCode", o."payrollDepartment", o."atmpRate",
           ca."idcc" AS "mainCollectiveAgreementCode", o."ijssSubrogation", s."contactName", s."contactEmail", s."contactPhone", s."declaredContactType", s."enterpriseApenCode", s."defaultTestMode", s."urssafSiret", s."retirementSiret", s."paymentIbanCiphertext", s."paymentBic", s."subrogationIbanCiphertext", s."subrogationBic", s."sepaMandatesConfirmed"
    FROM "organizations" o
    LEFT JOIN "collective_agreements" ca ON ca."id" = o."collectiveAgreementId"
    LEFT JOIN "dsn_organization_settings" s ON s."organizationId" = o."id"
    WHERE o."id" = ${input.organizationId}
    LIMIT 1
  `;
  const organization = organizationRows[0];
  if (!organization) throw new Error("DSN bloquée : organisation introuvable.");

  const siret = requiredString(organization.siret, "le SIRET de l'organisation").replace(/\s+/g, "");
  if (!/^\d{14}$/.test(siret)) throw new Error("DSN bloquée : le SIRET de l'organisation doit contenir 14 chiffres.");
  const contactName = requiredString(organization.contactName, "le nom du contact DSN de l'organisation");
  const contactEmail = requiredString(organization.contactEmail, "l'e-mail du contact DSN de l'organisation");
  const contactPhone = requiredString(organization.contactPhone, "le téléphone du contact DSN de l'organisation");
  const declaredContactType = requiredString(organization.declaredContactType, "le type de contact chez le déclaré");
  const enterpriseApenCode = requiredString(organization.enterpriseApenCode, "le code APEN de l'entreprise");
  const payrollDepartment = requiredString(organization.payrollDepartment, "le département de l'établissement");
  const mainCollectiveAgreementCode = requiredString(organization.mainCollectiveAgreementCode, "l'IDCC principal de l'établissement");
  const urssafSiret = dsnOpsSiret(requiredString(organization.urssafSiret, "le SIRET de l'Urssaf"), "SIRET Urssaf");
  const retirementSiret = dsnOpsSiret(requiredString(organization.retirementSiret, "le SIRET de la caisse de retraite"), "SIRET retraite");
  if (urssafSiret === retirementSiret) throw new Error("DSN bloquée : les organismes Urssaf et retraite doivent être distincts.");
  const paymentIban = dsnPaymentIban(decryptDsnSensitiveValue(requiredString(organization.paymentIbanCiphertext, "le compte bancaire de prélèvement")));
  const paymentBic = dsnPaymentBic(requiredString(organization.paymentBic, "le BIC"));
  const subrogationIban = organization.subrogationIbanCiphertext ? dsnPaymentIban(decryptDsnSensitiveValue(organization.subrogationIbanCiphertext)) : null;
  const subrogationBic = organization.subrogationBic ? dsnPaymentBic(organization.subrogationBic) : null;
  if (!organization.sepaMandatesConfirmed) throw new Error("DSN bloquée : confirmez les mandats SEPA enregistrés auprès des organismes et de la DGFiP.");
  const testMode = input.testMode ?? organization.defaultTestMode ?? true;
  if (!testMode) throw new Error("DSN réelle bloquée : le raccordement des cotisations est en recette. Les affiliations complémentaires, événements et retours métier doivent être validés avant ouverture.");
  if (period.month === 4) throw new Error("DSN bloquée : la DSN d'avril nécessite également les contributions annuelles de l'établissement au titre de l'exercice précédent.");


  const calculations = await prisma.payrollCalculation.findMany({
    where: { organizationId: input.organizationId, payrollPeriodId: period.id },
    select: { employeeId: true, grossAmount: true, employeeContributions: true, employerContributions: true, netBeforeTax: true, withholdingTax: true, netPaid: true, netTaxableAmount: true, netSocialAmount: true, calculationSnapshot: true },
    orderBy: { employeeId: "asc" },
  });
  if (calculations.length === 0) throw new Error("DSN bloquée : aucun calcul verrouillé n'est disponible pour la période.");

  const employeeIds = calculations.map((calculation) => calculation.employeeId);
  const [employees, dsnProfiles] = await Promise.all([
    prisma.employee.findMany({ where: { organizationId: input.organizationId, id: { in: employeeIds } }, select: { id: true, firstName: true, lastName: true, position: true, hireDate: true, contractEndDate: true, contractType: true } }),
    prisma.$queryRaw<DsnEmployeeProfileRow[]>`
      SELECT "employeeId", "nirCiphertext", "birthDate", "birthPlace", "birthDepartment", "birthCountryCode", "euClassificationCode",
             "addressLine", "postalCode", "city", "countryCode", "contractNumber", "contractNatureCode", "publicPolicyCode", "pcsEsecCode", "conventionalStatusCode",
             "retirementStatusCode", "workUnitCode", "referenceWorkQuota", "contractWorkQuota", "workModalityCode", "baseSchemeSupplementCode", "sicknessRegimeCode",
             "workLocationId", "oldAgeRegimeCode", "foreignWorkerCode", "employmentStatusCode", "multipleJobsCode", "multipleEmployersCode",
             "workAccidentRegimeCode", "workAccidentRiskCode", "complementaryAffiliations"
      FROM "dsn_employee_profiles"
      WHERE "organizationId" = ${input.organizationId} AND "employeeId" IN (${Prisma.join(employeeIds)})
    `,
  ]);
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const dsnProfileByEmployee = new Map(dsnProfiles.map((profile) => [profile.employeeId, profile]));

  const outOfScope = calculations.flatMap((calculation) => {
    const issues = dsnScopeIssues(asSnapshot(calculation.calculationSnapshot));
    if (issues.length === 0) return [];
    const employee = employeeById.get(calculation.employeeId);
    return [`${employee ? `${employee.firstName} ${employee.lastName}` : calculation.employeeId} : ${issues.join(", ")}`];
  });
  if (outOfScope.length > 0) {
    throw new Error(`DSN préparatoire impossible ce mois-ci. RH Pilot ne déclare pas encore : ${outOfScope.join(" ; ")}. Déposez la DSN de ce mois avec votre expert-comptable ou sur net-entreprises.`);
  }

  const previousCalculations = period.month > 1 ? await prisma.payrollCalculation.findMany({
    where: { organizationId: input.organizationId, employeeId: { in: employeeIds }, payroll_periods: { year: period.year, month: period.month - 1, status: "LOCKED" } },
    select: { employeeId: true, calculationSnapshot: true },
  }) : [];
  const previousByEmployee = new Map(previousCalculations.map((item) => [item.employeeId, item.calculationSnapshot]));
  const identified = identifyDsnAffiliations(calculations.map((calculation) => normalizeDsnComplementaryAffiliations(dsnProfileByEmployee.get(calculation.employeeId)?.complementaryAffiliations)));
  const complementaryByEmployee = new Map(calculations.map((calculation, index) => [calculation.employeeId, identified[index]]));
  const financial: LockedContributionData[] = [];
  const dsnEmployees: DsnP26MonthlyInput["employees"] = [];
  for (const calculation of calculations) {
    const employee = employeeById.get(calculation.employeeId);
    if (!employee) throw new Error(`DSN bloquée : salarié ${calculation.employeeId} introuvable.`);
    if (!employee.contractType) throw new Error(`DSN bloquée : le type de contrat du salarié ${employee.id} est absent.`);
    const dsnProfile = dsnProfileByEmployee.get(employee.id);
    if (!dsnProfile) throw new Error(`DSN bloquée : le profil déclaratif DSN du salarié ${employee.firstName} ${employee.lastName} est absent.`);
    if (dsnProfile.countryCode?.trim()) throw new Error(`DSN bloquée pour ${employee.firstName} ${employee.lastName} : les adresses étrangères ne sont pas encore couvertes par le code de distribution à l'étranger.`);

    const snapshot = asSnapshot(calculation.calculationSnapshot);
    const locked = readLockedContributionSnapshot(calculation.calculationSnapshot);
    if (locked.bulletin.period.year !== period.year || locked.bulletin.period.month !== period.month || locked.bulletin.employee.id !== employee.id) throw new Error("DSN bloquée : le bulletin détaillé ne correspond pas à la période et au salarié.");
    if (locked.inputs.employee.contract !== employee.contractType || locked.inputs.employee.hireDate !== employee.hireDate.toISOString().slice(0, 10) ||
        (locked.inputs.employee.contractEndDate ?? null) !== (employee.contractEndDate?.toISOString().slice(0, 10) ?? null)) throw new Error("DSN bloquée : le contrat actuel diverge du contrat du bulletin verrouillé. Vérifiez les changements déclaratifs.");
    const previousSnapshot = previousByEmployee.get(employee.id);
    assertDsnStableContract(locked.inputs.employee, period, previousSnapshot ? readLockedContributionSnapshot(previousSnapshot).inputs.employee : undefined);
    assertDsnRetirementScope(locked.inputs.employee.executive, dsnProfile.retirementStatusCode);
    const profileSnapshot = snapshot.profile;
    if (!profileSnapshot) throw new Error(`DSN bloquée : le profil paie verrouillé du salarié ${employee.id} est absent.`);
    const baseSalaryCents = requiredNumber(profileSnapshot.baseSalaryCents, `le salaire de base verrouillé du salarié ${employee.id}`);
    const collectiveAgreementId = requiredString(profileSnapshot.collectiveAgreementId, `la convention collective verrouillée du salarié ${employee.id}`);
    const collectiveAgreement = await prisma.collectiveAgreement.findUnique({ where: { id: collectiveAgreementId }, select: { idcc: true } });
    if (!collectiveAgreement?.idcc) throw new Error(`DSN bloquée : l'IDCC du salarié ${employee.id} ne peut pas être résolu depuis le snapshot verrouillé.`);

    const netTaxableAmount = requiredNumber(calculation.netTaxableAmount, `le net imposable du salarié ${employee.id}`);
    const netSocialAmount = requiredNumber(calculation.netSocialAmount, `le montant net social du salarié ${employee.id}`);
    const cappedBaseLine = snapshot.bulletin?.lines?.find((line) => line.code === "VIEILLESSE_PLAF");
    if (!cappedBaseLine || cappedBaseLine.base === undefined || cappedBaseLine.base === null) throw new Error(`DSN bloquée : la base vieillesse plafonnée verrouillée du salarié ${employee.id} est absente.`);
    const cappedContributionBase = requiredNumber(cappedBaseLine.base, "la base vieillesse plafonnée verrouillée");
    const grossAmount = requiredNumber(calculation.grossAmount, `le brut du salarié ${employee.id}`);
    const netBeforeTax = requiredNumber(calculation.netBeforeTax, `le net avant impôt du salarié ${employee.id}`);
    const withholdingTax = requiredNumber(calculation.withholdingTax, `le PAS du salarié ${employee.id}`);
    const netPaid = requiredNumber(calculation.netPaid, `le net payé du salarié ${employee.id}`);
    const employeeContributions = requiredNumber(calculation.employeeContributions, `les cotisations salariales du salarié ${employee.id}`);
    const employerContributions = requiredNumber(calculation.employerContributions, `les cotisations employeur du salarié ${employee.id}`);
    const employerCost = snapshot.socialEngine?.employerCost === undefined ? undefined : Number(snapshot.socialEngine.employerCost);
    const frozenTotals = locked.bulletin.totals;
    for (const [actual, frozen] of [[grossAmount, frozenTotals.grossTotal], [employeeContributions, frozenTotals.employeeContributions], [employerContributions, frozenTotals.employerContributions], [netBeforeTax, frozenTotals.netBeforeTax], [netTaxableAmount, frozenTotals.netTaxable], [netSocialAmount, frozenTotals.netSocial], [withholdingTax, frozenTotals.withholdingTax], [netPaid, frozenTotals.netPaid]]) {
      if (!Number.isFinite(frozen) || Math.round(actual * 100) !== Math.round(frozen * 100)) throw new Error("DSN bloquée : les totaux de la paie et du bulletin détaillé verrouillé divergent.");
    }
    assertPayrollOutputConsistency({ grossAmount, employeeContributions, employerContributions, netBeforeTax, netTaxableAmount, netSocialAmount, withholdingTax, netPaid, ...(Number.isFinite(employerCost) ? { employerCost } : {}) });

    const withholdingProfile = snapshotWithholdingTax(snapshot, employee.id);
    const subrogatedIjssNetAmount = Math.round(locked.bulletin.lines.filter((line) => line.code === "IJSS_SUBROGATION").reduce((total, line) => {
      const amount = Number(line.amount ?? 0);
      if (!Number.isFinite(amount) || amount < 0) throw new Error("DSN bloquée : une IJSS subrogée du bulletin verrouillé est invalide.");
      return total + amount;
    }, 0) * 100) / 100;
    assertPasDsnScopeSupported({ source: withholdingProfile.source, contractType: employee.contractType, hireDate: employee.hireDate, contractEndDate: employee.contractEndDate, hasSubrogatedDailyAllowances: subrogatedIjssNetAmount > 0 });
    const { fiscalNet, pas } = dsnPasFromLockedBulletin({ withholding: (snapshot.bulletin as { withholding?: unknown } | undefined)?.withholding, profile: withholdingProfile, payrollDepartment, contractType: employee.contractType, netTaxableAmount, withholdingAmount: withholdingTax });

    const nir = assertNirFormat(decryptDsnSensitiveValue(dsnProfile.nirCiphertext));
    assertNirBirthYear(nir, dsnProfile.birthDate, employee.id);
    const contributions = mapLockedContributions({ snapshot: calculation.calculationSnapshot, previousSnapshot: previousByEmployee.get(employee.id), employeeNir: nir, urssafSiret, retirementOps: retirementSiret, complementaryAffiliations: complementaryByEmployee.get(employee.id) });
    financial.push(contributions);
    const workLocationId = requiredString(dsnProfile.workLocationId, `le lieu de travail du salarié ${employee.id}`).replace(/\s+/g, "");
    if (workLocationId !== siret) throw new Error(`DSN bloquée pour ${employee.firstName} ${employee.lastName} : le périmètre actuel couvre uniquement le lieu de travail correspondant au SIRET employeur. Les autres lieux nécessitent le bloc S21.G00.85.`);
    if (dsnProfile.sicknessRegimeCode !== "200" || dsnProfile.oldAgeRegimeCode !== "200" || dsnProfile.workAccidentRegimeCode !== "200") throw new Error(`DSN bloquée pour ${employee.firstName} ${employee.lastName} : le moteur social actuel est ouvert au dépôt préparatoire uniquement pour le régime général (codes 200 maladie/vieillesse/AT).`);
    const riskCode = requiredString(dsnProfile.workAccidentRiskCode, `le code risque AT/MP du salarié ${employee.id}`).toUpperCase();
    if (riskCode === "999ZZ") throw new Error(`DSN bloquée pour ${employee.firstName} ${employee.lastName} : un taux AT/MP est déjà utilisé par le calcul de paie, le code risque d'attente 999ZZ serait incohérent.`);

    if (dsnProfile.workUnitCode !== "10") throw new Error("DSN bloquée : seuls les contrats horaires sont raccordés au moteur actuel.");
    const expectedNature = locked.inputs.employee.contract === "CDI" ? "01" : locked.inputs.employee.contract === "CDD" ? "02" : null;
    if (!expectedNature || dsnProfile.contractNatureCode !== expectedNature || dsnProfile.publicPolicyCode !== "99") throw new Error("DSN bloquée : la nature déclarative du contrat ne correspond pas au contrat ordinaire du bulletin verrouillé.");
    const referenceWorkQuota = requiredNumber(dsnProfile.referenceWorkQuota, `la quotité de référence du salarié ${employee.id}`);
    const contractWorkQuota = requiredNumber(dsnProfile.contractWorkQuota, `la quotité contractuelle du salarié ${employee.id}`);
    const lockedMonthlyHours = profileSnapshot.monthlyHours == null ? null : Number(profileSnapshot.monthlyHours);
    if (dsnProfile.workUnitCode === "10" && Number.isFinite(lockedMonthlyHours) && Math.abs((lockedMonthlyHours as number) - contractWorkQuota) > 0.01) throw new Error(`DSN bloquée pour ${employee.firstName} ${employee.lastName} : la quotité horaire DSN (${contractWorkQuota}) ne correspond pas aux heures mensuelles verrouillées (${lockedMonthlyHours}).`);

    dsnEmployees.push({
      nir, lastName: employee.lastName, firstName: employee.firstName, sexCode: null, birthDate: dsnProfile.birthDate, birthPlace: dsnProfile.birthPlace,
      birthDepartment: dsnProfile.birthDepartment, birthCountryCode: requiredString(dsnProfile.birthCountryCode, `le pays de naissance du salarié ${employee.id}`),
      euClassificationCode: requiredString(dsnProfile.euClassificationCode, `la codification UE du salarié ${employee.id}`), addressLine: dsnProfile.addressLine,
      postalCode: dsnProfile.postalCode, city: dsnProfile.city, countryCode: null, position: requiredString(employee.position, `l'emploi du salarié ${employee.id}`),
      contract: {
        startDate: employee.hireDate, endDate: employee.contractEndDate, contractNumber: dsnProfile.contractNumber, contractNatureCode: dsnProfile.contractNatureCode,
        publicPolicyCode: dsnProfile.publicPolicyCode, pcsEsecCode: dsnProfile.pcsEsecCode, conventionalStatusCode: dsnProfile.conventionalStatusCode,
        retirementStatusCode: dsnProfile.retirementStatusCode, workUnitCode: dsnProfile.workUnitCode, referenceWorkQuota, contractWorkQuota,
        workModalityCode: dsnProfile.workModalityCode, baseSchemeSupplementCode: requiredString(dsnProfile.baseSchemeSupplementCode, `le complément de régime du salarié ${employee.id}`),
        collectiveAgreementCode: collectiveAgreement.idcc, sicknessRegimeCode: dsnProfile.sicknessRegimeCode, workLocationId, oldAgeRegimeCode: dsnProfile.oldAgeRegimeCode,
        foreignWorkerCode: requiredString(dsnProfile.foreignWorkerCode, `le statut travailleur étranger du salarié ${employee.id}`), employmentStatusCode: requiredString(dsnProfile.employmentStatusCode, `le statut d'emploi du salarié ${employee.id}`),
        multipleJobsCode: requiredString(dsnProfile.multipleJobsCode, `le code emplois multiples du salarié ${employee.id}`), multipleEmployersCode: requiredString(dsnProfile.multipleEmployersCode, `le code employeurs multiples du salarié ${employee.id}`),
        workAccidentRegimeCode: requiredString(dsnProfile.workAccidentRegimeCode, `le régime AT/MP du salarié ${employee.id}`), workAccidentRiskCode: riskCode, workAccidentRate: contributions.atmpRatePercent,
        workStoppages: contributions.workStoppages.stoppages.map((item) => ({
          reasonCode: item.reasonCode,
          lastDayWorked: new Date(item.lastDayWorked + "T00:00:00.000Z"),
          expectedEndDate: new Date(item.expectedEnd + "T00:00:00.000Z"),
          subrogationCode: item.subrogationCode,
          ...(item.recoveryDate ? { recoveryDate: new Date(item.recoveryDate + "T00:00:00.000Z"), recoveryReasonCode: item.recoveryReasonCode } : {}),
        })),
        suspensions: contributions.unpaidAbsence.suspensions.map((item) => ({
          reasonCode: item.reasonCode,
          startDate: new Date(`${item.start}T00:00:00.000Z`),
          endDate: new Date(`${item.end}T00:00:00.000Z`),
        })),
      },
      payroll: {
        baseSalary: baseSalaryCents / 100,
        grossAmount,
        cappedContributionBase,
        grossSubject: contributions.grossSubject,
        unemploymentBase: contributions.unemploymentBase,
        paidHours: contributions.activityPaidHours,
        netBeforeTax,
        netTaxableAmount: fiscalNet,
        netSocialAmount,
        withholdingTax,
        pas,
        overtimeRemunerations: contributions.overtime.remunerations,
        overtimeTaxExemptNetAmount: contributions.overtime.taxExemptNetAmount,
        absenceActivityHours: contributions.activityAbsenceHours,
      },
    });
  }

  const liabilities = new Map<string, number>();
  for (const item of financial) for (const liability of item.liabilities) liabilities.set(liability.opsIdentifier, Math.round(((liabilities.get(liability.opsIdentifier) ?? 0) + liability.amount) * 100) / 100);
  const pasTotal = Math.round(dsnEmployees.reduce((total, employee) => total + employee.payroll.withholdingTax, 0) * 100) / 100;
  if (pasTotal > 0) liabilities.set("DGFIP", pasTotal);
  const aggregates = mergeLockedAggregates(financial.map((item) => item.aggregates));
  const complementaryGroups = new Map<string, DsnOpsPayment>();
  for (const item of financial.flatMap((data) => data.complementaryPayments)) {
    const key = JSON.stringify([item.opsIdentifier, item.delegateCode]);
    let payment = complementaryGroups.get(key);
    if (!payment) {
      payment = { opsIdentifier: item.opsIdentifier, amount: 0, paymentModeCode: "05", iban: paymentIban, bic: paymentBic, delegateCode: item.delegateCode, components: [] };
      complementaryGroups.set(key, payment);
    }
    payment.amount = Math.round((payment.amount + item.amount) * 100) / 100;
    const component = payment.components!.find((entry) => entry.contractReference === item.contractReference && entry.period === item.period);
    if (component) component.amount = Math.round((component.amount + item.amount) * 100) / 100;
    else payment.components!.push({ amount: item.amount, contractReference: item.contractReference, period: item.period });
  }
  const complementaryOps = new Set([...complementaryGroups.values()].map((payment) => payment.opsIdentifier));
  const payments: DsnOpsPayment[] = [
    ...[...liabilities].filter(([opsIdentifier]) => !complementaryOps.has(opsIdentifier)).map(([opsIdentifier, amount]) => ({ opsIdentifier, amount, paymentModeCode: "05", iban: paymentIban, bic: paymentBic })),
    ...complementaryGroups.values(),
  ];
  const adhesions = [...new Map(financial.flatMap((item) => item.complementaryAdhesions).map((adhesion) => [adhesion.id, adhesion])).values()];
  const content = buildDsnP26V01Complete({
    testMode: true, declarationOrder: input.declarationOrder ?? 1, fileDate: input.fileDate ?? new Date(),
    emitter: { siret, name: organization.name, address: requiredString(organization.payrollAddress, "l'adresse de paie de l'organisation"), postalCode: requiredString(organization.payrollPostalCode, "le code postal de l'organisation"), city: requiredString(organization.payrollCity, "la ville de l'organisation"), contactName, contactEmail, contactPhone, declaredContactType, enterpriseApenCode },
    establishment: { nafCode: requiredString(organization.payrollNafCode, "le code APET de l'établissement"), collectiveAgreementCode: mainCollectiveAgreementCode },
    period: { year: period.year, month: period.month, paymentDate: period.paymentDate }, employees: dsnEmployees,
    assessedBases: financial.flatMap((item) => item.bases),
    complementaryAdhesions: adhesions, complementaryAffiliations: financial.flatMap((item) => item.complementaryAffiliations),
    expectedLiabilities: [...liabilities].map(([opsIdentifier, amount]) => ({ opsIdentifier, amount })),
    contributionBordereau: { opsIdentifier: urssafSiret, totalAmount: liabilities.get(urssafSiret) ?? 0, aggregatedContributions: aggregates, individualContributions: financial.flatMap((item) => item.individual) }, payments,
  });

  return { content, fileName: `dsn-P26V01-${period.year}-${String(period.month).padStart(2, "0")}-precontrole.txt`, normVersion: "P26V01", employeeCount: dsnEmployees.length, warnings: ["Export de pré-contrôle uniquement : le dépôt réel reste désactivé.", "Les cotisations du périmètre pris en charge sont rapprochées des bulletins verrouillés. Les affiliations complémentaires et événements non couverts bloquent l’export.", ...financial.flatMap((item) => item.deferred.map((deferred) => `Charge différée : ${deferred.code}, ${deferred.amount.toFixed(2)} EUR ; ${deferred.declaration}.`)), "Le fichier doit être contrôlé avec Dsn-Val avant toute utilisation déclarative."] };
}
