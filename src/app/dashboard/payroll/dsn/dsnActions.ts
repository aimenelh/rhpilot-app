"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertNirFormat, encryptDsnSensitiveValue } from "@/lib/payroll/dsn-pii";

export type DsnFormState = { error?: string; success?: string } | undefined;

function value(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function required(formData: FormData, key: string, label: string): string {
  const result = value(formData, key);
  if (!result) throw new Error(`${label} est obligatoire.`);
  return result;
}

function decimal(formData: FormData, key: string, label: string): number {
  const parsed = Number(value(formData, key).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} doit être un nombre strictement positif.`);
  return parsed;
}

function code(formData: FormData, key: string, label: string, maxLength = 20): string {
  const result = required(formData, key, label).toUpperCase();
  if (result.length > maxLength || !/^[A-Z0-9.-]+$/.test(result)) throw new Error(`${label} contient un code invalide.`);
  return result;
}

async function adminContext() {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Session expirée, veuillez recharger la page.");
  if (!["OWNER", "ADMIN"].includes(membership.accessRole)) {
    throw new Error("Seuls les administrateurs peuvent configurer les données DSN.");
  }
  return { membership, user };
}

export async function saveDsnOrganizationSettings(
  _previousState: DsnFormState,
  formData: FormData,
): Promise<DsnFormState> {
  try {
    const { membership, user } = await adminContext();
    const contactName = required(formData, "contactName", "Le nom du contact DSN");
    const contactEmail = required(formData, "contactEmail", "L'adresse email du contact DSN").toLowerCase();
    const contactPhone = required(formData, "contactPhone", "Le téléphone du contact DSN");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new Error("L'adresse email du contact DSN est invalide.");
    if (!/^[+0-9(). /-]{6,30}$/.test(contactPhone)) throw new Error("Le numéro de téléphone du contact DSN est invalide.");

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "dsn_organization_settings"
          ("organizationId", "contactName", "contactEmail", "contactPhone", "defaultTestMode", "updatedAt")
        VALUES
          (${membership.organizationId}, ${contactName}, ${contactEmail}, ${contactPhone}, TRUE, CURRENT_TIMESTAMP)
        ON CONFLICT ("organizationId") DO UPDATE SET
          "contactName" = EXCLUDED."contactName",
          "contactEmail" = EXCLUDED."contactEmail",
          "contactPhone" = EXCLUDED."contactPhone",
          "defaultTestMode" = TRUE,
          "updatedAt" = CURRENT_TIMESTAMP
      `;
      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          organizationId: membership.organizationId,
          actorUserId: user.id,
          action: "dsn.organization.settings.updated",
          entityType: "Organization",
          entityId: membership.organizationId,
          metadata: { testModeOnly: true },
        },
      });
    });

    revalidatePath("/dashboard/payroll/dsn");
    return { success: "Contact DSN enregistré. Le mode dépôt réel reste volontairement désactivé." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Impossible d'enregistrer la configuration DSN." };
  }
}

export async function saveDsnEmployeeProfile(
  employeeId: string,
  _previousState: DsnFormState,
  formData: FormData,
): Promise<DsnFormState> {
  try {
    const { membership, user } = await adminContext();
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, organizationId: membership.organizationId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!employee) throw new Error("Salarié introuvable dans cette organisation.");

    const existing = await prisma.$queryRaw<Array<{ id: string; nirCiphertext: string }>>`
      SELECT "id", "nirCiphertext"
      FROM "dsn_employee_profiles"
      WHERE "organizationId" = ${membership.organizationId} AND "employeeId" = ${employee.id}
      LIMIT 1
    `;
    const nirRaw = value(formData, "nir");
    let nirCiphertext = existing[0]?.nirCiphertext ?? "";
    if (nirRaw) nirCiphertext = encryptDsnSensitiveValue(assertNirFormat(nirRaw));
    if (!nirCiphertext) throw new Error("Le NIR est obligatoire lors de la première configuration DSN du salarié.");

    const birthDateRaw = required(formData, "birthDate", "La date de naissance");
    const birthDate = new Date(`${birthDateRaw}T00:00:00.000Z`);
    if (Number.isNaN(birthDate.getTime())) throw new Error("La date de naissance est invalide.");

    const birthPlace = required(formData, "birthPlace", "Le lieu de naissance");
    const birthDepartment = code(formData, "birthDepartment", "Le département de naissance", 5);
    const addressLine = required(formData, "addressLine", "L'adresse du salarié");
    const postalCode = required(formData, "postalCode", "Le code postal du salarié");
    const city = required(formData, "city", "La ville du salarié");
    const countryCode = value(formData, "countryCode") || null;
    const contractNumber = code(formData, "contractNumber", "Le numéro de contrat", 20);
    if (contractNumber.length < 5) throw new Error("Le numéro de contrat DSN doit comporter au moins 5 caractères.");

    const contractNatureCode = code(formData, "contractNatureCode", "La nature du contrat", 3);
    const publicPolicyCode = code(formData, "publicPolicyCode", "Le dispositif de politique publique", 3);
    const pcsEsecCode = code(formData, "pcsEsecCode", "Le code PCS-ESE", 6);
    const conventionalStatusCode = code(formData, "conventionalStatusCode", "Le statut conventionnel", 4);
    const retirementStatusCode = code(formData, "retirementStatusCode", "Le statut retraite complémentaire", 4);
    const workUnitCode = code(formData, "workUnitCode", "L'unité de mesure de la quotité", 3);
    const referenceWorkQuota = decimal(formData, "referenceWorkQuota", "La quotité de référence");
    const contractWorkQuota = decimal(formData, "contractWorkQuota", "La quotité du contrat");
    const workModalityCode = code(formData, "workModalityCode", "La modalité d'exercice du temps de travail", 3);
    const sicknessRegimeCode = code(formData, "sicknessRegimeCode", "Le régime maladie", 6);
    const oldAgeRegimeCode = code(formData, "oldAgeRegimeCode", "Le régime vieillesse", 6);
    const id = existing[0]?.id ?? randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "dsn_employee_profiles"
          ("id", "organizationId", "employeeId", "nirCiphertext", "birthDate", "birthPlace",
           "birthDepartment", "addressLine", "postalCode", "city", "countryCode", "contractNumber",
           "contractNatureCode", "publicPolicyCode", "pcsEsecCode", "conventionalStatusCode",
           "retirementStatusCode", "workUnitCode", "referenceWorkQuota", "contractWorkQuota",
           "workModalityCode", "sicknessRegimeCode", "oldAgeRegimeCode", "updatedAt")
        VALUES
          (${id}, ${membership.organizationId}, ${employee.id}, ${nirCiphertext}, ${birthDate}::date, ${birthPlace},
           ${birthDepartment}, ${addressLine}, ${postalCode}, ${city}, ${countryCode}, ${contractNumber},
           ${contractNatureCode}, ${publicPolicyCode}, ${pcsEsecCode}, ${conventionalStatusCode},
           ${retirementStatusCode}, ${workUnitCode}, ${referenceWorkQuota}, ${contractWorkQuota},
           ${workModalityCode}, ${sicknessRegimeCode}, ${oldAgeRegimeCode}, CURRENT_TIMESTAMP)
        ON CONFLICT ("organizationId", "employeeId") DO UPDATE SET
          "nirCiphertext" = EXCLUDED."nirCiphertext",
          "birthDate" = EXCLUDED."birthDate",
          "birthPlace" = EXCLUDED."birthPlace",
          "birthDepartment" = EXCLUDED."birthDepartment",
          "addressLine" = EXCLUDED."addressLine",
          "postalCode" = EXCLUDED."postalCode",
          "city" = EXCLUDED."city",
          "countryCode" = EXCLUDED."countryCode",
          "contractNumber" = EXCLUDED."contractNumber",
          "contractNatureCode" = EXCLUDED."contractNatureCode",
          "publicPolicyCode" = EXCLUDED."publicPolicyCode",
          "pcsEsecCode" = EXCLUDED."pcsEsecCode",
          "conventionalStatusCode" = EXCLUDED."conventionalStatusCode",
          "retirementStatusCode" = EXCLUDED."retirementStatusCode",
          "workUnitCode" = EXCLUDED."workUnitCode",
          "referenceWorkQuota" = EXCLUDED."referenceWorkQuota",
          "contractWorkQuota" = EXCLUDED."contractWorkQuota",
          "workModalityCode" = EXCLUDED."workModalityCode",
          "sicknessRegimeCode" = EXCLUDED."sicknessRegimeCode",
          "oldAgeRegimeCode" = EXCLUDED."oldAgeRegimeCode",
          "updatedAt" = CURRENT_TIMESTAMP
      `;
      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          organizationId: membership.organizationId,
          actorUserId: user.id,
          action: "dsn.employee.profile.updated",
          entityType: "Employee",
          entityId: employee.id,
          metadata: { nirStoredEncrypted: true },
        },
      });
    });

    revalidatePath("/dashboard/payroll/dsn");
    revalidatePath(`/dashboard/payroll/dsn/employees/${employee.id}`);
    return { success: `Profil DSN de ${employee.firstName} ${employee.lastName} enregistré.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Impossible d'enregistrer le profil DSN." };
  }
}
