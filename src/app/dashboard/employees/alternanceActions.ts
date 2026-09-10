"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";

export type AlternanceProfileFormState = { error: string } | undefined;

export type AlternanceProfileData = {
  contractType: string | null;
  birthDate: string | null;
  contractYear: number | null;
  hasBaccalaureateOrHigher: boolean | null;
  validFrom: string | null;
  validUntil: string | null;
  sourceReference: string | null;
};

export async function getAlternanceProfile(employeeId: string): Promise<AlternanceProfileData | null> {
  const membership = await getCurrentMembership();
  if (!membership) return null;
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: membership.organizationId, deletedAt: null },
    select: { contractType: true },
  });
  if (!employee || !["APPRENTISSAGE", "PROFESSIONNALISATION"].includes(employee.contractType ?? "")) return null;

  const rows = await prisma.$queryRaw<Array<{
    birthDate: Date;
    contractYear: number | null;
    hasBaccalaureateOrHigher: boolean | null;
    validFrom: Date;
    validUntil: Date | null;
    sourceReference: string | null;
  }>>`
    SELECT "birthDate", "contractYear", "hasBaccalaureateOrHigher", "validFrom", "validUntil", "sourceReference"
    FROM "employee_alternance_profiles"
    WHERE "organizationId" = ${membership.organizationId}
      AND "employeeId" = ${employeeId}
      AND "validFrom" <= CURRENT_DATE
      AND ("validUntil" IS NULL OR "validUntil" >= CURRENT_DATE)
    ORDER BY "validFrom" DESC
    LIMIT 1
  `;
  const row = rows[0];
  return {
    contractType: employee.contractType,
    birthDate: row?.birthDate.toISOString() ?? null,
    contractYear: row?.contractYear ?? null,
    hasBaccalaureateOrHigher: row?.hasBaccalaureateOrHigher ?? null,
    validFrom: row?.validFrom.toISOString() ?? null,
    validUntil: row?.validUntil?.toISOString() ?? null,
    sourceReference: row?.sourceReference ?? null,
  };
}

function parseDate(value: string, label: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!value || Number.isNaN(date.getTime())) throw new Error(`${label} n'est pas valide.`);
  return date;
}

export async function saveAlternanceProfile(
  employeeId: string,
  _previous: AlternanceProfileFormState,
  formData: FormData
): Promise<AlternanceProfileFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) return { error: "Session expirée, veuillez recharger la page." };
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) return { error: "Vous n'avez pas les droits pour modifier le profil de paie de ce salarié." };

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: membership.organizationId, deletedAt: null },
    select: { id: true, contractType: true },
  });
  if (!employee) return { error: "Salarié introuvable dans cette organisation." };
  if (!["APPRENTISSAGE", "PROFESSIONNALISATION"].includes(employee.contractType ?? "")) {
    return { error: "Le profil alternance ne peut être renseigné que pour un contrat d'apprentissage ou de professionnalisation." };
  }

  const birthDateRaw = String(formData.get("birthDate") ?? "");
  const validFromRaw = String(formData.get("validFrom") ?? "");
  const validUntilRaw = String(formData.get("validUntil") ?? "");
  const contractYearRaw = String(formData.get("contractYear") ?? "");
  const baccalaureateRaw = String(formData.get("hasBaccalaureateOrHigher") ?? "");
  const sourceReference = String(formData.get("sourceReference") ?? "").trim();
  if (!birthDateRaw) return { error: "La date de naissance est obligatoire pour sécuriser le minimum alternance." };
  if (!validFromRaw) return { error: "La date de prise d'effet du profil alternance est obligatoire." };

  let birthDate: Date;
  let validFrom: Date;
  let validUntil: Date | null = null;
  try {
    birthDate = parseDate(birthDateRaw, "La date de naissance");
    validFrom = parseDate(validFromRaw, "La date de prise d'effet");
    if (validUntilRaw) validUntil = parseDate(validUntilRaw, "La date de fin de validité");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Une date n'est pas valide." };
  }
  if (birthDate >= validFrom) return { error: "La date de naissance doit être antérieure à la prise d'effet du profil." };
  if (validUntil && validUntil < validFrom) return { error: "La fin de validité doit être postérieure ou égale à la prise d'effet." };

  let contractYear: number | null = null;
  let hasBaccalaureateOrHigher: boolean | null = null;
  if (employee.contractType === "APPRENTISSAGE") {
    if (!["1", "2", "3"].includes(contractYearRaw)) return { error: "Sélectionnez l'année d'exécution du contrat d'apprentissage (1re, 2e ou 3e année)." };
    contractYear = Number(contractYearRaw);
  } else {
    if (!["true", "false"].includes(baccalaureateRaw)) return { error: "Indiquez si le salarié possède le baccalauréat ou un diplôme supérieur." };
    hasBaccalaureateOrHigher = baccalaureateRaw === "true";
  }

  try {
    await prisma.$transaction(async (tx) => {
      const exactVersion = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "employee_alternance_profiles"
        WHERE "organizationId" = ${membership.organizationId} AND "employeeId" = ${employeeId}
          AND "validFrom" = ${validFrom}::date LIMIT 1
      `;

      if (exactVersion[0]) {
        const overlapping = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "employee_alternance_profiles"
          WHERE "organizationId" = ${membership.organizationId} AND "employeeId" = ${employeeId}
            AND "id" <> ${exactVersion[0].id}
            AND "validFrom" <= COALESCE(${validUntil}::date, DATE '9999-12-31')
            AND COALESCE("validUntil", DATE '9999-12-31') >= ${validFrom}::date LIMIT 1
        `;
        if (overlapping.length > 0) throw new Error("Une autre version du profil alternance couvre déjà cette période.");
        await tx.$executeRaw`
          UPDATE "employee_alternance_profiles"
          SET "birthDate" = ${birthDate}::date, "contractYear" = ${contractYear},
              "hasBaccalaureateOrHigher" = ${hasBaccalaureateOrHigher}, "validUntil" = ${validUntil}::date,
              "source" = 'MANUAL', "sourceReference" = ${sourceReference || null}, "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${exactVersion[0].id}
        `;
      } else {
        await tx.$executeRaw`
          UPDATE "employee_alternance_profiles"
          SET "validUntil" = (${validFrom}::date - INTERVAL '1 day'), "updatedAt" = CURRENT_TIMESTAMP
          WHERE "organizationId" = ${membership.organizationId} AND "employeeId" = ${employeeId}
            AND "validUntil" IS NULL AND "validFrom" < ${validFrom}::date
        `;
        const overlapping = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "employee_alternance_profiles"
          WHERE "organizationId" = ${membership.organizationId} AND "employeeId" = ${employeeId}
            AND "validFrom" <= COALESCE(${validUntil}::date, DATE '9999-12-31')
            AND COALESCE("validUntil", DATE '9999-12-31') >= ${validFrom}::date LIMIT 1
        `;
        if (overlapping.length > 0) throw new Error("Une version du profil alternance couvre déjà cette période. Modifiez ses dates de validité avant d'enregistrer.");
        await tx.$executeRaw`
          INSERT INTO "employee_alternance_profiles" (
            "id", "organizationId", "employeeId", "birthDate", "contractYear", "hasBaccalaureateOrHigher",
            "validFrom", "validUntil", "source", "sourceReference", "createdAt", "updatedAt"
          ) VALUES (
            ${randomUUID()}, ${membership.organizationId}, ${employeeId}, ${birthDate}::date, ${contractYear},
            ${hasBaccalaureateOrHigher}, ${validFrom}::date, ${validUntil}::date, 'MANUAL', ${sourceReference || null},
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `;
      }

      await tx.auditLog.create({
        data: { id: randomUUID(), organizationId: membership.organizationId, actorUserId: user.id,
          action: "employee.alternance_profile.updated", entityType: "Employee", entityId: employeeId },
      });
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Impossible d'enregistrer le profil alternance." };
  }

  revalidatePath(`/dashboard/employees/${employeeId}`);
  revalidatePath("/dashboard/employees");
  return { error: "" };
}
