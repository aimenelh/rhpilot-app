import { prisma } from "@/lib/prisma";
import { LEGAL_CATEGORIES, type LegalCategory } from "./social-engine";

export type SocialOrganizationContext = {
  legalCategory: LegalCategory;
  atmpRate: number;
};

export async function resolveOrganizationLegalCategory(
  organizationId: string,
): Promise<SocialOrganizationContext> {
  const rows = await prisma.$queryRaw<Array<{ legalCategory: string | null; atmpRate: unknown }>>`
    SELECT "legalCategory", "atmpRate"
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

  return { legalCategory: legalCategory as LegalCategory, atmpRate };
}
