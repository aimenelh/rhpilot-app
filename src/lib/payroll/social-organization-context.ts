import { prisma } from "@/lib/prisma";
import { LEGAL_CATEGORIES, type LegalCategory } from "./social-engine";

export type SocialOrganizationContext = {
  legalCategory: LegalCategory;
  atmpRate: number;
  healthPlanMonthlyAmount: number;
  healthPlanEmployerRate: number;
};

export async function resolveOrganizationLegalCategory(
  organizationId: string,
): Promise<SocialOrganizationContext> {
  const rows = await prisma.$queryRaw<Array<{
    legalCategory: string | null;
    atmpRate: unknown;
    healthPlanMonthlyAmount: unknown;
    healthPlanEmployerRate: unknown;
  }>>`
    SELECT "legalCategory", "atmpRate", "healthPlanMonthlyAmount", "healthPlanEmployerRate"
    FROM "organizations"
    WHERE "id" = ${organizationId}
    LIMIT 1
  `;

  const legalCategory = rows[0]?.legalCategory ?? "";
  if (!(LEGAL_CATEGORIES as readonly string[]).includes(legalCategory)) {
    throw new Error(
      "Le calcul social est bloqué : la forme juridique de l'organisation est absente ou invalide.",
    );
  }

  const atmpRate = Number(rows[0]?.atmpRate);
  if (!Number.isFinite(atmpRate) || atmpRate < 0 || atmpRate > 100) {
    throw new Error(
      "Le calcul social est bloqué : le taux AT/MP de l'organisation est absent ou invalide.",
    );
  }

  const healthPlanMonthlyAmount = Number(rows[0]?.healthPlanMonthlyAmount);
  if (!Number.isFinite(healthPlanMonthlyAmount) || healthPlanMonthlyAmount <= 0) {
    throw new Error(
      "Le calcul social est bloqué : le montant mensuel de la complémentaire santé est absent ou invalide.",
    );
  }

  const healthPlanEmployerRate = Number(rows[0]?.healthPlanEmployerRate);
  if (!Number.isFinite(healthPlanEmployerRate) || healthPlanEmployerRate < 50 || healthPlanEmployerRate > 100) {
    throw new Error(
      "Le calcul social est bloqué : la part employeur de la complémentaire santé doit être comprise entre 50 % et 100 %.",
    );
  }

  return {
    legalCategory: legalCategory as LegalCategory,
    atmpRate,
    healthPlanMonthlyAmount,
    healthPlanEmployerRate,
  };
}
