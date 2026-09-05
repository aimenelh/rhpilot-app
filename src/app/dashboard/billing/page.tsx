import { CreditCard, Crown, CircleCheck, Users, Receipt } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/format";
import { ManageSubscriptionButton } from "./ManageSubscriptionButton";
import { UpgradeToProButton } from "./UpgradeToProButton";

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
  const usageRatio = Math.min(employeeCount / FREE_TIER_LIMIT, 1);

  return (
    <div className="max-w-4xl">
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

      {isPro ? (
        // Déjà sur Pro : une seule carte, pas besoin de remettre en avant
        // l'offre qu'on utilise déjà.
        <Card className="mt-6 max-w-2xl">
          <div className="flex items-start gap-3">
            <CreditCard size={20} className="mt-0.5 shrink-0 text-accent-teal" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-ink">Palier Pro</p>
                <span className="rounded-full bg-accent-teal/10 px-2 py-0.5 text-xs font-medium text-accent-teal">
                  Actif
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {monthlyEstimate} € estimés ce mois-ci (15 € + 3 € × {employeeCount} salarié
                {employeeCount > 1 ? "s" : ""}).
                {organization?.currentPeriodEnd &&
                  ` Prochain renouvellement le ${formatDate(organization.currentPeriodEnd)}.`}
              </p>
              <div className="mt-4">
                <ManageSubscriptionButton />
              </div>
            </div>
          </div>
        </Card>
      ) : (
        // Palier Gratuit : deux blocs volontairement asymétriques — le
        // plan actuel en sobre, l'offre Pro mise en avant par une
        // légère teinte de fond plutôt qu'un habillage identique.
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <div className="flex items-start gap-3">
              <CreditCard size={20} className="mt-0.5 shrink-0 text-ink-faint" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Gratuit</p>
                <p className="mt-1 text-2xl font-semibold text-ink">0 €<span className="text-sm font-normal text-ink-soft"> / mois</span></p>
                <p className="mt-1 text-sm text-ink-soft">Jusqu&apos;à {FREE_TIER_LIMIT} salariés</p>
                <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-ink-soft">
                  <CircleCheck size={15} className="text-ink-faint" />
                  Plan actuel
                </p>
              </div>
            </div>
          </Card>

          <Card className="border-brand-primary/25 bg-brand-primary/[0.03]">
            <div className="flex items-start gap-3">
              <Crown size={20} className="mt-0.5 shrink-0 text-brand-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Pro</p>
                <p className="mt-1 text-2xl font-semibold text-ink">15 €<span className="text-sm font-normal text-ink-soft"> / mois</span></p>
                <p className="mt-1 text-sm text-ink-soft">+ 3 € par salarié / mois</p>
                <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
                  <CircleCheck size={15} className="shrink-0 text-brand-primary" />
                  Pas de limite de salariés
                </p>
                <div className="mt-4">
                  <UpgradeToProButton />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {!isPro && (
        <Card className="mt-4" compact>
          <div className="flex items-center gap-3">
            <Users size={18} className="shrink-0 text-ink-faint" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">
                {employeeCount} / {FREE_TIER_LIMIT} salariés utilisés
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                <div
                  className="h-full rounded-full bg-brand-primary transition-all"
                  style={{ width: `${usageRatio * 100}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-ink-faint">
                Le palier Gratuit est limité à {FREE_TIER_LIMIT} salariés. Passez sur Pro pour lever
                cette limite.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-4" compact>
        <div className="flex items-center gap-3">
          <Receipt size={18} className="shrink-0 text-ink-faint" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Historique de facturation</p>
            <p className="mt-0.5 text-xs text-ink-faint">Aucune facture pour le moment.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
