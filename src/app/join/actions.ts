"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Quitter son organisation actuelle pour en rejoindre une nouvelle,
 * via une invitation. Jamais automatique ni silencieux — la personne
 * doit explicitement confirmer ce choix depuis /join/[token].
 *
 * Toutes les vérifications sont refaites ici, pas seulement affichées
 * côté page : l'état a pu changer entre l'affichage et la soumission
 * (invitation expirée entre-temps, etc.).
 */
export async function switchOrganization(token: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non authentifié.");

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });
  if (!invitation) throw new Error("Invitation introuvable.");
  if (invitation.acceptedAt) throw new Error("Cette invitation a déjà été utilisée.");
  if (invitation.expiresAt < new Date()) throw new Error("Cette invitation a expiré.");
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new Error("Cette invitation ne correspond pas à votre adresse email.");
  }

  const currentMembership = await prisma.membership.findFirst({
    where: { userId: user.id, deletedAt: null },
  });
  if (!currentMembership) throw new Error("Aucune organisation actuelle à quitter.");

  // Sécurité : jamais laisser une organisation sans propriétaire.
  // Un Owner qui n'est pas seul ne peut pas partir tant que la
  // propriété n'a pas été transférée — fonctionnalité qui n'existe
  // pas encore, donc on bloque plutôt que de créer une situation
  // impossible à rattraper.
  if (currentMembership.accessRole === "OWNER") {
    const otherMembersCount = await prisma.membership.count({
      where: {
        organizationId: currentMembership.organizationId,
        deletedAt: null,
        id: { not: currentMembership.id },
      },
    });
    if (otherMembersCount > 0) {
      throw new Error(
        "Vous êtes propriétaire de votre organisation actuelle, qui compte d'autres membres. Transférez la propriété avant de la quitter, contactez-nous si besoin."
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.membership.update({
      where: { id: currentMembership.id },
      data: { deletedAt: new Date() },
    });
    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: invitation.organizationId,
        accessRole: invitation.accessRole,
      },
    });
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        organizationId: currentMembership.organizationId,
        actorUserId: user.id,
        action: "membership.left_for_another_org",
        entityType: "Membership",
        entityId: currentMembership.id,
      },
    });
    await tx.auditLog.create({
      data: {
        organizationId: invitation.organizationId,
        actorUserId: user.id,
        action: "invitation.accepted",
        entityType: "Invitation",
        entityId: invitation.id,
      },
    });
  });

  redirect("/dashboard");
}
