import { prisma } from "@/lib/prisma";

export type WithholdingTaxProfile = {
  rate: number;
  validFrom: Date;
  validUntil: Date | null;
  source: string;
  sourceReference: string | null;
};

export async function resolveEmployeeWithholdingTaxProfile(input: {
  organizationId: string;
  employeeId: string;
  periodDate: Date;
}): Promise<WithholdingTaxProfile | null> {
  if (!Number.isFinite(input.periodDate.getTime())) {
    throw new Error("La date de période du taux de prélèvement à la source est invalide.");
  }

  const rows = await prisma.$queryRaw<Array<{
    rate: unknown;
    validFrom: Date;
    validUntil: Date | null;
    source: string;
    sourceReference: string | null;
  }>>`
    SELECT "rate", "validFrom", "validUntil", "source", "sourceReference"
    FROM "employee_withholding_tax_profiles"
    WHERE "organizationId" = ${input.organizationId}
      AND "employeeId" = ${input.employeeId}
      AND "validFrom" <= ${input.periodDate}
      AND ("validUntil" IS NULL OR "validUntil" >= ${input.periodDate})
    ORDER BY "validFrom" DESC
    LIMIT 2
  `;

  if (rows.length > 1) {
    throw new Error("Plusieurs taux de prélèvement à la source sont applicables au même salarié et à la même période.");
  }

  const row = rows[0];
  if (!row) return null;

  const rate = Number(row.rate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error("Le taux de prélèvement à la source enregistré pour le salarié est invalide.");
  }

  return {
    rate,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    source: row.source,
    sourceReference: row.sourceReference,
  };
}
