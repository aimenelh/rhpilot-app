import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// Depuis la version d'API "Basil" de Stripe (31 mars 2025),
// current_period_end n'existe plus sur l'abonnement lui-même, il vit
// sur chaque ligne de facturation (un abonnement peut avoir plusieurs
// lignes avec des périodes différentes). Nos deux lignes partagent la
// même périodicité mensuelle, donc la première suffit.
function getPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const periodEndSeconds = subscription.items.data[0]?.current_period_end;
  return periodEndSeconds ? new Date(periodEndSeconds * 1000) : null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature invalide : ${err instanceof Error ? err.message : "inconnue"}` },
      { status: 400 }
    );
  }

  switch (event.type) {
    // Premier paiement réussi : on relie l'organisation au client et
    // à l'abonnement Stripe fraîchement créés.
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organizationId ?? session.client_reference_id;

      if (organizationId && session.subscription && session.customer) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await prisma.organization.update({
          where: { id: organizationId },
          data: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            currentPeriodEnd: getPeriodEnd(subscription),
          },
        });
      }
      break;
    }

    // Renouvellement, échec de paiement, changement de statut,
    // résiliation : on reflète simplement l'état que Stripe nous
    // donne, aucune logique métier ici.
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.organization.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          subscriptionStatus: subscription.status,
          currentPeriodEnd: getPeriodEnd(subscription),
        },
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
