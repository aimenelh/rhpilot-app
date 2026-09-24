"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { stripe, STRIPE_PRICE_BASE, STRIPE_PRICE_PER_EMPLOYEE } from "@/lib/stripe";
import { employeeQuantityForBilling } from "@/lib/billingPolicy";

export type BillingActionState = { error: string } | undefined;

export async function createCheckoutSession(
  _prevState: BillingActionState
): Promise<BillingActionState> {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    return { error: "Session expirée, veuillez recharger la page." };
  }
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") {
    return { error: "Seuls les propriétaires et administrateurs peuvent gérer la facturation." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
  });
  if (!organization) {
    return { error: "Organisation introuvable." };
  }
  if (
    organization.stripeSubscriptionId &&
    ["active", "trialing", "past_due"].includes(organization.subscriptionStatus ?? "")
  ) {
    return { error: "Un abonnement est déjà actif pour cette organisation." };
  }

  // Quantité du prix "par salarié" = nombre de salariés actifs
  // aujourd'hui. Se resynchronisera ensuite via la tâche planifiée
  // quotidienne plutôt qu'à chaque ajout/suppression de salarié.
  const employeeCount = await prisma.employee.count({
    where: { organizationId: organization.id, deletedAt: null },
  });

  let sessionUrl: string | null;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: organization.stripeCustomerId ?? undefined,
      customer_email: organization.stripeCustomerId ? undefined : user.email,
      client_reference_id: organization.id,
      metadata: { organizationId: organization.id },
      subscription_data: {
        metadata: { organizationId: organization.id },
      },
      line_items: [
        { price: STRIPE_PRICE_BASE, quantity: 1 },
        { price: STRIPE_PRICE_PER_EMPLOYEE, quantity: employeeQuantityForBilling(employeeCount) },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=1`,
    });
    sessionUrl = session.url;
  } catch (error) {
    // Un stripeCustomerId périmé (ex. résidu d'un changement de mode
    // test/live) ou tout autre refus de Stripe ne doit jamais faire
    // planter la page brutalement pour l'utilisateur — voir aussi
    // createPortalSession ci-dessous.
    console.error("Stripe checkout.sessions.create a échoué :", error);
    return {
      error:
        "Impossible de démarrer le paiement pour le moment. Réessayez dans un instant, ou contactez-nous si ça persiste.",
    };
  }

  if (!sessionUrl) {
    return { error: "Impossible de créer la session de paiement, réessayez." };
  }

  redirect(sessionUrl);
}

// Portail hébergé par Stripe : le salarié administrateur peut y
// changer sa carte, résilier ou consulter ses factures sans qu'on ait
// à reconstruire cette interface nous-mêmes.
export async function createPortalSession(
  _prevState: BillingActionState
): Promise<BillingActionState> {
  const membership = await getCurrentMembership();
  if (!membership) {
    return { error: "Session expirée, veuillez recharger la page." };
  }
  if (membership.accessRole !== "OWNER" && membership.accessRole !== "ADMIN") {
    return { error: "Seuls les propriétaires et administrateurs peuvent gérer la facturation." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
  });
  if (!organization?.stripeCustomerId) {
    return { error: "Aucun abonnement actif à gérer." };
  }

  let portalUrl: string;
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
    });
    portalUrl = portalSession.url;
  } catch (error) {
    console.error("Stripe billingPortal.sessions.create a échoué :", error);
    return {
      error:
        "Impossible d'ouvrir votre espace de facturation pour le moment. Réessayez dans un instant, ou contactez-nous si ça persiste.",
    };
  }

  redirect(portalUrl);
}
