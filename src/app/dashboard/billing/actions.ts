"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth";
import { stripe, STRIPE_PRICE_BASE, STRIPE_PRICE_PER_EMPLOYEE } from "@/lib/stripe";

export async function createCheckoutSession() {
  const membership = await getCurrentMembership();
  const user = await getCurrentUser();
  if (!membership || !user) {
    throw new Error("Session expirée, veuillez recharger la page.");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
  });
  if (!organization) {
    throw new Error("Organisation introuvable.");
  }

  // Quantité du prix "par salarié" = nombre de salariés actifs
  // aujourd'hui. Se resynchronisera ensuite via la tâche planifiée
  // quotidienne plutôt qu'à chaque ajout/suppression de salarié.
  const employeeCount = await prisma.employee.count({
    where: { organizationId: organization.id, deletedAt: null },
  });

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
      { price: STRIPE_PRICE_PER_EMPLOYEE, quantity: Math.max(employeeCount, 1) },
    ],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=1`,
  });

  if (!session.url) {
    throw new Error("Impossible de créer la session de paiement, réessayez.");
  }

  redirect(session.url);
}
