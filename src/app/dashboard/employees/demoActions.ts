"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { triggerEmployeeEvent } from "@/lib/eventEngine";

function daysFromNow(offset: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(9, 0, 0, 0);
  return date;
}

// Jeu de données fictif, pensé comme une démonstration pédagogique :
// chaque salarié illustre UN cas d'usage précis (parcours actif,
// suggestion, anomalie, fiche incomplète), et la majorité restent
// volontairement "propres" — un vrai jeu de données réaliste
// n'alerte pas sur tout le monde à la fois. Aucun nom ne correspond à
// une personne réelle.
const DEMO_EMPLOYEES = [
  // Parcours vivant, avec retard (embauche déclenchée plus bas)
  {
    firstName: "Antoine",
    lastName: "Perrot",
    civility: "M" as const,
    position: "Technicien de maintenance",
    hireOffset: -5,
    contractType: "CDI" as const,
    probationDuration: 2,
    probationDurationUnit: "MONTHS" as const,
    nextMedicalVisitOffset: null as number | null,
    hasManager: true,
  },
  // Parcours vivant, visite médicale (déclenchée plus bas)
  {
    firstName: "Emma",
    lastName: "Roussel",
    civility: "MME" as const,
    position: "Responsable marketing",
    hireOffset: -900,
    contractType: "CDI" as const,
    probationDuration: null as number | null,
    probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: null as number | null,
    hasManager: false,
  },
  // Parcours déjà terminé — "à jour" (déclenché plus bas)
  {
    firstName: "Manon",
    lastName: "Dubreuil",
    civility: "MME" as const,
    position: "Responsable RH",
    hireOffset: -700,
    contractType: "CDI" as const,
    probationDuration: null as number | null,
    probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: null as number | null,
    hasManager: false,
  },
  // Suggestion : période d'essai (apprentissage) qui approche
  {
    firstName: "Karim",
    lastName: "Belhaj",
    civility: "M" as const,
    position: "Apprenti technicien",
    hireOffset: -20,
    contractType: "APPRENTISSAGE" as const,
    probationDuration: 45 as number | null,
    probationDurationUnit: "DAYS" as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: null as number | null,
    hasManager: true,
  },
  // Suggestion : période d'essai (CDI classique) qui approche
  {
    firstName: "Nicolas",
    lastName: "Fabre",
    civility: "M" as const,
    position: "Analyste financier",
    hireOffset: -80,
    contractType: "CDI" as const,
    probationDuration: 3 as number | null,
    probationDurationUnit: "MONTHS" as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: null as number | null,
    hasManager: true,
  },
  // Fiche incomplète + sans parcours d'embauche déclenché
  {
    firstName: "Julien",
    lastName: "Marchand",
    civility: "M" as const,
    position: "Développeur",
    hireOffset: -25,
    contractType: null as "CDI" | "CDD" | "APPRENTISSAGE" | "PROFESSIONNALISATION" | null,
    probationDuration: null as number | null,
    probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: null as number | null,
    hasManager: false,
  },
  // Sans manager + aucune visite médicale jamais programmée
  {
    firstName: "Léa",
    lastName: "Fontaine",
    civility: "MME" as const,
    position: "Secrétaire médicale",
    hireOffset: -400,
    contractType: "CDI" as const,
    probationDuration: null as number | null,
    probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: null as number | null,
    hasManager: false,
  },
  // Aucune visite médicale jamais programmée (seule anomalie)
  {
    firstName: "Sarah",
    lastName: "Benali",
    civility: "AUTRE" as const,
    position: "Comptable",
    hireOffset: -1000,
    contractType: "CDI" as const,
    probationDuration: null as number | null,
    probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: null as number | null,
    hasManager: true,
  },
  // Salariés "propres" — rien à signaler, volontairement, pour que la
  // démo ne donne pas l'impression que tout le monde pose problème.
  {
    firstName: "Sophie",
    lastName: "Lemoine",
    civility: "MME" as const,
    position: "Assistante comptable",
    hireOffset: -60,
    contractType: "CDD" as const,
    probationDuration: 4 as number | null,
    probationDurationUnit: "MONTHS" as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: null as number | null,
    hasManager: true,
  },
  {
    firstName: "Thomas",
    lastName: "Girard",
    civility: "M" as const,
    position: "Chargé de projet",
    hireOffset: -60,
    contractType: "PROFESSIONNALISATION" as const,
    probationDuration: 4 as number | null,
    probationDurationUnit: "MONTHS" as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: null as number | null,
    hasManager: true,
  },
  {
    firstName: "Hugo",
    lastName: "Lacroix",
    civility: "M" as const,
    position: "Commercial",
    hireOffset: -200,
    contractType: "CDD" as const,
    probationDuration: null as number | null,
    probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: null as number | null,
    hasManager: true,
  },
  {
    firstName: "Chloé",
    lastName: "Bertin",
    civility: "MME" as const,
    position: "Apprentie assistante RH",
    hireOffset: -5,
    contractType: "APPRENTISSAGE" as const,
    probationDuration: 45 as number | null,
    probationDurationUnit: "DAYS" as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: null as number | null,
    hasManager: true,
  },
  {
    firstName: "Inès",
    lastName: "Chevalier",
    civility: "MME" as const,
    position: "Chargée de recrutement",
    hireOffset: -300,
    contractType: "CDI" as const,
    probationDuration: null as number | null,
    probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: null as number | null,
    hasManager: true,
  },
  {
    firstName: "Maxime",
    lastName: "Renard",
    civility: "M" as const,
    position: "Magasinier",
    hireOffset: -45,
    contractType: "CDD" as const,
    probationDuration: 3 as number | null,
    probationDurationUnit: "MONTHS" as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: null as number | null,
    hasManager: true,
  },
  {
    firstName: "Camille",
    lastName: "Vidal",
    civility: "AUTRE" as const,
    position: "Chargée de clientèle",
    hireOffset: -540,
    contractType: "CDI" as const,
    probationDuration: null as number | null,
    probationDurationUnit: null as "DAYS" | "WEEKS" | "MONTHS" | null,
    nextMedicalVisitOffset: 45 as number | null,
    hasManager: true,
  },
];

export async function generateDemoOrganization() {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    throw new Error("Non authentifié ou aucune organisation active");
  }

  const createdEmployees: { id: string; firstName: string; lastName: string; hireDate: Date }[] = [];

  for (const template of DEMO_EMPLOYEES) {
    const created = await prisma.employee.create({
      data: {
        organizationId: membership.organizationId,
        firstName: template.firstName,
        lastName: template.lastName,
        civility: template.civility,
        position: template.position,
        hireDate: daysFromNow(template.hireOffset),
        contractType: template.contractType,
        probationDuration: template.probationDuration,
        probationDurationUnit: template.probationDurationUnit,
        nextMedicalVisitDate:
          template.nextMedicalVisitOffset !== null ? daysFromNow(template.nextMedicalVisitOffset) : null,
        managerMembershipId: template.hasManager ? membership.id : null,
      },
    });
    createdEmployees.push(created);
  }

  await prisma.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "organization.demo_generated",
      entityType: "Organization",
      entityId: membership.organizationId,
    },
  });

  // Antoine (embauché il y a 5 jours) : un vrai parcours Embauche,
  // avec des tâches naturellement en retard puisque ses échéances sont
  // calculées par rapport à une date d'embauche déjà passée.
  const antoine = createdEmployees.find((e) => e.firstName === "Antoine");
  if (antoine) {
    await triggerEmployeeEvent({
      organizationId: membership.organizationId,
      employeeId: antoine.id,
      eventTemplateKey: "embauche",
      triggerDate: antoine.hireDate,
      actorUserId: user.id,
    });
  }

  // Tous les autres salariés (sauf Antoine, déjà couvert, et Julien,
  // qui illustre volontairement l'oubli) reçoivent un parcours
  // Embauche historique déjà entièrement terminé — dans une vraie
  // entreprise, un salarié embauché depuis des mois ou des années a
  // évidemment déjà été onboardé. Sans ça, le détecteur les signalait
  // tous, ce qui n'avait aucun sens (bug remonté en test réel).
  const skipOnboarding = new Set(["Antoine", "Julien"]);
  for (const employee of createdEmployees) {
    if (skipOnboarding.has(employee.firstName)) continue;

    const employeeEvent = await triggerEmployeeEvent({
      organizationId: membership.organizationId,
      employeeId: employee.id,
      eventTemplateKey: "embauche",
      triggerDate: employee.hireDate,
      actorUserId: user.id,
    });
    await prisma.task.updateMany({
      where: { employeeEventId: employeeEvent.id },
      data: { status: "DONE" },
    });
  }

  // Emma : un parcours Visite médicale déclenché aujourd'hui.
  const emma = createdEmployees.find((e) => e.firstName === "Emma");
  if (emma) {
    await triggerEmployeeEvent({
      organizationId: membership.organizationId,
      employeeId: emma.id,
      eventTemplateKey: "visite_medicale",
      triggerDate: new Date(),
      actorUserId: user.id,
    });
  }

  // Manon : un parcours Fin de période d'essai déjà entièrement
  // terminé — pour montrer aussi un parcours "à jour", pas seulement
  // des retards.
  const manon = createdEmployees.find((e) => e.firstName === "Manon");
  if (manon) {
    const employeeEvent = await triggerEmployeeEvent({
      organizationId: membership.organizationId,
      employeeId: manon.id,
      eventTemplateKey: "fin_periode_essai",
      triggerDate: daysFromNow(-650),
      actorUserId: user.id,
    });
    await prisma.task.updateMany({
      where: { employeeEventId: employeeEvent.id },
      data: { status: "DONE" },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/events");
  redirect(
    `/dashboard/employees?flash=${encodeURIComponent(
      "Entreprise de démonstration générée (15 salariés, plusieurs parcours)"
    )}`
  );
}

/**
 * Archive en masse tous les salariés actifs — pas une vraie
 * suppression (cohérent avec l'archivage individuel déjà existant).
 * Utile après un mauvais import ou pour repartir d'une base propre en
 * test/démo, sans jamais perdre l'historique définitivement.
 */
export async function archiveAllEmployees() {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    throw new Error("Non authentifié ou aucune organisation active");
  }

  const result = await prisma.employee.updateMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: membership.organizationId,
      actorUserId: user.id,
      action: "employees.bulk_archived",
      entityType: "Organization",
      entityId: membership.organizationId,
      metadata: { count: result.count },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/events");
  redirect(
    `/dashboard/employees?flash=${encodeURIComponent(`${result.count} salarié${result.count > 1 ? "s" : ""} archivé${result.count > 1 ? "s" : ""}`)}`
  );
}
