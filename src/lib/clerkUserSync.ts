import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

/** Même synchronisation pour la session et le webhook, sans créer de Membership. */
export async function syncClerkUser(authProviderId: string) {
  // Relire Clerk évite qu'un webhook ancien rétablisse une identité supprimée.
  const identity = await clerkClient.users.getUser(authProviderId).catch((error: unknown) => {
    if (isNotFound(error)) return null;
    throw error;
  });
  if (!identity) return null;
  const primary = identity.emailAddresses.find((email) => email.id === identity.primaryEmailAddressId);
  if (!primary || primary.verification?.status !== "verified") {
    throw new Error("Vérifiez votre adresse e-mail avant d'activer votre compte.");
  }
  const email = primary.emailAddress.trim().toLowerCase();
  const profile = { email, firstName: identity.firstName, lastName: identity.lastName };

  // Le webhook et la première requête de session peuvent arriver ensemble.
  // Les contraintes uniques et les mises à jour conditionnelles arbitrent la course.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const linked = await prisma.user.findUnique({ where: { authProviderId } });
      if (linked) {
        if (linked.deletedAt) throw new Error("Ce compte a été désactivé. Contactez RH Pilot.");
        return await prisma.user.update({ where: { id: linked.id }, data: profile });
      }
      const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
      if (!existing) {
        return await prisma.user.create({ data: { authProviderId, ...profile } });
      }
      if (existing.deletedAt) throw new Error("Ce compte a été désactivé. Contactez RH Pilot.");
      if (existing.authProviderId && existing.authProviderId !== authProviderId) {
        // Ne jamais reprendre un compte encore présent dans Clerk. Seul un 404
        // confirmé permet de réparer une ancienne liaison devenue orpheline.
        const previous = await clerkClient.users.getUser(existing.authProviderId).catch((error: unknown) => {
          if (isNotFound(error)) return null;
          throw error;
        });
        if (previous) throw new Error("Cette adresse est déjà liée à un autre compte. Connectez-vous avec votre compte existant ou contactez RH Pilot.");
      }
      const claimed = await prisma.user.updateMany({
        where: { id: existing.id, authProviderId: existing.authProviderId, deletedAt: null },
        data: { authProviderId, ...profile },
      });
      if (claimed.count === 1) return await prisma.user.findUniqueOrThrow({ where: { authProviderId } });
    } catch (error) {
      if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "P2002") throw error;
    }
  }
  throw new Error("Votre compte n'a pas pu être synchronisé. Réessayez dans un instant.");
}
