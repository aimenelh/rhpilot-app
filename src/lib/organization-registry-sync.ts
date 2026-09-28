/**
 * Reprise automatique de l'identité de l'organisation depuis son SIRET :
 * forme juridique, date de création, code APE, adresse, commune et
 * département de l'établissement, convention collective déclarée, puis
 * taux de versement mobilité de la commune (barème Urssaf).
 *
 * Deux modes :
 * - « compléter » (création de l'espace, calcul de paie) : ne remplit que
 *   les champs vides, ne remplace jamais une saisie de l'entreprise ;
 * - « actualiser » (bouton dans les paramètres) : reprend les valeurs du
 *   registre, sauf la convention si celle choisie figure parmi celles déclarées.
 */
import { prisma } from "@/lib/prisma";
import { checkSiret } from "@/lib/siret";
import { lookupCommuneCode, lookupCompanyBySiret, samePlace, type CompanyRegistryRecord } from "@/lib/company-registry";
import { ensureCollectiveAgreementByIdcc } from "@/lib/collective-agreement-referential";
import { describeMobilityRate, fetchMobilityRate } from "@/lib/payroll/mobility-rate";

export type RegistrySyncMode = "FILL_BLANKS" | "OVERWRITE";

export type RegistrySyncOutcome =
  | { status: "SYNCED"; record: CompanyRegistryRecord; updatedFields: string[]; convention: { idcc: string; name: string } | null; notes: string[] }
  | { status: "NO_SIRET" | "NOT_FOUND" | "UNAVAILABLE"; message: string };

type OrganizationRow = {
  siret: string | null;
  payrollAddress: string | null;
  payrollPostalCode: string | null;
  payrollCity: string | null;
  payrollNafCode: string | null;
  collectiveAgreementId: string | null;
  legalCategory: string | null;
  companyCreationDate: Date | null;
  payrollDepartment: string | null;
  payrollCommuneCode: string | null;
  mobilityRateSource: string | null;
  registrySyncedAt: Date | null;
  registryCheckedAt: Date | null;
};

async function loadOrganization(organizationId: string): Promise<OrganizationRow | null> {
  const rows = await prisma.$queryRaw<OrganizationRow[]>`
    SELECT "siret", "payrollAddress", "payrollPostalCode", "payrollCity", "payrollNafCode", "collectiveAgreementId",
           "legalCategory", "companyCreationDate", "payrollDepartment", "payrollCommuneCode", "mobilityRateSource", "registrySyncedAt", "registryCheckedAt"
    FROM "organizations" WHERE "id" = ${organizationId} LIMIT 1
  `;
  return rows[0] ?? null;
}

const isBlank = (value: unknown) => value === null || value === undefined || (typeof value === "string" && value.trim() === "");

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function syncOrganizationFromRegistry(organizationId: string, mode: RegistrySyncMode): Promise<RegistrySyncOutcome> {
  const organization = await loadOrganization(organizationId);
  if (!organization) return { status: "NOT_FOUND", message: "Organisation introuvable." };
  const siretCheck = checkSiret(organization.siret);
  if (!siretCheck.ok) return { status: "NO_SIRET", message: "Le SIRET de l'organisation est absent ou invalide : les données officielles ne peuvent pas être reprises." };

  // Tentative mémorisée même en cas d'échec : le calcul de paie ne réinterroge pas le registre à chaque fois.
  await prisma.$executeRaw`UPDATE "organizations" SET "registryCheckedAt" = ${new Date()} WHERE "id" = ${organizationId}`;
  const lookup = await lookupCompanyBySiret(siretCheck.siret);
  if (lookup.status !== "FOUND") return lookup;
  const record = lookup.record;
  const overwrite = mode === "OVERWRITE";
  const take = <T>(current: T | null, next: T | null): T | null => (next !== null && (overwrite || isBlank(current)) ? next : current);

  // Adresse, code postal, commune, code Insee et département vont ensemble : si l'entreprise a saisi
  // une autre commune que celle du SIRET (paie d'un autre établissement), on ne mélange pas les deux.
  const currentCity = organization.payrollCity?.trim() ?? "";
  const placeFromRegistry = overwrite || !currentCity || (record.city !== null && samePlace(currentCity, record.city));
  const communeForTypedCity = !placeFromRegistry && isBlank(organization.payrollCommuneCode)
    ? await lookupCommuneCode(organization.payrollPostalCode?.trim() || null, currentCity)
    : null;

  const next = {
    payrollAddress: placeFromRegistry ? take(organization.payrollAddress, record.address) : organization.payrollAddress,
    payrollPostalCode: placeFromRegistry ? take(organization.payrollPostalCode, record.postalCode) : organization.payrollPostalCode,
    payrollCity: placeFromRegistry ? take(organization.payrollCity, record.city) : organization.payrollCity,
    payrollNafCode: take(organization.payrollNafCode, record.nafCode),
    legalCategory: take(organization.legalCategory, record.legalCategory),
    companyCreationDate: take(organization.companyCreationDate, record.creationDate ? new Date(`${record.creationDate}T00:00:00.000Z`) : null),
    payrollDepartment: placeFromRegistry ? take(organization.payrollDepartment, record.department) : organization.payrollDepartment,
    payrollCommuneCode: placeFromRegistry ? take(organization.payrollCommuneCode, record.communeCode) : organization.payrollCommuneCode ?? communeForTypedCity,
  };

  const updatedFields: string[] = (Object.keys(next) as Array<keyof typeof next>).filter((key) => {
    const before = organization[key];
    const after = next[key];
    if (before instanceof Date || after instanceof Date) return (before as Date | null)?.getTime() !== (after as Date | null)?.getTime();
    return before !== after;
  });

  const notes: string[] = [];
  if (!placeFromRegistry) notes.push(`La commune saisie (${currentCity}) diffère de celle du SIRET (${record.city ?? "inconnue"}) : l'adresse de paie saisie est conservée.`);
  if (!record.establishmentMatched) notes.push("Ce SIRET n'a pas été retrouvé tel quel : l'adresse reprise est celle du siège de l'entreprise.");
  if (!record.active) notes.push("Le répertoire Sirene indique que cet établissement est fermé.");

  // Convention collective déclarée en DSN pour l'établissement.
  let convention: { idcc: string; name: string } | null = null;
  let conventionUpdate: { id: string; name: string } | null = null;
  if (record.conventions.length > 0) {
    const current = organization.collectiveAgreementId
      ? await prisma.collectiveAgreement.findUnique({ where: { id: organization.collectiveAgreementId }, select: { id: true, idcc: true, name: true } })
      : null;
    const currentIsDeclared = current ? record.conventions.some((declared) => declared.idcc === current.idcc) : false;
    if (current && (currentIsDeclared || !overwrite)) {
      convention = { idcc: current.idcc, name: current.name };
    } else {
      const chosen = record.conventions[0];
      const agreement = await ensureCollectiveAgreementByIdcc(chosen.idcc, chosen.title);
      convention = { idcc: agreement.idcc, name: agreement.name };
      conventionUpdate = { id: agreement.id, name: agreement.name };
      updatedFields.push("collectiveAgreementId");
    }
    if (record.conventions.length > 1) {
      notes.push(`Plusieurs conventions sont déclarées pour cet établissement (IDCC ${record.conventions.map((declared) => declared.idcc).join(", ")}) : vérifiez celle retenue.`);
    }
  } else if (!organization.collectiveAgreementId) {
    notes.push("Aucune convention collective n'est encore déclarée pour ce SIRET (c'est le cas des entreprises qui n'ont pas encore fait de DSN) : choisissez-la dans la liste.");
  }

  const communeChanged = next.payrollCommuneCode !== organization.payrollCommuneCode;
  const snapshot = {
    source: "recherche-entreprises.api.gouv.fr",
    siret: record.siret,
    name: record.name,
    legalNatureCode: record.legalNatureCode,
    nafCode: record.nafCode,
    communeCode: record.communeCode,
    headcountRange: record.headcountRange,
    conventions: record.conventions,
    establishmentMatched: record.establishmentMatched,
    active: record.active,
  };

  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        payrollAddress: next.payrollAddress,
        payrollPostalCode: next.payrollPostalCode,
        payrollCity: next.payrollCity,
        payrollNafCode: next.payrollNafCode,
        ...(conventionUpdate ? { collectiveAgreementId: conventionUpdate.id, conventionCollective: conventionUpdate.name } : {}),
      },
    });
    await tx.$executeRaw`
      UPDATE "organizations"
      SET "legalCategory" = ${next.legalCategory}, "companyCreationDate" = ${next.companyCreationDate},
          "payrollDepartment" = ${next.payrollDepartment}, "payrollCommuneCode" = ${next.payrollCommuneCode},
          "registrySyncedAt" = ${new Date()}, "registrySnapshot" = ${JSON.stringify(snapshot)}::jsonb
      WHERE "id" = ${organizationId}
    `;
    // Nouvelle commune : le taux Urssaf mémorisé ne vaut plus (une saisie manuelle, elle, est conservée).
    if (communeChanged && organization.mobilityRateSource !== "MANUEL") {
      await tx.$executeRaw`
        UPDATE "organizations" SET "mobilityRate" = NULL, "mobilityRateSource" = NULL, "mobilityRateCheckedAt" = NULL, "mobilityRateDetail" = NULL
        WHERE "id" = ${organizationId}
      `;
    }
  });

  if (next.payrollCommuneCode && organization.mobilityRateSource !== "MANUEL") {
    await refreshMobilityRateFromUrssaf(organizationId, next.payrollCommuneCode, todayIso());
  }

  return { status: "SYNCED", record, updatedFields, convention, notes };
}

/** Interroge le barème Urssaf et mémorise le taux (sans toucher à une saisie manuelle). */
export async function refreshMobilityRateFromUrssaf(organizationId: string, communeCode: string, day: string): Promise<{ ratePercent: number; detail: string } | null> {
  const resolution = await fetchMobilityRate(communeCode, day);
  if (resolution.status !== "RESOLVED") return null;
  const detail = describeMobilityRate(resolution);
  await prisma.$executeRaw`
    UPDATE "organizations"
    SET "mobilityRate" = ${resolution.ratePercent}, "mobilityRateSource" = 'URSSAF', "mobilityRateCheckedAt" = ${new Date()}, "mobilityRateDetail" = ${detail}
    WHERE "id" = ${organizationId} AND ("mobilityRateSource" IS NULL OR "mobilityRateSource" <> 'MANUEL')
  `;
  return { ratePercent: resolution.ratePercent, detail };
}

/**
 * Filet de sécurité pour les organisations créées avant la reprise
 * automatique : si le registre n'a jamais été consulté et qu'une donnée
 * officielle manque, on la complète une fois. Sans effet sinon.
 */
export async function ensureOrganizationRegistryData(organizationId: string): Promise<void> {
  const organization = await loadOrganization(organizationId);
  if (!organization || organization.registrySyncedAt) return;
  // Registre injoignable ou SIRET introuvable il y a moins d'un jour : on n'insiste pas.
  if (organization.registryCheckedAt && Date.now() - organization.registryCheckedAt.getTime() < 24 * 60 * 60 * 1000) return;
  const missing = [organization.legalCategory, organization.companyCreationDate, organization.payrollCity, organization.payrollDepartment, organization.payrollCommuneCode, organization.payrollNafCode].some(isBlank);
  if (!missing) return;
  try {
    await syncOrganizationFromRegistry(organizationId, "FILL_BLANKS");
  } catch (error) {
    console.error("Reprise des données Sirene impossible :", error);
  }
}
