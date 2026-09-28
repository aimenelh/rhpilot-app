import { prisma } from "@/lib/prisma";
import { ensureOrganizationRegistryData } from "@/lib/organization-registry-sync";
import { LEGAL_CATEGORIES, type LegalCategory } from "./social-engine";

export type SocialOrganizationContext = {
  legalCategory: LegalCategory;
  atmpRate: number;
  healthPlanMonthlyAmount: number;
  healthPlanEmployerRate: number;
  companyCreationDate: Date;
  payrollCity: string;
  payrollDepartment: string;
};

type SocialRow = {
  legalCategory: string | null;
  atmpRate: unknown;
  healthPlanMonthlyAmount: unknown;
  healthPlanEmployerRate: unknown;
  companyCreationDate: Date | null;
  payrollCity: string | null;
  payrollDepartment: string | null;
};

async function loadSocialRow(organizationId: string): Promise<SocialRow | undefined> {
  const rows = await prisma.$queryRaw<SocialRow[]>`
    SELECT "legalCategory", "atmpRate", "healthPlanMonthlyAmount", "healthPlanEmployerRate", "companyCreationDate", "payrollCity", "payrollDepartment"
    FROM "organizations"
    WHERE "id" = ${organizationId}
    LIMIT 1
  `;
  return rows[0];
}

const SETTINGS_PATH = "Configuration > Organisation";
const OFFICIAL_DATA_HINT = `Cette donnée est reprise du répertoire Sirene à partir du SIRET : dans ${SETTINGS_PATH}, cliquez sur « Actualiser depuis le SIRET », ou corrigez-la à la main.`;

export async function resolveOrganizationLegalCategory(
  organizationId: string,
): Promise<SocialOrganizationContext> {
  let row = await loadSocialRow(organizationId);
  // Forme juridique, date de création, commune et département viennent du registre : on les complète avant de bloquer.
  const officialDataMissing = !row?.legalCategory || !row.companyCreationDate || !row.payrollCity?.trim() || !row.payrollDepartment?.trim();
  if (officialDataMissing) {
    await ensureOrganizationRegistryData(organizationId);
    row = await loadSocialRow(organizationId);
  }

  const legalCategory = row?.legalCategory ?? "";
  if (!(LEGAL_CATEGORIES as readonly string[]).includes(legalCategory)) {
    throw new Error(`Le calcul social est bloqué : la forme juridique de l'organisation est inconnue. ${OFFICIAL_DATA_HINT}`);
  }

  const atmpRate = Number(row?.atmpRate);
  if (row?.atmpRate === null || row?.atmpRate === undefined || !Number.isFinite(atmpRate) || atmpRate < 0 || atmpRate > 100) {
    throw new Error(`Le calcul social est bloqué : indiquez le taux AT/MP de l'établissement dans ${SETTINGS_PATH}. Il est propre à chaque entreprise et figure sur la notification annuelle de taux, consultable dans le compte AT/MP sur net-entreprises.fr.`);
  }

  const healthPlanMonthlyAmount = Number(row?.healthPlanMonthlyAmount);
  if (!Number.isFinite(healthPlanMonthlyAmount) || healthPlanMonthlyAmount <= 0) {
    throw new Error(`Le calcul social est bloqué : indiquez la cotisation mensuelle de votre contrat de complémentaire santé dans ${SETTINGS_PATH} (elle figure sur le contrat ou l'appel de cotisation de l'assureur).`);
  }

  const healthPlanEmployerRate = Number(row?.healthPlanEmployerRate);
  if (!Number.isFinite(healthPlanEmployerRate) || healthPlanEmployerRate < 50 || healthPlanEmployerRate > 100) {
    throw new Error(`Le calcul social est bloqué : la part employeur de la complémentaire santé doit être comprise entre 50 % et 100 % (${SETTINGS_PATH}).`);
  }

  if (!(row?.companyCreationDate instanceof Date) || Number.isNaN(row.companyCreationDate.getTime())) {
    throw new Error(`Le calcul social est bloqué : la date de création de l'entreprise est inconnue. ${OFFICIAL_DATA_HINT}`);
  }

  const payrollCity = row.payrollCity?.trim() ?? "";
  if (!payrollCity) {
    throw new Error(`Le calcul social est bloqué : la commune de l'établissement est inconnue. ${OFFICIAL_DATA_HINT}`);
  }

  const payrollDepartment = row.payrollDepartment?.trim() ?? "";
  if (!payrollDepartment) {
    throw new Error(`Le calcul social est bloqué : le département de l'établissement est inconnu. ${OFFICIAL_DATA_HINT}`);
  }

  return {
    legalCategory: legalCategory as LegalCategory,
    atmpRate,
    healthPlanMonthlyAmount,
    healthPlanEmployerRate,
    companyCreationDate: row.companyCreationDate,
    payrollCity,
    payrollDepartment,
  };
}
