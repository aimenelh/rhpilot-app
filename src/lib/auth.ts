import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Résout l'utilisateur RH Pilot correspondant à la session Clerk
 * courante. Retourne null si non connecté ou si le webhook
 * user.created n'a pas encore (ou plus) de correspondance —
 * ce dernier cas doit rester rare et est journalisé pour investigation.
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

  if (!user) {
    console.error(
      `Aucun User RH Pilot pour authProviderId=${clerkUserId} — webhook Clerk manqué ou en retard ?`
    );
    return null;
  }

  return user;
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
 * Sprint 1-2 : une seule organisation active à la fois (la première
 * du compte). Le sélecteur multi-organisations (consultant RH externe
 * suivant plusieurs clients) est prévu mais hors périmètre actuel.
 * Retourne null si l'utilisateur n'a encore aucune organisation.
 */
export const getCurrentMembership = cache(async function getCurrentMembership() {
  const { memberships } = await getCurrentMemberships();
  return memberships[0] ?? null;
});
