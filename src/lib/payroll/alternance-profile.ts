import { prisma } from "@/lib/prisma";

export type EmployeeAlternanceProfile = {
  birthDate: Date;
  contractYear: 1 | 2 | 3 | null;
  hasBaccalaureateOrHigher: boolean | null;
  validFrom: Date;
  validUntil: Date | null;
  source: string;
  sourceReference: string | null;
};

export async function resolveEmployeeAlternanceProfile(input: {
  organizationId: string;
  employeeId: string;
  periodDate: Date;
}): Promise<EmployeeAlternanceProfile | null> {
  if (!Number.isFinite(input.periodDate.getTime())) throw new Error("La date de période du profil alternance est invalide.");

  const rows = await prisma.$queryRaw<Array<{
    birthDate: Date;
    contractYear: number | null;
    hasBaccalaureateOrHigher: boolean | null;
    validFrom: Date;
    validUntil: Date | null;
    source: string;
    sourceReference: string | null;
  }>>`
    SELECT "birthDate", "contractYear", "hasBaccalaureateOrHigher", "validFrom", "validUntil", "source", "sourceReference"
    FROM "employee_alternance_profiles"
    WHERE "organizationId" = ${input.organizationId}
      AND "employeeId" = ${input.employeeId}
      AND "validFrom" <= ${input.periodDate}
      AND ("validUntil" IS NULL OR "validUntil" >= ${input.periodDate})
    ORDER BY "validFrom" DESC
    LIMIT 2
  `;

  if (rows.length > 1) throw new Error("Plusieurs profils alternance sont applicables au même salarié et à la même période.");
  const row = rows[0];
  if (!row) return null;

  if (!(row.birthDate instanceof Date) || !Number.isFinite(row.birthDate.getTime())) throw new Error("La date de naissance du profil alternance est invalide.");
  if (row.contractYear !== null && ![1, 2, 3].includes(row.contractYear)) throw new Error("L'année d'exécution du contrat d'alternance est invalide.");

  return {
    birthDate: row.birthDate,
    contractYear: row.contractYear as 1 | 2 | 3 | null,
    hasBaccalaureateOrHigher: row.hasBaccalaureateOrHigher,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    source: row.source,
    sourceReference: row.sourceReference,
  };
}

export function calculateAgeAtDate(birthDate: Date, date: Date): number {
  let age = date.getUTCFullYear() - birthDate.getUTCFullYear();
  const month = date.getUTCMonth() - birthDate.getUTCMonth();
  if (month < 0 || (month === 0 && date.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}
