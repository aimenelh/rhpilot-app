import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createCheckoutSession } from "./actions";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const organization = await prisma.organization.findUnique({
    where: { id: membership.organizationId },
  });

  const isPro = organization?.subscriptionStatus === "active";

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">Facturation</h1>

      {searchParams.success && (
        <p className="mt-4 rounded-lg border border-accent-teal/30 bg-accent-teal/5 px-3.5 py-2.5 text-sm text-accent-teal">
          Abonnement activé, merci !
        </p>
      )}
      {searchParams.canceled && (
        <p className="mt-4 rounded-lg border border-surface-border bg-surface-subtle px-3.5 py-2.5 text-sm text-ink-soft">
          Paiement annulé, aucune modification n&apos;a été effectuée.
        </p>
      )}

      <Card className="mt-6">
        {isPro ? (
          <>
            <p className="text-sm font-semibold text-ink">Vous êtes sur le palier Pro.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Statut : {organization?.subscriptionStatus}
              {organization?.currentPeriodEnd &&
                ` — prochain renouvellement le ${organization.currentPeriodEnd.toLocaleDateString("fr-FR")}.`}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-ink">Vous êtes sur le palier Gratuit.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Passez sur Pro pour des salariés illimités : 15 € / mois + 3 € / salarié / mois.
            </p>
            <form action={createCheckoutSession} className="mt-4">
              <Button type="submit">Passer sur Pro</Button>
            </form>
          </>
        )}
      </Card>
    </div>
  );
}
