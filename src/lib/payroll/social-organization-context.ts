import { prisma } from "@/lib/prisma";
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

export async function resolveOrganizationLegalCategory(
  organizationId: string,
): Promise<SocialOrganizationContext> {
  const rows = await prisma.$queryRaw<Array<{
    legalCategory: string | null;
    atmpRate: unknown;
    healthPlanMonthlyAmount: unknown;
    healthPlanEmployerRate: unknown;
    companyCreationDate: Date | null;
    payrollCity: string | null;
    payrollDepartment: string | null;
  }>>`
    SELECT "legalCategory", "atmpRate", "healthPlanMonthlyAmount", "healthPlanEmployerRate", "companyCreationDate", "payrollCity", "payrollDepartment"
    FROM "organizations"
    WHERE "id" = ${organizationId}
    LIMIT 1
  `;

  const row = rows[0];
  const legalCategory = row?.legalCategory ?? "";
  if (!(LEGAL_CATEGORIES as readonly string[]).includes(legalCategory)) {
    throw new Error("Le calcul social est bloqué : la forme juridique de l'organisation est absente ou invalide.");
  }

  const atmpRate = Number(row?.atmpRate);
  if (!Number.isFinite(atmpRate) || atmpRate < 0 || atmpRate > 100) {
    throw new Error("Le calcul social est bloqué : le taux AT/MP de l'organisation est absent ou invalide.");
  }

  const healthPlanMonthlyAmount = Number(row?.healthPlanMonthlyAmount);
  if (!Number.isFinite(healthPlanMonthlyAmount) || healthPlanMonthlyAmount <= 0) {
    throw new Error("Le calcul social est bloqué : le montant mensuel de la complémentaire santé est absent ou invalide.");
  }

  const healthPlanEmployerRate = Number(row?.healthPlanEmployerRate);
  if (!Number.isFinite(healthPlanEmployerRate) || healthPlanEmployerRate < 50 || healthPlanEmployerRate > 100) {
    throw new Error("Le calcul social est bloqué : la part employeur de la complémentaire santé doit être comprise entre 50 % et 100 %.");
  }

  if (!(row?.companyCreationDate instanceof Date) || Number.isNaN(row.companyCreationDate.getTime())) {
    throw new Error("Le calcul social est bloqué : la date de création de l'entreprise est absente ou invalide.");
  }

  const payrollCity = row.payrollCity?.trim() ?? "";
  if (!payrollCity) {
    throw new Error("Le calcul social est bloqué : la commune de l'établissement est absente.");
  }

  const payrollDepartment = row.payrollDepartment?.trim() ?? "";
  if (!payrollDepartment) {
    throw new Error("Le calcul social est bloqué : le département de l'établissement est absent.");
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
