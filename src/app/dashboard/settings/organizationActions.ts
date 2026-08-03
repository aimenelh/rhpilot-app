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

  revalidatePath("/dashboard/settings");
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

  revalidatePath("/dashboard/settings");
}
