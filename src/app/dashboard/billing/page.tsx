import { CircleCheck, Lock } from "lucide-react";
import { getCurrentMembership } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDate } from "@/lib/format";
import { ManageSubscriptionButton } from "./ManageSubscriptionButton";
import { UpgradeToProButton } from "./UpgradeToProButton";

const FREE_TIER_LIMIT = 3;

// Ce que RH Pilot inclut réellement, identique sur les deux paliers —
// seul le nombre de salariés distingue Gratuit de Pro. Jamais de
// fonctionnalité présentée comme incluse si elle ne l'est pas.
const INCLUDED_FEATURES = [
  "Parcours RH automatisés (embauche, période d'essai, visite médicale...)",
  "Détection proactive des anomalies et échéances",
  "Rappels automatiques par email",
  "Assistant RH intégré",
];

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
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-ink">Votre abonnement</h1>

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

      {/* Bloc principal : éditorial, pas une carte de tarification —
          l'utilisateur est déjà client, on ne cherche pas à le
          convaincre. */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Palier actuel</p>
        <div className="mt-2 flex items-baseline gap-2.5">
          <h2 className="text-3xl font-semibold text-ink">{isPro ? "Pro" : "Gratuit"}</h2>
          {isPro && (
            <span className="rounded-full bg-accent-teal/10 px-2 py-0.5 text-xs font-medium text-accent-teal">
              Actif
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          {isPro
            ? `${employeeCount} salarié${employeeCount > 1 ? "s" : ""} · ${monthlyEstimate} € estimés ce mois-ci`
            : `Jusqu'à ${FREE_TIER_LIMIT} salariés inclus, sans engagement`}
        </p>
        {isPro && organization?.currentPeriodEnd && (
          <p className="mt-1 text-sm text-ink-faint">
            Prochain renouvellement le {formatDate(organization.currentPeriodEnd)}.
          </p>
        )}
        <div className="mt-5">{isPro ? <ManageSubscriptionButton /> : <UpgradeToProButton />}</div>
      </div>

      {/* Utilisation — seulement pertinent sur Gratuit, où la limite
          existe réellement. Une ligne + une barre, pas une carte à
          part entière. */}
      {!isPro && (
        <div className="mt-6 border-t border-surface-border pt-5">
          <div className="flex items-center justify-between text-sm text-ink-soft">
            <span>
              {employeeCount} / {FREE_TIER_LIMIT} salariés utilisés
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
            <div
              className="h-full rounded-full bg-brand-primary transition-all"
              style={{ width: `${usageRatio * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Ce qui est inclus */}
      <div className="mt-8 border-t border-surface-border pt-6">
        <h2 className="text-sm font-semibold text-ink">Ce qui est inclus</h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {INCLUDED_FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-sm text-ink-soft">
              <CircleCheck size={15} className="shrink-0 text-accent-teal" />
              {feature}
            </li>
          ))}
          <li className={`flex items-center gap-2.5 text-sm ${isPro ? "text-ink-soft" : "text-ink-faint"}`}>
            {isPro ? (
              <CircleCheck size={15} className="shrink-0 text-accent-teal" />
            ) : (
              <Lock size={13} className="shrink-0" />
            )}
            Salariés illimités{!isPro && " (Pro)"}
          </li>
        </ul>
      </div>

      {/* Factures — volontairement discret, pas une grosse carte
          "Historique de facturation". */}
      <div className="mt-8 border-t border-surface-border pt-6">
        <h2 className="text-sm font-semibold text-ink">Factures</h2>
        <p className="mt-2 text-sm text-ink-faint">Aucune facture pour le moment.</p>
      </div>
    </div>
  );
}
