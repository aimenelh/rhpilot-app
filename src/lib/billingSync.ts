import { prisma } from "@/lib/prisma";
import { stripe, STRIPE_PRICE_PER_EMPLOYEE } from "@/lib/stripe";
import { employeeQuantityForBilling } from "@/lib/billingPolicy";

const TERMINAL_SUBSCRIPTION_STATUSES = new Set(["canceled", "incomplete_expired"]);

export async function syncStripeEmployeeQuantities() {
  const organizations = await prisma.organization.findMany({
    where: {
      deletedAt: null,
      stripeSubscriptionId: { not: null },
    },
    select: {
      id: true,
      stripeSubscriptionId: true,
    },
  });

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;

  for (const organization of organizations) {
    const subscriptionId = organization.stripeSubscriptionId;
    if (!subscriptionId) continue;

    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      if (TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status)) {
        skipped += 1;
        continue;
      }

      const employeeItem = subscription.items.data.find(
        (item) => item.price.id === STRIPE_PRICE_PER_EMPLOYEE
      );

      if (!employeeItem) {
        failed += 1;
        console.error(
          "Synchronisation Stripe impossible : ligne par salarié introuvable",
          { organizationId: organization.id, subscriptionId }
        );
        continue;
      }

      const activeEmployeeCount = await prisma.employee.count({
        where: {
          organizationId: organization.id,
          deletedAt: null,
        },
      });

      const desiredQuantity = employeeQuantityForBilling(activeEmployeeCount);
      const currentQuantity = employeeItem.quantity ?? 0;

      if (currentQuantity === desiredQuantity) {
        unchanged += 1;
        continue;
      }

      await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: employeeItem.id, quantity: desiredQuantity }],
        proration_behavior: "create_prorations",
      });

      updated += 1;
    } catch (error) {
      failed += 1;
      console.error("Synchronisation Stripe du nombre de salariés échouée", {
        organizationId: organization.id,
        subscriptionId,
        error,
      });
    }
  }

  return { updated, unchanged, skipped, failed };
}
