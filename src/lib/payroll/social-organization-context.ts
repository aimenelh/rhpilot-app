import { prisma } from "@/lib/prisma";
import { LEGAL_CATEGORIES, type LegalCategory } from "./social-engine";

export async function resolveOrganizationLegalCategory(
  organizationId: string,
): Promise<LegalCategory> {
  const rows = await prisma.$queryRaw<Array<{ legalCategory: string | null }>>`
    SELECT "legalCategory"
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

  return legalCategory as LegalCategory;
}
