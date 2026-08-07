"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership } from "@/lib/auth";

export async function updateConventionCollective(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") {
    throw new Error("Seuls les propriétaires et administrateurs peuvent modifier ce réglage.");
  }

  const raw = String(formData.get("conventionCollective") ?? "").trim();

  await prisma.organization.update({
    where: { id: membership.organizationId },
    data: { conventionCollective: raw || null },
  });

  revalidatePath("/dashboard/configuration");
  revalidatePath("/dashboard/configuration/organisation");
  revalidatePath("/dashboard/employees");
  revalidatePath("/dashboard/events");
}

/**
 * Chacun renseigne son propre rôle fonctionnel (RH ou Dirigeant) —
 * jamais deviné, jamais imposé. C'est ce qui permet aux tâches
 * générées automatiquement ("assigner à la personne RH") de trouver
 * un vrai responsable plutôt que de rester "À assigner" indéfiniment.
 * Si personne ou plusieurs personnes correspondent, la tâche reste
 * volontairement non assignée — voir resolveAssignedMembershipId.
 */
export async function updateFunctionalRole(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");

  const raw = String(formData.get("functionalRole") ?? "");
  const value = raw === "RH" || raw === "DIRIGEANT" ? raw : null;

  await prisma.membership.update({
    where: { id: membership.id },
    data: { functionalRole: value },
  });

  revalidatePath("/dashboard/configuration");
  revalidatePath("/dashboard/configuration/organisation");
}

/**
 * Annule une personnalisation mémorisée — l'étape concernée revient
 * exactement au comportement du gabarit standard pour les futurs
 * parcours. Ne touche jamais aux parcours déjà générés.
 */
export async function revertTaskTemplateOverride(overrideId: string) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");

  await prisma.taskTemplateOverride.deleteMany({
    where: { id: overrideId, organizationId: membership.organizationId },
  });

  revalidatePath("/dashboard/configuration");
  revalidatePath("/dashboard/configuration/parcours");
}

/**
 * Crée une règle de relance automatique — "X jours avant l'échéance,
 * prévenir telle personne". Sans effet tant qu'aucune règle n'est
 * définie : aucune relance automatique n'est envoyée par défaut.
 */
export async function createReminderRule(formData: FormData) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") {
    throw new Error("Seuls les propriétaires et administrateurs peuvent modifier ce réglage.");
  }

  const daysBeforeDue = Number(formData.get("daysBeforeDue"));
  const notifyAssignee = formData.get("notifyAssignee") === "on";
  const notifyManager = formData.get("notifyManager") === "on";

  if (!Number.isInteger(daysBeforeDue) || daysBeforeDue < 0 || daysBeforeDue > 90) {
    throw new Error("Le délai doit être un nombre de jours entre 0 et 90.");
  }
  if (!notifyAssignee && !notifyManager) {
    throw new Error("Choisissez au moins un destinataire.");
  }

  const existing = await prisma.reminderRule.findFirst({
    where: { organizationId: membership.organizationId, daysBeforeDue },
  });
  if (existing) {
    throw new Error(`Une règle existe déjà pour ${daysBeforeDue} jour(s) avant l'échéance.`);
  }

  await prisma.reminderRule.create({
    data: { organizationId: membership.organizationId, daysBeforeDue, notifyAssignee, notifyManager },
  });

  revalidatePath("/dashboard/configuration");
  revalidatePath("/dashboard/configuration/notifications");
}

export async function deleteReminderRule(ruleId: string) {
  const membership = await getCurrentMembership();
  if (!membership) throw new Error("Non authentifié ou aucune organisation active");
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") {
    throw new Error("Seuls les propriétaires et administrateurs peuvent modifier ce réglage.");
  }

  await prisma.reminderRule.deleteMany({
    where: { id: ruleId, organizationId: membership.organizationId },
  });

  revalidatePath("/dashboard/configuration");
  revalidatePath("/dashboard/configuration/notifications");
}
