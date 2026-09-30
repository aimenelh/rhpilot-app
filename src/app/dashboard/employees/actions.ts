"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import type { ContractType, Civility, DurationUnit, ProfessionalCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { isOrganizationAdmin } from "@/lib/accessPolicy";
import { parseIsoDateOnly } from "@/lib/dateOnly";
import { billableEmployeeWhere } from "@/lib/billingEmployeeScope";
import { FREE_TIER_LIMIT, hasProAccess } from "@/lib/billingPolicy";
import { buildContractWorkTime } from "@/lib/contractWorkTime";
import { saveEmployeeWorkProfile } from "@/lib/employeeWorkProfile";

// Sécurité : l'organisation courante est TOUJOURS résolue côté serveur
// à partir de la session (getCurrentMembership), jamais à partir d'un
// champ envoyé par le formulaire — voir aussi le point 6 (isolation
// multi-tenant), qui repose sur cette règle en plus des clés
// composites du schéma.

export type EmployeeFormState = { error: string } | undefined;

// Ne bloque que la croissance du nombre de salariés réels actifs
// (création, réactivation, import CSV). Les fiches de démonstration
// ne comptent jamais dans le quota, la modification ou l'archivage
// d'une fiche existante. Un abonnement Pro servi (actif, essai ou
// paiement à régulariser) lève la limite entièrement. `additionalCount` permet de vérifier l'ajout de
// plusieurs salariés d'un coup (import CSV), pas seulement un par un.
export async function checkFreeTierLimit(
  organizationId: string,
  additionalCount: number = 1
): Promise<string | null> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { subscriptionStatus: true },
  });
  if (hasProAccess(organization?.subscriptionStatus)) return null;

  const activeCount = await prisma.employee.count({
    where: billableEmployeeWhere(organizationId),
  });
  if (activeCount + additionalCount > FREE_TIER_LIMIT) {
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
  const weeklyHoursRaw = String(formData.get("weeklyHours") ?? "").trim().replace(",", ".");
  const weeklyScheduleRaw = Array.from({ length: 7 }, (_, index) =>
    String(formData.get(`schedule.${index}`) ?? "").trim().replace(",", ".")
  );
  const workScheduleEffectiveFromRaw = String(formData.get("workScheduleEffectiveFrom") ?? "").trim();

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
    weeklyHoursRaw,
    weeklyScheduleRaw,
    workScheduleEffectiveFromRaw,
    managerMembershipId: parseOptionalManagerId(formData.get("managerMembershipId")),
  };
}

function validateEmployeeFields(fields: ReturnType<typeof readEmployeeFields>): string | null {
  if (!fields.firstName) return "Le prénom est obligatoire.";
  if (!fields.lastName) return "Le nom est obligatoire.";
  if (!fields.hireDateRaw) return "La date d'embauche est obligatoire.";
  if (!parseIsoDateOnly(fields.hireDateRaw)) {
    return "La date d'embauche n'est pas valide.";
  }
  if (
    fields.contractEndDateRaw !== null &&
    !parseIsoDateOnly(fields.contractEndDateRaw)
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
    !parseIsoDateOnly(fields.nextMedicalVisitDateRaw)
  ) {
    return "La date de prochaine visite médicale n'est pas valide.";
  }
  if (!fields.weeklyHoursRaw) {
    return "La durée hebdomadaire contractuelle est obligatoire.";
  }
  const weeklyHours = Number(fields.weeklyHoursRaw);
  const schedule = fields.weeklyScheduleRaw.some((value) => value !== "")
    ? fields.weeklyScheduleRaw.map((value) => (value === "" ? 0 : Number(value)))
    : null;
  try {
    buildContractWorkTime(weeklyHours, schedule);
  } catch (error) {
    return error instanceof Error ? error.message : "Le temps de travail contractuel est invalide.";
  }
  const effectiveRaw = fields.workScheduleEffectiveFromRaw || fields.hireDateRaw;
  if (!parseIsoDateOnly(effectiveRaw)) {
    return "La date d'effet de l'horaire de travail n'est pas valide.";
  }
  return null;
}

function resolveEmployeeWorkTime(fields: ReturnType<typeof readEmployeeFields>) {
  const weeklyHours = Number(fields.weeklyHoursRaw);
  const weeklySchedule = fields.weeklyScheduleRaw.some((value) => value !== "")
    ? fields.weeklyScheduleRaw.map((value) => (value === "" ? 0 : Number(value)))
    : null;
  const effectiveFrom = parseIsoDateOnly(fields.workScheduleEffectiveFromRaw || fields.hireDateRaw)!;
  const work = buildContractWorkTime(weeklyHours, weeklySchedule);
  return { ...work, effectiveFrom };
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
  if (!isOrganizationAdmin(membership)) {
    return { error: "Seuls les propriétaires et administrateurs peuvent ajouter un salarié." };
  }

  const limitError = await checkFreeTierLimit(membership.organizationId);
  if (limitError) return { error: limitError };

  const fields = readEmployeeFields(formData);
  const validationError = validateEmployeeFields(fields);
  if (validationError) return { error: validationError };
  const workTime = resolveEmployeeWorkTime(fields);

  // Isolation multi-tenant : le manager choisi doit appartenir à
  // cette organisation, jamais faire confiance à l'id transmis par le
  // formulaire seul (même règle que pour assignTask/addCustomTask
  // dans events/actions.ts).
  if (fields.managerMembershipId) {
    const manager = await prisma.membership.findFirst({
      where: { id: fields.managerMembershipId, organizationId: membership.organizationId, deletedAt: null },
    });
    if (!manager) return { error: "Ce manager ne fait pas partie de votre organisation." };
  }

  const employee = await prisma.$transaction(async (tx) => {
    const created = await tx.employee.create({
      data: {
        organizationId: membership.organizationId,
        firstName: fields.firstName,
        lastName: fields.lastName,
        civility: fields.civility,
        professionalCategory: fields.professionalCategory,
        position: fields.position || null,
        hireDate: parseIsoDateOnly(fields.hireDateRaw)!,
        contractType: fields.contractType,
        contractEndDate: fields.contractEndDateRaw ? parseIsoDateOnly(fields.contractEndDateRaw) : null,
        probationDuration: fields.probationDuration,
        probationDurationUnit: fields.probationDurationUnit,
        nextMedicalVisitDate: fields.nextMedicalVisitDateRaw ? parseIsoDateOnly(fields.nextMedicalVisitDateRaw) : null,
        managerMembershipId: fields.managerMembershipId,
      },
    });
    await saveEmployeeWorkProfile(tx, {
      organizationId: membership.organizationId,
      employeeId: created.id,
      effectiveFrom: workTime.effectiveFrom,
      weeklyHours: workTime.weeklyHours,
      weeklySchedule: workTime.schedule,
    });
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
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
    `/dashboard/employees/${employee.id}?flash=${encodeURIComponent("Salarié créé")}&welcome=1`
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
  if (!isOrganizationAdmin(membership)) {
    return { error: "Seuls les propriétaires et administrateurs peuvent modifier un salarié." };
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
  const workTime = resolveEmployeeWorkTime(fields);

  // Isolation multi-tenant : même contrôle qu'à la création — voir
  // createEmployee.
  if (fields.managerMembershipId) {
    const manager = await prisma.membership.findFirst({
      where: { id: fields.managerMembershipId, organizationId: membership.organizationId, deletedAt: null },
    });
    if (!manager) return { error: "Ce manager ne fait pas partie de votre organisation." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: employeeId },
      data: {
        firstName: fields.firstName,
        lastName: fields.lastName,
        civility: fields.civility,
        professionalCategory: fields.professionalCategory,
        position: fields.position || null,
        hireDate: parseIsoDateOnly(fields.hireDateRaw)!,
        contractType: fields.contractType,
        contractEndDate: fields.contractEndDateRaw ? parseIsoDateOnly(fields.contractEndDateRaw) : null,
        probationDuration: fields.probationDuration,
        probationDurationUnit: fields.probationDurationUnit,
        nextMedicalVisitDate: fields.nextMedicalVisitDateRaw ? parseIsoDateOnly(fields.nextMedicalVisitDateRaw) : null,
        managerMembershipId: fields.managerMembershipId,
      },
    });
    await saveEmployeeWorkProfile(tx, {
      organizationId: membership.organizationId,
      employeeId,
      effectiveFrom: workTime.effectiveFrom,
      weeklyHours: workTime.weeklyHours,
      weeklySchedule: workTime.schedule,
    });
    await tx.auditLog.create({
      data: {
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "employee.updated",
        entityType: "Employee",
        entityId: employeeId,
        metadata: {
          weeklyHours: workTime.weeklyHours,
          workScheduleEffectiveFrom: workTime.effectiveFrom.toISOString(),
        },
      },
    });
  });

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
  if (!isOrganizationAdmin(membership)) {
    throw new Error("Seuls les propriétaires et administrateurs peuvent archiver un salarié.");
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
        id: randomUUID(),
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "employee.archived",
        entityType: "Employee",
        entityId: employeeId,
      },
    }),
  ]);

  // Une invitation à l'espace salarié encore en attente tombe avec l'archivage ;
  // un espace déjà activé reste ouvert : l'ancien salarié garde ses documents.
  await prisma.$executeRaw`
    UPDATE "employee_accounts" SET "inviteTokenHash" = NULL, "revokedAt" = ${new Date()}, "updatedAt" = ${new Date()}
    WHERE "organizationId" = ${membership.organizationId} AND "employeeId" = ${employeeId} AND "activatedAt" IS NULL AND "revokedAt" IS NULL
  `.catch(() => 0);

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
  if (!isOrganizationAdmin(membership)) {
    throw new Error("Seuls les propriétaires et administrateurs peuvent réactiver un salarié.");
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
        id: randomUUID(),
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

/**
 * Anonymisation d'un salarié archivé (RGPD, droit à l'effacement et fin des durées de conservation).
 * Supprime l'identité, les coordonnées et les données de santé (justificatifs d'arrêt, pièces
 * jointes), l'identité déclarative DSN (NIR, naissance, adresse) et le profil alternance.
 * Conserve ce que la loi impose de garder : historique de paie, bulletins et coffre-fort
 * (C. trav. art. L3243-4 et D3243-8), écritures comptables. Irréversible.
 */
export async function anonymizeEmployee(employeeId: string) {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) throw new Error("Non authentifié ou aucune organisation active");
  if (!isOrganizationAdmin(membership)) throw new Error("Seuls les propriétaires et administrateurs peuvent anonymiser un salarié.");

  const organizationId = membership.organizationId;
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, organizationId, deletedAt: { not: null } }, select: { id: true } });
  if (!employee) throw new Error("Seul un salarié archivé peut être anonymisé.");
  const activeAccount = await prisma.employee_accounts.findFirst({ where: { organizationId, employeeId, activatedAt: { not: null }, revokedAt: null }, select: { id: true } });
  if (activeAccount) {
    redirect(`/dashboard/employees?status=archived&flash=${encodeURIComponent("Retirez d'abord son accès à l'espace salarié avant de l'anonymiser.")}`);
  }

  const label = `anonymisé ${employeeId.slice(0, 6)}`;
  await prisma.$transaction(async (tx) => {
    await tx.employee.update({
      where: { id: employeeId },
      data: { firstName: "Salarié", lastName: label, civility: null, position: null, personalEmail: null, managerMembershipId: null, nextMedicalVisitDate: null },
    });
    const absences = await tx.absence.findMany({ where: { organizationId, employeeId }, select: { id: true } });
    const absenceIds = absences.map((absence) => absence.id);
    if (absenceIds.length > 0) {
      await tx.absenceJustification.updateMany({ where: { absenceId: { in: absenceIds } }, data: { storageKey: null, fileName: null, mimeType: null, sizeBytes: null, rejectionReason: null } });
      await tx.absence.updateMany({ where: { id: { in: absenceIds } }, data: { notes: null, rejectedReason: null } });
    }
    await tx.attachment.deleteMany({ where: { organizationId, task: { employeeEvent: { employeeId } } } });
    await tx.dsn_employee_profiles.deleteMany({ where: { organizationId, employeeId } });
    await tx.employee_alternance_profiles.deleteMany({ where: { organizationId, employeeId } });
    await tx.employee_accounts.deleteMany({ where: { organizationId, employeeId } });
    await tx.auditLog.create({
      data: { id: randomUUID(), organizationId, actorUserId: user.id, action: "employee.anonymized", entityType: "Employee", entityId: employeeId },
    });
  });

  revalidatePath("/dashboard/employees");
  redirect(`/dashboard/employees?status=archived&flash=${encodeURIComponent("Salarié anonymisé")}`);
}
