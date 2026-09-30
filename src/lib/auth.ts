import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { syncClerkUser } from "@/lib/clerkUserSync";

/**
 * Résout l'utilisateur RH Pilot correspondant à la session Clerk
 * courante. Si le webhook n'a pas abouti, synchronise immédiatement
 * l'identité vérifiée côté serveur au lieu d'attendre sa livraison.
 *
 * Rappel architecture : Clerk sert uniquement d'identité (authProviderId).
 * L'organisation/l'appartenance restent portées par nos propres tables
 * Organization/Membership, pas par les organisations Clerk.
 *
 * Enveloppé avec React `cache()` : plusieurs composants serveur de la
 * même requête (layout + page, par exemple) peuvent l'appeler sans
 * déclencher plusieurs requêtes base de données identiques.
 */
export const getCurrentUser = cache(async function getCurrentUser() {
  const { userId: clerkUserId } = auth();
  if (!clerkUserId) return null;

  const user = await prisma.user.findUnique({
    where: { authProviderId: clerkUserId },
  });

  if (user?.deletedAt) return null;
  return user ?? await syncClerkUser(clerkUserId);
});

/**
 * Retourne les memberships actifs (non désactivés) de l'utilisateur
 * courant, avec leur organisation. Un utilisateur sans membership
 * doit être redirigé vers la création d'organisation par l'appelant.
 */
export const getCurrentMemberships = cache(async function getCurrentMemberships() {
  const user = await getCurrentUser();
  if (!user) return { user: null, memberships: [] as const };

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id, deletedAt: null },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  return { user, memberships };
});

/**
 * Retourne l'organisation active du compte (la première créée).
 * Le multi-organisation (consultant RH externe suivant plusieurs
 * clients) n'est pas encore exposé dans l'interface, mais le modèle
 * de données le permet déjà — voir Membership.
 * Retourne null si l'utilisateur n'a encore aucune organisation.
 */
export const getCurrentMembership = cache(async function getCurrentMembership() {
  const { memberships } = await getCurrentMemberships();
  return memberships[0] ?? null;
});
