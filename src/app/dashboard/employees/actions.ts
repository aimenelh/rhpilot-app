"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ContractType, Civility, DurationUnit, ProfessionalCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";

// Sécurité : l'organisation courante est TOUJOURS résolue côté serveur
// à partir de la session (getCurrentMembership), jamais à partir d'un
// champ envoyé par le formulaire — voir aussi le point 6 (isolation
// multi-tenant), qui repose sur cette règle en plus des clés
// composites du schéma.

export type EmployeeFormState = { error: string } | undefined;

// Doit rester identique à FREE_TIER_LIMIT dans
// app/dashboard/billing/page.tsx — les deux affichent la même limite,
// l'une la fait respecter, l'autre l'explique visuellement.
const FREE_TIER_LIMIT = 3;

// Ne bloque que la croissance du nombre de salariés actifs (création,
// réactivation), jamais la modification ou l'archivage d'une fiche
// existante. Un abonnement Pro actif lève la limite entièrement.
async function checkFreeTierLimit(organizationId: string): Promise<string | null> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionStatus: true },
  });
  if (organization?.subscriptionStatus === "active") return null;

  const activeCount = await prisma.employee.count({
    where: { organizationId, deletedAt: null },
  });
  if (activeCount >= FREE_TIER_LIMIT) {
    return `Le palier Gratuit est limité à ${FREE_TIER_LIMIT} salariés. Passez sur Pro depuis la page Facturation pour en ajouter davantage.`;
  }
  return null;
}

function parseOptionalManagerId(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string" || value === "") return null;
  return value;
}

function readEmployeeFields(formData: FormData) {
  const civilityRaw = String(formData.get("civility") ?? "");
  const professionalCategoryRaw = String(formData.get("professionalCategory") ?? "");
  const contractTypeRaw = String(formData.get("contractType") ?? "");
  const contractEndDateRaw = String(formData.get("contractEndDate") ?? "");
  const probationRaw = String(formData.get("probationDuration") ?? "");
  const probationUnitRaw = String(formData.get("probationDurationUnit") ?? "");
  const nextMedicalVisitDateRaw = String(formData.get("nextMedicalVisitDate") ?? "");

  const validContractTypes = ["CDI", "CDD", "APPRENTISSAGE", "PROFESSIONNALISATION"];
  const validCivilities = ["MME", "M", "AUTRE"];
  const validCategories = ["CADRE", "AGENT_DE_MAITRISE", "EMPLOYE", "OUVRIER", "AUTRE"];
  const validUnits = ["DAYS", "WEEKS", "MONTHS"];

  return {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    civility: (validCivilities.includes(civilityRaw) ? civilityRaw : null) as Civility | null,
    professionalCategory: (validCategories.includes(professionalCategoryRaw)
      ? professionalCategoryRaw
      : null) as ProfessionalCategory | null,
    position: String(formData.get("position") ?? "").trim(),
    hireDateRaw: String(formData.get("hireDate") ?? ""),
    contractType: (validContractTypes.includes(contractTypeRaw)
      ? contractTypeRaw
      : null) as ContractType | null,
    contractEndDateRaw: contractEndDateRaw === "" ? null : contractEndDateRaw,
    probationDuration: probationRaw === "" ? null : Number(probationRaw),
    probationDurationUnit: (probationRaw === ""
      ? null
      : validUnits.includes(probationUnitRaw)
        ? probationUnitRaw
        : "MONTHS") as DurationUnit | null,
    nextMedicalVisitDateRaw: nextMedicalVisitDateRaw === "" ? null : nextMedicalVisitDateRaw,
    managerMembershipId: parseOptionalManagerId(formData.get("managerMembershipId")),
  };
}

function validateEmployeeFields(fields: ReturnType<typeof readEmployeeFields>): string | null {
  if (!fields.firstName) return "Le prénom est obligatoire.";
  if (!fields.lastName) return "Le nom est obligatoire.";
  if (!fields.hireDateRaw) return "La date d'embauche est obligatoire.";
  if (Number.isNaN(new Date(fields.hireDateRaw).getTime())) {
    return "La date d'embauche n'est pas valide.";
  }
  if (
    fields.contractEndDateRaw !== null &&
    Number.isNaN(new Date(fields.contractEndDateRaw).getTime())
  ) {
    return "La date de fin de contrat n'est pas valide.";
  }
  if (
    fields.probationDuration !== null &&
    (Number.isNaN(fields.probationDuration) || fields.probationDuration < 0 || fields.probationDuration > 365)
  ) {
    return "La durée de la période d'essai n'est pas valide.";
  }
  if (
    fields.nextMedicalVisitDateRaw !== null &&
    Number.isNaN(new Date(fields.nextMedicalVisitDateRaw).getTime())
  ) {
    return "La date de prochaine visite médicale n'est pas valide.";
  }
  return null;
}

export async function createEmployee(
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    return { error: "Session expirée, veuillez recharger la page." };
  }

  const limitError = await checkFreeTierLimit(membership.organizationId);
  if (limitError) return { error: limitError };

  const fields = readEmployeeFields(formData);
  const validationError = validateEmployeeFields(fields);
  if (validationError) return { error: validationError };

  const employee = await prisma.$transaction(async (tx) => {
    const created = await tx.employee.create({
      data: {
        organizationId: membership.organizationId,
        firstName: fields.firstName,
        lastName: fields.lastName,
        civility: fields.civility,
        professionalCategory: fields.professionalCategory,
        position: fields.position || null,
        hireDate: new Date(fields.hireDateRaw),
        contractType: fields.contractType,
        contractEndDate: fields.contractEndDateRaw ? new Date(fields.contractEndDateRaw) : null,
        probationDuration: fields.probationDuration,
        probationDurationUnit: fields.probationDurationUnit,
        nextMedicalVisitDate: fields.nextMedicalVisitDateRaw ? new Date(fields.nextMedicalVisitDateRaw) : null,
        managerMembershipId: fields.managerMembershipId,
      },
    });
    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "employee.created",
        entityType: "Employee",
        entityId: created.id,
      },
    });
    return created;
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  redirect(
    `/dashboard/employees/${employee.id}?flash=${encodeURIComponent("Salarié créé")}`
  );
}

export async function updateEmployee(
  employeeId: string,
  _prevState: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    return { error: "Session expirée, veuillez recharger la page." };
  }

  // Vérification explicite d'appartenance à l'organisation avant toute
  // écriture (point 6 : isolation multi-tenant, deuxième barrière en
  // plus des clés composites du schéma).
  const existing = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: membership.organizationId, deletedAt: null },
  });
  if (!existing) {
    return { error: "Salarié introuvable dans cette organisation." };
  }

  const fields = readEmployeeFields(formData);
  const validationError = validateEmployeeFields(fields);
  if (validationError) return { error: validationError };

  await prisma.$transaction([
    prisma.employee.update({
      where: { id: employeeId },
      data: {
        firstName: fields.firstName,
        lastName: fields.lastName,
        civility: fields.civility,
        professionalCategory: fields.professionalCategory,
        position: fields.position || null,
        hireDate: new Date(fields.hireDateRaw),
        contractType: fields.contractType,
        contractEndDate: fields.contractEndDateRaw ? new Date(fields.contractEndDateRaw) : null,
        probationDuration: fields.probationDuration,
        probationDurationUnit: fields.probationDurationUnit,
        nextMedicalVisitDate: fields.nextMedicalVisitDateRaw ? new Date(fields.nextMedicalVisitDateRaw) : null,
        managerMembershipId: fields.managerMembershipId,
      },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "employee.updated",
        entityType: "Employee",
        entityId: employeeId,
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  redirect(
    `/dashboard/employees/${employeeId}?flash=${encodeURIComponent("Modifications enregistrées")}`
  );
}

export async function archiveEmployee(employeeId: string) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    throw new Error("Non authentifié ou aucune organisation active");
  }

  const existing = await prisma.employee.findFirst({
    where: { id: employeeId, organizationId: membership.organizationId, deletedAt: null },
  });
  if (!existing) {
    throw new Error("Salarié introuvable dans cette organisation");
  }

  await prisma.$transaction([
    prisma.employee.update({
      where: { id: employeeId },
      data: { deletedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "employee.archived",
        entityType: "Employee",
        entityId: employeeId,
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  redirect(
    `/dashboard/employees?flash=${encodeURIComponent("Salarié archivé")}`
  );
}

export async function reactivateEmployee(employeeId: string) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    throw new Error("Non authentifié ou aucune organisation active");
  }

  const existing = await prisma.employee.findFirst({
    where: {
      id: employeeId,
      organizationId: membership.organizationId,
      deletedAt: { not: null },
    },
  });
  if (!existing) {
    throw new Error("Salarié archivé introuvable dans cette organisation");
  }

  const limitError = await checkFreeTierLimit(membership.organizationId);
  if (limitError) throw new Error(limitError);

  await prisma.$transaction([
    prisma.employee.update({
      where: { id: employeeId },
      data: { deletedAt: null },
    }),
    prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "employee.reactivated",
        entityType: "Employee",
        entityId: employeeId,
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  redirect(
    `/dashboard/employees?flash=${encodeURIComponent("Salarié réactivé")}`
  );
}
