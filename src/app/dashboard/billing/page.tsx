import { CreditCard, CircleCheck, Users } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/format";
import { createCheckoutSession, createPortalSession } from "./actions";

const FREE_TIER_LIMIT = 3;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { success?: string; canceled?: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/dashboard");

  const [organization, employeeCount] = await Promise.all([
    prisma.organization.findUnique({ where: { id: membership.organizationId } }),
    prisma.employee.count({ where: { organizationId: membership.organizationId, deletedAt: null } }),
  ]);

  const isPro = organization?.subscriptionStatus === "active";
  const monthlyEstimate = isPro ? (15 + employeeCount * 3).toFixed(2) : null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink">Facturation</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Votre palier actuel et vos informations de paiement, gérés directement ici.
      </p>

      {searchParams.success && (
        <p className="mt-4 flex items-center gap-2 rounded-lg border border-accent-teal/30 bg-accent-teal/5 px-3.5 py-2.5 text-sm text-accent-teal">
          <CircleCheck size={15} className="shrink-0" />
          Abonnement activé, merci !
        </p>
      )}
      {searchParams.canceled && (
        <p className="mt-4 rounded-lg border border-surface-border bg-surface-subtle px-3.5 py-2.5 text-sm text-ink-soft">
          Paiement annulé, aucune modification n&apos;a été effectuée.
        </p>
      )}

      <Card className="mt-6">
        <div className="flex items-start gap-3.5">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isPro ? "bg-accent-teal/10 text-accent-teal" : "bg-brand-blue/10 text-brand-blue"
            }`}
          >
            <CreditCard size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-ink">
                Palier {isPro ? "Pro" : "Gratuit"}
              </p>
              {isPro && (
                <span className="rounded-full bg-accent-teal/10 px-2 py-0.5 text-xs font-medium text-accent-teal">
                  Actif
                </span>
              )}
            </div>

            {isPro ? (
              <p className="mt-1 text-sm text-ink-soft">
                {monthlyEstimate} € estimés ce mois-ci (15 € + 3 € × {employeeCount} salarié
                {employeeCount > 1 ? "s" : ""}).
                {organization?.currentPeriodEnd &&
                  ` Prochain renouvellement le ${formatDate(organization.currentPeriodEnd)}.`}
              </p>
            ) : (
              <p className="mt-1 text-sm text-ink-soft">
                Salariés illimités et facture unique à 15 € + 3 € par salarié / mois en passant sur
                Pro.
              </p>
            )}

            <div className="mt-4">
              {isPro ? (
                <form action={createPortalSession}>
                  <Button variant="secondary" type="submit" className="text-sm">
                    Gérer mon abonnement
                  </Button>
                </form>
              ) : (
                <form action={createCheckoutSession}>
                  <Button type="submit" className="text-sm">
                    Passer sur Pro
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </Card>

      {!isPro && (
        <Card className="mt-4" compact>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/5 text-ink-soft">
              <Users size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                {employeeCount} / {FREE_TIER_LIMIT} salariés utilisés
              </p>
              <p className="mt-0.5 text-xs text-ink-faint">
                Le palier Gratuit est limité à {FREE_TIER_LIMIT} salariés. Passez sur Pro pour lever
                cette limite.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
