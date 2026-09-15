"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertNirFormat, encryptDsnSensitiveValue } from "@/lib/payroll/dsn-pii";

export type DsnFormState = { error?: string; success?: string } | undefined;

const CONTACT_TYPES = new Set(["01", "02", "03", "04", "05", "06", "07", "08", "09", "13", "14", "15", "16"]);
const EU_CLASSIFICATIONS = new Set(["01", "02", "03", "04"]);
const BASE_SCHEME_SUPPLEMENTS = new Set(["01", "02", "03", "99"]);
const FOREIGN_WORKER_CODES = new Set(["01", "02", "03", "99"]);
const EMPLOYMENT_STATUS_CODES = new Set(["01", "02", "03", "04", "06", "07", "08", "09", "10", "11", "12", "99"]);
const MULTIPLICITY_CODES = new Set(["01", "02", "03"]);

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

function exactCode(formData: FormData, key: string, label: string, length: number): string {
  const result = code(formData, key, label, length);
  if (result.length !== length) throw new Error(`${label} doit comporter exactement ${length} caractères.`);
  return result;
}

function listedCode(formData: FormData, key: string, label: string, allowed: Set<string>): string {
  const result = exactCode(formData, key, label, 2);
  if (!allowed.has(result)) throw new Error(`${label} n'est pas une valeur P26V01 prise en charge.`);
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
    const declaredContactType = listedCode(formData, "declaredContactType", "Le type de contact chez le déclaré", CONTACT_TYPES);
    const enterpriseApenCode = code(formData, "enterpriseApenCode", "Le code APEN de l'entreprise", 5);
    if (!/^\d{4}[A-Z]$/.test(enterpriseApenCode)) throw new Error("Le code APEN doit respecter le format NAF sur 5 caractères, par exemple 6201Z.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new Error("L'adresse email du contact DSN est invalide.");
    if (!/^[+0-9(). /-]{10,20}$/.test(contactPhone)) throw new Error("Le numéro de téléphone du contact DSN doit comporter entre 10 et 20 caractères autorisés.");

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "dsn_organization_settings"
          ("organizationId", "contactName", "contactEmail", "contactPhone", "declaredContactType", "enterpriseApenCode", "defaultTestMode", "updatedAt")
        VALUES
          (${membership.organizationId}, ${contactName}, ${contactEmail}, ${contactPhone}, ${declaredContactType}, ${enterpriseApenCode}, TRUE, CURRENT_TIMESTAMP)
        ON CONFLICT ("organizationId") DO UPDATE SET
          "contactName" = EXCLUDED."contactName",
          "contactEmail" = EXCLUDED."contactEmail",
          "contactPhone" = EXCLUDED."contactPhone",
          "declaredContactType" = EXCLUDED."declaredContactType",
          "enterpriseApenCode" = EXCLUDED."enterpriseApenCode",
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
          metadata: { testModeOnly: true, declaredContactType, enterpriseApenCode },
        },
      });
    });

    revalidatePath("/dashboard/payroll/dsn");
    return { success: "Configuration DSN enregistrée. Le mode dépôt réel reste volontairement désactivé." };
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
    const birthDepartment = exactCode(formData, "birthDepartment", "Le département de naissance", 2);
    if (!/^(?:0[1-9]|[1-9][0-9]|2A|2B)$/.test(birthDepartment)) throw new Error("Le département de naissance doit être compris entre 01 et 99 ou valoir 2A/2B (98 pour TOM, 99 pour étranger). ");
    const birthCountryCode = exactCode(formData, "birthCountryCode", "Le pays de naissance", 2);
    if (!/^[A-Z]{2}$/.test(birthCountryCode)) throw new Error("Le pays de naissance doit être un code ISO 3166-1 alpha-2.");
    const euClassificationCode = listedCode(formData, "euClassificationCode", "La codification UE", EU_CLASSIFICATIONS);

    const addressLine = required(formData, "addressLine", "L'adresse du salarié");
    const postalCode = required(formData, "postalCode", "Le code postal du salarié");
    if (!/^\d{5}$/.test(postalCode)) throw new Error("Le périmètre DSN actuel accepte uniquement un code postal du système postal français sur 5 chiffres.");
    const city = required(formData, "city", "La ville du salarié");
    const countryCode = value(formData, "countryCode").toUpperCase() || null;
    if (countryCode) throw new Error("Les adresses hors système postal français nécessitent le code de distribution à l'étranger, non encore modélisé. L'export DSN est bloqué plutôt que de produire une adresse incomplète.");

    const contractNumber = code(formData, "contractNumber", "Le numéro de contrat", 20);
    if (contractNumber.length < 5) throw new Error("Le numéro de contrat DSN doit comporter au moins 5 caractères.");

    const contractNatureCode = exactCode(formData, "contractNatureCode", "La nature du contrat", 2);
    const publicPolicyCode = exactCode(formData, "publicPolicyCode", "Le dispositif de politique publique", 2);
    const pcsEsecCode = code(formData, "pcsEsecCode", "Le code PCS-ESE", 6);
    const conventionalStatusCode = exactCode(formData, "conventionalStatusCode", "Le statut conventionnel", 2);
    const retirementStatusCode = exactCode(formData, "retirementStatusCode", "Le statut retraite complémentaire", 2);
    const workUnitCode = exactCode(formData, "workUnitCode", "L'unité de mesure de la quotité", 2);
    const referenceWorkQuota = decimal(formData, "referenceWorkQuota", "La quotité de référence");
    const contractWorkQuota = decimal(formData, "contractWorkQuota", "La quotité du contrat");
    if (["10", "21"].includes(workUnitCode) && (referenceWorkQuota > 250 || contractWorkQuota > 250)) {
      throw new Error("Les quotités exprimées en heures doivent être inférieures ou égales à 250,00 pour la période.");
    }
    const workModalityCode = exactCode(formData, "workModalityCode", "La modalité d'exercice du temps de travail", 2);
    const baseSchemeSupplementCode = listedCode(formData, "baseSchemeSupplementCode", "Le complément de base au régime obligatoire", BASE_SCHEME_SUPPLEMENTS);
    const sicknessRegimeCode = exactCode(formData, "sicknessRegimeCode", "Le régime maladie", 3);
    const workLocationId = code(formData, "workLocationId", "L'identifiant du lieu de travail", 14);
    if (workLocationId.length < 2) throw new Error("L'identifiant du lieu de travail doit comporter entre 2 et 14 caractères.");
    const oldAgeRegimeCode = exactCode(formData, "oldAgeRegimeCode", "Le régime vieillesse", 3);
    const foreignWorkerCode = listedCode(formData, "foreignWorkerCode", "Le statut de travailleur à l'étranger", FOREIGN_WORKER_CODES);
    const employmentStatusCode = listedCode(formData, "employmentStatusCode", "Le statut d'emploi", EMPLOYMENT_STATUS_CODES);
    const multipleJobsCode = listedCode(formData, "multipleJobsCode", "Le code emplois multiples", MULTIPLICITY_CODES);
    const multipleEmployersCode = listedCode(formData, "multipleEmployersCode", "Le code employeurs multiples", MULTIPLICITY_CODES);
    const workAccidentRegimeCode = exactCode(formData, "workAccidentRegimeCode", "Le régime AT/MP", 3);
    const workAccidentRiskCode = code(formData, "workAccidentRiskCode", "Le code risque AT/MP", 6);
    if (workAccidentRiskCode.length < 5) throw new Error("Le code risque AT/MP doit comporter 5 ou 6 caractères et provenir de la notification CARSAT/MSA.");
    const id = existing[0]?.id ?? randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "dsn_employee_profiles"
          ("id", "organizationId", "employeeId", "nirCiphertext", "birthDate", "birthPlace",
           "birthDepartment", "birthCountryCode", "euClassificationCode", "addressLine", "postalCode", "city", "countryCode", "contractNumber",
           "contractNatureCode", "publicPolicyCode", "pcsEsecCode", "conventionalStatusCode",
           "retirementStatusCode", "workUnitCode", "referenceWorkQuota", "contractWorkQuota",
           "workModalityCode", "baseSchemeSupplementCode", "sicknessRegimeCode", "workLocationId", "oldAgeRegimeCode",
           "foreignWorkerCode", "employmentStatusCode", "multipleJobsCode", "multipleEmployersCode",
           "workAccidentRegimeCode", "workAccidentRiskCode", "updatedAt")
        VALUES
          (${id}, ${membership.organizationId}, ${employee.id}, ${nirCiphertext}, ${birthDate}::date, ${birthPlace},
           ${birthDepartment}, ${birthCountryCode}, ${euClassificationCode}, ${addressLine}, ${postalCode}, ${city}, ${countryCode}, ${contractNumber},
           ${contractNatureCode}, ${publicPolicyCode}, ${pcsEsecCode}, ${conventionalStatusCode},
           ${retirementStatusCode}, ${workUnitCode}, ${referenceWorkQuota}, ${contractWorkQuota},
           ${workModalityCode}, ${baseSchemeSupplementCode}, ${sicknessRegimeCode}, ${workLocationId}, ${oldAgeRegimeCode},
           ${foreignWorkerCode}, ${employmentStatusCode}, ${multipleJobsCode}, ${multipleEmployersCode},
           ${workAccidentRegimeCode}, ${workAccidentRiskCode}, CURRENT_TIMESTAMP)
        ON CONFLICT ("organizationId", "employeeId") DO UPDATE SET
          "nirCiphertext" = EXCLUDED."nirCiphertext",
          "birthDate" = EXCLUDED."birthDate",
          "birthPlace" = EXCLUDED."birthPlace",
          "birthDepartment" = EXCLUDED."birthDepartment",
          "birthCountryCode" = EXCLUDED."birthCountryCode",
          "euClassificationCode" = EXCLUDED."euClassificationCode",
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
          "baseSchemeSupplementCode" = EXCLUDED."baseSchemeSupplementCode",
          "sicknessRegimeCode" = EXCLUDED."sicknessRegimeCode",
          "workLocationId" = EXCLUDED."workLocationId",
          "oldAgeRegimeCode" = EXCLUDED."oldAgeRegimeCode",
          "foreignWorkerCode" = EXCLUDED."foreignWorkerCode",
          "employmentStatusCode" = EXCLUDED."employmentStatusCode",
          "multipleJobsCode" = EXCLUDED."multipleJobsCode",
          "multipleEmployersCode" = EXCLUDED."multipleEmployersCode",
          "workAccidentRegimeCode" = EXCLUDED."workAccidentRegimeCode",
          "workAccidentRiskCode" = EXCLUDED."workAccidentRiskCode",
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
          metadata: { nirStoredEncrypted: true, normVersion: "P26V01" },
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
