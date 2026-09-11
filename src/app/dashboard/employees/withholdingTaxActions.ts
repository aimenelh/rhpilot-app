"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";

export type WithholdingTaxFormState = { error: string } | undefined;

export type WithholdingTaxData = {
  rate: number;
  validFrom: string;
  source: string;
  sourceReference: string | null;
} | null;

export async function getWithholdingTaxProfile(employeeId: string): Promise<WithholdingTaxData> {
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const rows = await prisma.$queryRaw<Array<{ rate: unknown; validFrom: Date; source: string; sourceReference: string | null }>>`
    SELECT "rate", "validFrom", "source", "sourceReference"
    FROM "employee_withholding_tax_profiles"
    WHERE "organizationId" = ${membership.organizationId} AND "employeeId" = ${employeeId}
    ORDER BY "validFrom" DESC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    rate: Number(row.rate),
    validFrom: row.validFrom.toISOString().slice(0, 10),
    source: row.source,
    sourceReference: row.sourceReference,
  };
}

// Le taux de prélèvement à la source n'est jamais calculé par
// l'employeur : il vient de la DGFiP (via le compte rendu métier de
// la DSN), qui transmet un taux personnalisé -- ou l'absence de taux
// personnalisé, auquel cas le barème non personnalisé s'applique
// (RH Pilot ne le calcule pas encore automatiquement, d'où la saisie
// manuelle ici en attendant).
export async function saveWithholdingTaxRate(
  employeeId: string,
  _previous: WithholdingTaxFormState,
  formData: FormData
): Promise<WithholdingTaxFormState> {
  const membership = await getCurrentMembership();
  if (!membership) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) {
    return { error: "Vous n'avez pas les droits pour modifier le taux de prélèvement à la source de ce salarié." };
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: membership.organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!employee) return { error: "Salarié introuvable dans cette organisation." };

  const rateRaw = String(formData.get("ratePercent") ?? "").replace(",", ".").trim();
  const validFromRaw = String(formData.get("validFrom") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const sourceReference = String(formData.get("sourceReference") ?? "").trim();

  const ratePercent = Number(rateRaw);
  if (!Number.isFinite(ratePercent) || ratePercent < 0 || ratePercent > 100) {
    return { error: "Le taux doit être un nombre entre 0 et 100." };
  }
  if (!validFromRaw) return { error: "La date de prise d'effet est obligatoire." };
  const validFrom = new Date(validFromRaw);
  if (Number.isNaN(validFrom.getTime())) return { error: "La date de prise d'effet n'est pas valide." };
  if (!["DGFIP", "NON_PERSONNALISE"].includes(source)) {
    return { error: "Indiquez si ce taux vient de la DGFiP ou s'il s'agit du taux non personnalisé." };
  }

  const rate = ratePercent / 100;
  const sourceLabel = source === "DGFIP" ? "DGFIP" : "NON_PERSONNALISE";

  try {
    await prisma.$transaction(async (tx) => {
      // Un seul taux "en vigueur" par salarié pour l'instant -- on
      // remplace plutôt que de garder un historique de versions, la
      // même simplification que fait la génération de démonstration.
      await tx.$executeRaw`
        DELETE FROM "employee_withholding_tax_profiles"
        WHERE "organizationId" = ${membership.organizationId} AND "employeeId" = ${employeeId}
      `;
      await tx.$executeRaw`
        INSERT INTO "employee_withholding_tax_profiles"
          ("id", "organizationId", "employeeId", "rate", "validFrom", "validUntil", "source", "sourceReference", "updatedAt")
        VALUES
          (${randomUUID()}, ${membership.organizationId}, ${employeeId}, ${rate}, ${validFrom}::date, NULL, ${sourceLabel}, ${sourceReference || null}, CURRENT_TIMESTAMP)
      `;
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Une erreur est survenue lors de l'enregistrement du taux." };
  }

  revalidatePath(`/dashboard/employees/${employeeId}`);
  return undefined;
}
