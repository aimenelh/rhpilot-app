import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildDsnP26V01Monthly, type DsnP26MonthlyInput } from "./dsn-p26v01";
import { decryptDsnSensitiveValue, assertNirFormat } from "./dsn-pii";
import { assertPasDsnScopeSupported, buildDsnPasData } from "./pas-dsn";
import { assertPayrollOutputConsistency } from "./payroll-output-consistency";
import type { WithholdingTaxProfile } from "./withholding-tax-profile";

export type DsnPreparationResult = { content: string; fileName: string; normVersion: "P26V01"; employeeCount: number; warnings: string[] };

type SnapshotWithholdingTax = { rate: number; amount: number; validFrom: string; validUntil: string | null; source: string; sourceReference: string | null };
type CalculationSnapshot = { profile?: { id?: string; baseSalaryCents?: number; monthlyHours?: string | null; collectiveAgreementId?: string | null }; variables?: unknown[]; validatedAbsences?: unknown[]; withholdingTax?: Partial<SnapshotWithholdingTax>; socialEngine?: { employerCost?: number } };

type OrganizationDsnRow = {
  id: string; name: string; siret: string | null; payrollAddress: string | null; payrollPostalCode: string | null; payrollCity: string | null;
  payrollNafCode: string | null; payrollDepartment: string | null; atmpRate: unknown; mainCollectiveAgreementCode: string | null;
  contactName: string | null; contactEmail: string | null; contactPhone: string | null; declaredContactType: string | null; enterpriseApenCode: string | null; defaultTestMode: boolean | null;
};

type DsnEmployeeProfileRow = {
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
function requiredNumber(value: unknown, label: string): number { const number = Number(value); if (!Number.isFinite(number)) throw new Error(`DSN bloquée : ${label} est absent ou invalide.`); return number; }

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

function assertSimpleDsnScope(snapshot: CalculationSnapshot, employeeId: string): void {
  if ((snapshot.variables?.length ?? 0) > 0) throw new Error(`DSN bloquée pour le salarié ${employeeId} : les variables de paie nécessitent encore leur ventilation NEODeS en blocs prime/autre revenu avant export.`);
  if ((snapshot.validatedAbsences?.length ?? 0) > 0) throw new Error(`DSN bloquée pour le salarié ${employeeId} : les absences nécessitent encore leur ventilation détaillée d'activité/événement avant export.`);
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
           ca."idcc" AS "mainCollectiveAgreementCode", s."contactName", s."contactEmail", s."contactPhone", s."declaredContactType", s."enterpriseApenCode", s."defaultTestMode"
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
  const contactEmail = requiredString(organization.contactEmail, "l'email du contact DSN de l'organisation");
  const contactPhone = requiredString(organization.contactPhone, "le téléphone du contact DSN de l'organisation");
  const declaredContactType = requiredString(organization.declaredContactType, "le type de contact chez le déclaré");
  const enterpriseApenCode = requiredString(organization.enterpriseApenCode, "le code APEN de l'entreprise");
  const payrollDepartment = requiredString(organization.payrollDepartment, "le département de l'établissement");
  const mainCollectiveAgreementCode = requiredString(organization.mainCollectiveAgreementCode, "l'IDCC principal de l'établissement");
  const atmpRate = requiredNumber(organization.atmpRate, "le taux AT/MP de l'établissement");
  if (atmpRate < 0 || atmpRate > 100) throw new Error("DSN bloquée : le taux AT/MP de l'établissement est hors limites.");

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
             "workAccidentRegimeCode", "workAccidentRiskCode"
      FROM "dsn_employee_profiles"
      WHERE "organizationId" = ${input.organizationId} AND "employeeId" IN (${Prisma.join(employeeIds)})
    `,
  ]);
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const dsnProfileByEmployee = new Map(dsnProfiles.map((profile) => [profile.employeeId, profile]));

  const dsnEmployees: DsnP26MonthlyInput["employees"] = [];
  for (const calculation of calculations) {
    const employee = employeeById.get(calculation.employeeId);
    if (!employee) throw new Error(`DSN bloquée : salarié ${calculation.employeeId} introuvable.`);
    if (!employee.contractType) throw new Error(`DSN bloquée : le type de contrat du salarié ${employee.id} est absent.`);
    const dsnProfile = dsnProfileByEmployee.get(employee.id);
    if (!dsnProfile) throw new Error(`DSN bloquée : le profil déclaratif DSN du salarié ${employee.firstName} ${employee.lastName} est absent.`);
    if (dsnProfile.countryCode?.trim()) throw new Error(`DSN bloquée pour ${employee.firstName} ${employee.lastName} : les adresses étrangères ne sont pas encore couvertes par le code de distribution à l'étranger.`);

    const snapshot = asSnapshot(calculation.calculationSnapshot);
    assertSimpleDsnScope(snapshot, employee.id);
    const profileSnapshot = snapshot.profile;
    if (!profileSnapshot) throw new Error(`DSN bloquée : le profil paie verrouillé du salarié ${employee.id} est absent.`);
    const baseSalaryCents = requiredNumber(profileSnapshot.baseSalaryCents, `le salaire de base verrouillé du salarié ${employee.id}`);
    const collectiveAgreementId = requiredString(profileSnapshot.collectiveAgreementId, `la convention collective verrouillée du salarié ${employee.id}`);
    const collectiveAgreement = await prisma.collectiveAgreement.findUnique({ where: { id: collectiveAgreementId }, select: { idcc: true } });
    if (!collectiveAgreement?.idcc) throw new Error(`DSN bloquée : l'IDCC du salarié ${employee.id} ne peut pas être résolu depuis le snapshot verrouillé.`);

    const netTaxableAmount = requiredNumber(calculation.netTaxableAmount, `le net imposable du salarié ${employee.id}`);
    const netSocialAmount = requiredNumber(calculation.netSocialAmount, `le montant net social du salarié ${employee.id}`);
    const grossAmount = requiredNumber(calculation.grossAmount, `le brut du salarié ${employee.id}`);
    const netBeforeTax = requiredNumber(calculation.netBeforeTax, `le net avant impôt du salarié ${employee.id}`);
    const withholdingTax = requiredNumber(calculation.withholdingTax, `le PAS du salarié ${employee.id}`);
    const netPaid = requiredNumber(calculation.netPaid, `le net payé du salarié ${employee.id}`);
    const employeeContributions = requiredNumber(calculation.employeeContributions, `les cotisations salariales du salarié ${employee.id}`);
    const employerContributions = requiredNumber(calculation.employerContributions, `les cotisations employeur du salarié ${employee.id}`);
    const employerCost = snapshot.socialEngine?.employerCost === undefined ? undefined : Number(snapshot.socialEngine.employerCost);
    assertPayrollOutputConsistency({ grossAmount, employeeContributions, employerContributions, netBeforeTax, netTaxableAmount, netSocialAmount, withholdingTax, netPaid, ...(Number.isFinite(employerCost) ? { employerCost } : {}) });

    const withholdingProfile = snapshotWithholdingTax(snapshot, employee.id);
    assertPasDsnScopeSupported({ source: withholdingProfile.source, contractType: employee.contractType, hireDate: employee.hireDate, contractEndDate: employee.contractEndDate, hasSubrogatedDailyAllowances: false });
    const pas = buildDsnPasData({ profile: withholdingProfile, payrollDepartment, netTaxableAmount, withholdingAmount: withholdingTax });

    const nir = assertNirFormat(decryptDsnSensitiveValue(dsnProfile.nirCiphertext));
    assertNirBirthYear(nir, dsnProfile.birthDate, employee.id);
    const workLocationId = requiredString(dsnProfile.workLocationId, `le lieu de travail du salarié ${employee.id}`).replace(/\s+/g, "");
    if (workLocationId !== siret) throw new Error(`DSN bloquée pour ${employee.firstName} ${employee.lastName} : le périmètre actuel couvre uniquement le lieu de travail correspondant au SIRET employeur. Les autres lieux nécessitent le bloc S21.G00.85.`);
    if (dsnProfile.sicknessRegimeCode !== "200" || dsnProfile.oldAgeRegimeCode !== "200" || dsnProfile.workAccidentRegimeCode !== "200") throw new Error(`DSN bloquée pour ${employee.firstName} ${employee.lastName} : le moteur social actuel est ouvert au dépôt préparatoire uniquement pour le régime général (codes 200 maladie/vieillesse/AT).`);
    const riskCode = requiredString(dsnProfile.workAccidentRiskCode, `le code risque AT/MP du salarié ${employee.id}`).toUpperCase();
    if (riskCode === "999ZZ") throw new Error(`DSN bloquée pour ${employee.firstName} ${employee.lastName} : un taux AT/MP est déjà utilisé par le calcul de paie, le code risque d'attente 999ZZ serait incohérent.`);

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
        workAccidentRegimeCode: requiredString(dsnProfile.workAccidentRegimeCode, `le régime AT/MP du salarié ${employee.id}`), workAccidentRiskCode: riskCode, workAccidentRate: atmpRate,
      },
      payroll: { baseSalary: baseSalaryCents / 100, grossAmount, netBeforeTax, netTaxableAmount, netSocialAmount, withholdingTax, pas },
    });
  }

  const testMode = input.testMode ?? organization.defaultTestMode ?? true;
  if (!testMode) throw new Error("DSN réelle bloquée : RH Pilot autorise pour l'instant uniquement l'export de pré-contrôle P26V01. Les blocs de cotisations/paiements organisme doivent être mappés puis le fichier doit passer Dsn-Val avant ouverture du mode réel.");

  const content = buildDsnP26V01Monthly({
    testMode: true, declarationOrder: input.declarationOrder ?? 1, fileDate: input.fileDate ?? new Date(),
    emitter: { siret, name: organization.name, address: requiredString(organization.payrollAddress, "l'adresse de paie de l'organisation"), postalCode: requiredString(organization.payrollPostalCode, "le code postal de l'organisation"), city: requiredString(organization.payrollCity, "la ville de l'organisation"), contactName, contactEmail, contactPhone, declaredContactType, enterpriseApenCode },
    establishment: { nafCode: requiredString(organization.payrollNafCode, "le code APET de l'établissement"), collectiveAgreementCode: mainCollectiveAgreementCode },
    period: { year: period.year, month: period.month, paymentDate: period.paymentDate }, employees: dsnEmployees,
  });

  return { content, fileName: `dsn-P26V01-${period.year}-${String(period.month).padStart(2, "0")}-precontrole.txt`, normVersion: "P26V01", employeeCount: dsnEmployees.length, warnings: ["Export de pré-contrôle uniquement : le dépôt réel reste désactivé.", "Les blocs de cotisations et paiements organisme ne sont pas encore émis tant qu'un mapping NEODeS vérifié n'est pas disponible.", "Le fichier doit être contrôlé avec Dsn-Val avant toute utilisation déclarative."] };
}
